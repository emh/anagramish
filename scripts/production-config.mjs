import {mkdir, writeFile, appendFile} from 'node:fs/promises';

// Run in GitHub Actions. Only non-secret configuration is written to disk.
const required = name => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing GitHub Actions setting: ${name}`);
    return value;
};
const account = required('CLOUDFLARE_ACCOUNT_ID');
const apiToken = required('CLOUDFLARE_API_TOKEN');
for (const name of ['PLAYER_SIGNING_KEY','ANALYTICS_INGEST_TOKEN']) {
    if (required(name).length < 32) throw new Error(`${name} must have at least 32 characters`);
}
async function cloudflare(path, options = {}) {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
        ...options, headers:{Authorization:`Bearer ${apiToken}`, 'Content-Type':'application/json'}, signal:AbortSignal.timeout(30000)
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(`Cloudflare ${path}: ${response.status}; ${JSON.stringify(data.errors)}`);
    return data.result;
}
const {subdomain} = await cloudflare('/workers/subdomain');
if (subdomain !== 'emh') throw new Error('Expected the Cloudflare account with emh.workers.dev. No deployment made.');
const databases = await cloudflare('/d1/database?per_page=100');
async function database(name) {
    let matches = databases.filter(db => db.name === name);
    if (matches.length > 1) throw new Error(`Ambiguous D1 database: ${name}`);
    return matches[0] || await cloudflare('/d1/database', {method:'POST',body:JSON.stringify({name})});
}
const game = await database('anagramish-game-production');
const analytics = await database('anagramish-analytics-production');
const base = {main:'dist/server/index.js', compatibility_date:'2026-08-01', workers_dev:true, preview_urls:false};
const binding = db => [{binding:'DB',database_name:db.name,database_id:db.uuid,migrations_dir:'drizzle'}];
await writeFile('workers/game/wrangler.production.json', JSON.stringify({
    ...base, name:'anagramish-api', d1_databases:binding(game),
    vars:{TRAFFIC_ENV:'production',FRONTEND_ORIGIN:'https://anagramish.com'},
    services:[{binding:'ANALYTICS',service:'anagramish-analytics'}],
    ratelimits:[{name:'RATE_LIMITER',namespace_id:'1001',simple:{limit:120,period:60}}],
    triggers:{crons:['*/5 * * * *']}
},null,2));
await writeFile('workers/analytics/wrangler.production.json', JSON.stringify({
    ...base, name:'anagramish-analytics', d1_databases:binding(analytics),
    vars:{AUTH_MODE:'access', ADMIN_EMAIL:(process.env.ANALYTICS_ADMIN_EMAIL || '').trim(),ACCESS_ISSUER:(process.env.CF_ACCESS_ISSUER || '').trim(),ACCESS_AUD:(process.env.CF_ACCESS_AUD || '').trim()}
},null,2));
// Publish only the frontend allowlist produced by the build, never the repo root.
await mkdir('workers/game/dist/client',{recursive:true});
await writeFile('workers/game/dist/client/api-config.mjs', "export const API_ORIGIN = 'https://anagramish-api.emh.workers.dev';\n");
await writeFile('workers/game/dist/client/CNAME', 'anagramish.com\n');
await writeFile('workers/game/dist/client/.nojekyll', '');
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
    'Production endpoints: https://anagramish-api.emh.workers.dev and https://anagramish-analytics.emh.workers.dev.\n' +
    (!process.env.CF_ACCESS_AUD ? '\nAnalytics reports remain locked until Cloudflare Access settings are supplied.\n' : ''));
