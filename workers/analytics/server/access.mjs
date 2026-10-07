let cached;
function decode(value) {
    return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0));
}
export async function authorized(request, env, {access, fetchKeys = fetch, onDenied = () => {}} = {}) {
    const deny = (code, details) => { onDenied(code, details); return false; };
    let phase = 'identity';
    // Only the private Sites deployment may trust its platform-injected header.
    if (env.AUTH_MODE === 'sites') return !!env.ADMIN_EMAIL && request.headers.get('oai-authenticated-user-email')?.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
    if (env.AUTH_MODE !== 'access' || !env.ADMIN_EMAIL || !env.ACCESS_AUD || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER || '')) return deny('access_configuration_missing');
    try {
        // Worker-level Access supplies a trusted runtime context. It is not a
        // request header and cannot be supplied by a browser or service binding.
        if (access) {
            if (access.aud !== env.ACCESS_AUD) return deny('access_audience_mismatch', {
                configuredAudience: env.ACCESS_AUD.slice(0,128),
                receivedAudience: typeof access.aud === 'string' ? access.aud.slice(0,128) : null,
                receivedType: typeof access.aud
            });
            phase = 'runtime_identity';
            const identity = await access.getIdentity();
            if (typeof identity?.email !== 'string') return deny('access_email_missing');
            return identity.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase() || deny('access_owner_mismatch');
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
        if (claims.iss !== env.ACCESS_ISSUER) return deny('access_token_issuer');
        if (!Array.isArray(claims.aud) || !claims.aud.includes(env.ACCESS_AUD)) return deny('access_token_audience');
        if (!Number.isFinite(claims.exp) || claims.exp <= now || !Number.isFinite(claims.iat) || claims.iat > now + 60 || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + 60))) return deny('access_token_time');
        if (typeof claims.email !== 'string') return deny('access_token_email_missing');
        if (claims.email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) return deny('access_token_owner');
        phase = 'signing_keys';
        if (!cached || cached.issuer !== env.ACCESS_ISSUER || cached.until < Date.now()) {
            const response = await fetchKeys(env.ACCESS_ISSUER + '/cdn-cgi/access/certs', {signal:AbortSignal.timeout(5000)});
            if (!response.ok) return deny('access_keys_unavailable');
            const {keys} = await response.json();
            if (!Array.isArray(keys)) return deny('access_keys_invalid');
            cached = {issuer:env.ACCESS_ISSUER, until:Date.now()+300000, keys};
        }
        const jwk = cached.keys.find(k => k.kid === header.kid && k.kty === 'RSA');
        if (!jwk) return deny('access_key_unknown');
        phase = 'signature';
        const key = await crypto.subtle.importKey('jwk', jwk, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['verify']);
        return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), new TextEncoder().encode(parts[0]+'.'+parts[1])) || deny('access_signature_invalid');
    } catch { return deny('access_' + phase + '_error'); }
}
