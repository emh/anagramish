import assert from 'node:assert/strict';

const api = 'https://anagramish-api.emh.workers.dev';
const origin = 'https://anagramish.com';
async function request(path, options = {}) {
    return fetch(api+path,{...options,headers:{Origin:origin,...options.headers},signal:AbortSignal.timeout(15000)});
}
async function checkDeployment() {
const preflight = await request('/api/start',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
assert.equal(preflight.status,204);
assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
const config = await request('/api/config');
assert.equal(config.status,200);
const {playerToken,pairCount} = await config.json();
assert.ok(playerToken && pairCount > 100000);
const puzzle = await request('/api/puzzle?date=2026-03-02',{headers:{Authorization:`Bearer ${playerToken}`}});
assert.equal(puzzle.status,200);
assert.equal((await puzzle.json()).pair.length,2);
const untrusted = await request('/api/config',{headers:{Origin:'https://untrusted.example'}});
assert.equal(untrusted.status,403);
for (const path of ['/dictionary.txt','/pairs.txt']) assert.equal((await request(path)).status,404);
const report = await fetch('https://anagramish-analytics.emh.workers.dev/api/report?environment=production',{
    redirect:'manual',headers:{'oai-authenticated-user-email':process.env.ANALYTICS_ADMIN_EMAIL || 'forged@example.test'},signal:AbortSignal.timeout(15000)
});
assert.ok([302,303,401,403].includes(report.status),`Unauthenticated analytics returned ${report.status}`);
}

// New workers.dev routes and secret versions can take time to reach the edge.
for (let attempt = 1; ; attempt++) {
    try {
        await checkDeployment();
        break;
    } catch (error) {
        if (attempt >= 24) throw error;
        console.log(`Deployment not ready (attempt ${attempt}/24): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}
console.log('Production API and private-dashboard smoke checks passed. No gameplay events were recorded.');
