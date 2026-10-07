import {spawnSync} from 'node:child_process';

const worker = process.argv[2];
if (!['game','analytics'].includes(worker)) throw new Error('Expected game or analytics');
function wrangler(args, input) {
    const result = spawnSync('npx', ['--no-install','wrangler',...args,'--config','wrangler.production.json'], {
        cwd:`workers/${worker}`,env:{...process.env,WRANGLER_SEND_METRICS:'false'},
        input, encoding:'utf8', stdio:input ? ['pipe','inherit','inherit'] : 'inherit'
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status || 1);
}
wrangler(['d1','migrations','apply','DB','--remote']);
wrangler(['deploy']);
const secrets = worker === 'game'
    ? {PLAYER_SIGNING_KEY:process.env.PLAYER_SIGNING_KEY,ANALYTICS_INGEST_TOKEN:process.env.ANALYTICS_INGEST_TOKEN}
    : {INGEST_TOKEN:process.env.ANALYTICS_INGEST_TOKEN};
if (Object.values(secrets).some(v => !v || v.length < 32)) throw new Error('Required Worker secrets are missing');
wrangler(['secret','bulk'], JSON.stringify(secrets));
