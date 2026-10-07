const encoder = new TextEncoder();
const pattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
async function key(secret) {
    if (!secret || secret.length < 32) throw new Error('Player signing key is missing.');
    return crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign','verify']);
}
export async function signPlayer(player, secret, now = Date.now()) {
    const payload = `${player}.${Math.floor(now / 1000) + 31536000}`;
    const signature = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(payload));
    return payload + '.' + btoa(String.fromCharCode(...new Uint8Array(signature))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}
export async function verifyPlayer(token, secret, now = Date.now()) {
    if (!token || token.length > 200) return null;
    const [player, expires, signature, extra] = token.split('.');
    if (extra || !pattern.test(player) || !/^\d{10}$/.test(expires) || Number(expires) <= now / 1000 || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return null;
    const bytes = Uint8Array.from(atob(signature.replaceAll('-','+').replaceAll('_','/') + '='), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', await key(secret), bytes, encoder.encode(`${player}.${expires}`)) ? player : null;
}
