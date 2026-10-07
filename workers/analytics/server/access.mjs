let cached;
function decode(value) {
    return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0));
}
export async function authorized(request, env, {access, fetchKeys = fetch} = {}) {
    // Only the private Sites deployment may trust its platform-injected header.
    if (env.AUTH_MODE === 'sites') return !!env.ADMIN_EMAIL && request.headers.get('oai-authenticated-user-email')?.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
    if (env.AUTH_MODE !== 'access' || !env.ADMIN_EMAIL || !env.ACCESS_AUD || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER || '')) return false;
    try {
        // Worker-level Access supplies a trusted runtime context. It is not a
        // request header and cannot be supplied by a browser or service binding.
        if (access) {
            if (access.aud !== env.ACCESS_AUD) return false;
            const identity = await access.getIdentity();
            return typeof identity?.email === 'string' && identity.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
        }
        // Hostname-based Access can also provide a signed assertion header.
        const token = request.headers.get('cf-access-jwt-assertion');
        if (!token || token.length > 16000) return false;
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        const [header, claims] = parts.slice(0,2).map(p => JSON.parse(new TextDecoder().decode(decode(p))));
        const now = Date.now() / 1000;
        if (header.alg !== 'RS256' || typeof header.kid !== 'string' || claims.iss !== env.ACCESS_ISSUER || !Array.isArray(claims.aud) || !claims.aud.includes(env.ACCESS_AUD) || !Number.isFinite(claims.exp) || claims.exp <= now || !Number.isFinite(claims.iat) || claims.iat > now + 60 || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + 60)) || typeof claims.email !== 'string' || claims.email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) return false;
        if (!cached || cached.issuer !== env.ACCESS_ISSUER || cached.until < Date.now()) {
            const response = await fetchKeys(env.ACCESS_ISSUER + '/cdn-cgi/access/certs', {signal:AbortSignal.timeout(5000)});
            if (!response.ok) return false;
            const {keys} = await response.json();
            if (!Array.isArray(keys)) return false;
            cached = {issuer:env.ACCESS_ISSUER, until:Date.now()+300000, keys};
        }
        const jwk = cached.keys.find(k => k.kid === header.kid && k.kty === 'RSA');
        if (!jwk) return false;
        const key = await crypto.subtle.importKey('jwk', jwk, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['verify']);
        return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), new TextEncoder().encode(parts[0]+'.'+parts[1]));
    } catch { return false; }
}
