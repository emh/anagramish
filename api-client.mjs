import { API_ORIGIN } from './api-config.mjs';

const tokenKey = 'anagramish-player-token';
let token;
try { token = localStorage.getItem(tokenKey); } catch {}
export async function api(path, data) {
    const headers = new Headers();
    if (API_ORIGIN && token) headers.set('Authorization', `Bearer ${token}`);
    if (data !== undefined) headers.set('Content-Type', 'application/json');
    const response = await fetch(API_ORIGIN + path, {
        method: data === undefined ? 'GET' : 'POST', headers,
        credentials: API_ORIGIN ? 'omit' : 'same-origin',
        body: data === undefined ? undefined : JSON.stringify(data),
        signal: AbortSignal.timeout(15000)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(result.error || 'Connection interrupted. Please try again.');
        error.status = response.status;
        throw error;
    }
    if (API_ORIGIN && result.playerToken) {
        token = result.playerToken;
        try { localStorage.setItem(tokenKey, token); } catch {}
    }
    return result;
}
