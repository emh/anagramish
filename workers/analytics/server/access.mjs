let cached;
function decode(value) {
    return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0));
}
export async function authorized(request, env, {access, fetchKeys = fetch, onDenied = () => {}} = {}) {
    // Dashboard values copied into GitHub variables may include line endings.
    const audience = (env.ACCESS_AUD || '').trim();
    const issuer = (env.ACCESS_ISSUER || '').trim();
    const adminEmail = (env.ADMIN_EMAIL || '').trim().toLowerCase();
    const deny = code => { onDenied(code); return false; };
    let phase = 'identity';
    // Only the private Sites deployment may trust its platform-injected header.
    if (env.AUTH_MODE === 'sites') return !!adminEmail && request.headers.get('oai-authenticated-user-email')?.toLowerCase() === adminEmail;
    if (env.AUTH_MODE !== 'access' || !adminEmail || !audience || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)) return deny('access_configuration_missing');
    try {
        // Worker-level Access supplies a trusted runtime context. It is not a
        // request header and cannot be supplied by a browser or service binding.
        if (access) {
            if (access.aud !== audience) return deny('access_audience_mismatch');
            phase = 'runtime_identity';
            const identity = await access.getIdentity();
            if (typeof identity?.email !== 'string') return deny('access_email_missing');
            return identity.email.toLowerCase() === adminEmail || deny('access_owner_mismatch');
        }
        // Hostname-based Access can also provide a signed assertion header.
        const token = request.headers.get('cf-access-jwt-assertion');
        if (!token) return deny('access_identity_missing');
        if (token.length > 16000) return deny('access_token_invalid');
        phase = 'token_decode';
        const parts = token.split('.');
        if (parts.length !== 3) return deny('access_token_invalid');
        const [header, claims] = parts.slice(0,2).map(p => JSON.parse(new TextDecoder().decode(decode(p))));
        const now = Date.now() / 1000;
        if (header.alg !== 'RS256' || typeof header.kid !== 'string') return deny('access_token_algorithm');
        if (claims.iss !== issuer) return deny('access_token_issuer');
        if (!Array.isArray(claims.aud) || !claims.aud.includes(audience)) return deny('access_token_audience');
        if (!Number.isFinite(claims.exp) || claims.exp <= now || !Number.isFinite(claims.iat) || claims.iat > now + 60 || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + 60))) return deny('access_token_time');
        if (typeof claims.email !== 'string') return deny('access_token_email_missing');
        if (claims.email.toLowerCase() !== adminEmail) return deny('access_token_owner');
        phase = 'signing_keys';
        if (!cached || cached.issuer !== issuer || cached.until < Date.now()) {
            const response = await fetchKeys(issuer + '/cdn-cgi/access/certs', {signal:AbortSignal.timeout(5000)});
            if (!response.ok) return deny('access_keys_unavailable');
            const {keys} = await response.json();
            if (!Array.isArray(keys)) return deny('access_keys_invalid');
            cached = {issuer, until:Date.now()+300000, keys};
        }
        const jwk = cached.keys.find(k => k.kid === header.kid && k.kty === 'RSA');
        if (!jwk) return deny('access_key_unknown');
        phase = 'signature';
        const key = await crypto.subtle.importKey('jwk', jwk, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['verify']);
        return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), new TextEncoder().encode(parts[0]+'.'+parts[1])) || deny('access_signature_invalid');
    } catch { return deny('access_' + phase + '_error'); }
}
