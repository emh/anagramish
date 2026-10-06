const STORAGE_KEY = 'anagramish-acquisition-v1';
const SESSION_MS = 30 * 60 * 1000;

const searchEngine = (hostname) => {
    const host = hostname.toLowerCase();
    if (/(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host)) return 'google';
    for (const [domain, name] of [['bing.com','bing'],['duckduckgo.com','duckduckgo'],['search.yahoo.com','yahoo'],['ecosia.org','ecosia'],['search.brave.com','brave']]) {
        if (host === domain || host.endsWith('.' + domain)) return name;
    }
    return null;
};

// Preserve the entry source when a reader moves from the rules page to the game.
export const getAttribution = () => {
    const url = new URL(location.href);
    const hasCampaign = ['utm_source','utm_medium','utm_campaign'].some(key => url.searchParams.has(key));
    let referrer = null;
    try {
        const candidate = new URL(document.referrer);
        if (['http:','https:'].includes(candidate.protocol) && candidate.origin !== url.origin) referrer = candidate;
    } catch {}
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
        if (!hasCampaign && !referrer && saved && Number.isFinite(saved.capturedAt) && Date.now() - saved.capturedAt < SESSION_MS) return saved.attribution;
    } catch {}
    const engine = !hasCampaign && referrer ? searchEngine(referrer.hostname) : null;
    const value = {
        source: url.searchParams.get('utm_source')?.slice(0,100) || engine,
        medium: url.searchParams.get('utm_medium')?.slice(0,100) || (engine ? 'organic' : null),
        campaign: url.searchParams.get('utm_campaign')?.slice(0,100) || null,
        referrer: referrer?.origin ?? null,
        landing: url.pathname.slice(0,200)
    };
    try {sessionStorage.setItem(STORAGE_KEY, JSON.stringify({capturedAt:Date.now(), attribution:value}));} catch {}
    return value;
};
