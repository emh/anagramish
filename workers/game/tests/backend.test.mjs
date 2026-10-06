import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setup} from '../scripts/local.mjs';
let app,cookie,id;
before(async()=>{app=await setup();const r=await app.game.dispatchFetch('https://game.test/api/config');cookie=r.headers.get('set-cookie').split(';')[0];assert.ok((await r.json()).pairCount>100000);});
after(async()=>{await app?.dispose()});
async function request(path,body,c=cookie){return app.game.dispatchFetch('https://game.test'+path,{method:body?'POST':'GET',headers:{cookie:c,'Content-Type':'application/json',origin:'https://game.test'},body:body?JSON.stringify(body):undefined})}
test('daily selection matches the shipped date algorithm, including historic dates',async()=>{
 const pairs=(await readFile('data/pairs.txt','utf8')).split('\n');
 for(const date of ['2026-03-02','2026-09-01','2026-10-06']){const s=new Date(date).valueOf()/1000,r=s*(Math.PI-3)-Math.floor(s*(Math.PI-3)),i=Math.floor(pairs.length*r);const response=await request('/api/puzzle?date='+date);assert.equal(response.status,200);assert.deepEqual(await response.json(),{pair:pairs[i].split(',').slice(0,2),puzzleNumber:i});}
});
test('raw dictionary and pair lists are not downloadable',async()=>{for(const p of ['/dictionary.txt','/pairs.txt','/data/pairs.txt','/server/index.js'])assert.equal((await request(p)).status,404)});
test('game start is idempotent and isolated to its browser',async()=>{
 id=crypto.randomUUID();const data={id,mode:'practice',hard:false,savedPair:['caulk','horse'],attribution:{source:'newsletter',campaign:'launch',referrer:'https://example.org/private?secret=1'}};
 const r=await request('/api/start',data);assert.equal(r.status,200);assert.deepEqual((await r.json()).pair,['caulk','horse']);
 assert.equal((await request('/api/start',data)).status,200);
 assert.equal((await request('/api/start',data,'anagramish_player='+crypto.randomUUID())).status,403);
 assert.equal((await app.gameDb.prepare('SELECT COUNT(*) n FROM sessions').first()).n,1);
});
test('validates dictionary, letter transitions, and full completion on the server',async()=>{
 let r=await request('/api/guess',{id,words:['zzzzz']});assert.equal((await r.json()).valid,false);
 r=await request('/api/guess',{id,words:['horse']});assert.equal((await r.json()).valid,false);
 const words=['lacks','hacks','shake','share'];
 r=await request('/api/guess',{id,words});assert.deepEqual(await r.json(),{valid:true});
 r=await request('/api/complete',{id,words:['lacks'],seconds:30,mistakes:0});assert.equal((await r.json()).valid,false);
 for(let i=0;i<2;i++){r=await request('/api/complete',{id,words,seconds:30,mistakes:1});assert.equal((await r.json()).saved,true)}
 assert.equal((await app.gameDb.prepare('SELECT COUNT(*) n FROM sessions WHERE completed_at IS NOT NULL').first()).n,1);
});
test('hard mode enforces progress and four intermediate words',async()=>{
 const hardId=crypto.randomUUID();await request('/api/start',{id:hardId,mode:'practice',hard:true,savedPair:['caulk','horse']});
 const r=await request('/api/guess',{id:hardId,words:['lacks','hacks']});assert.equal((await r.json()).valid,true);
 const invalid=await request('/api/guess',{id:hardId,words:['lacks','slack']});assert.equal((await invalid.json()).valid,false);
});
test('cross-origin posts are rejected',async()=>{const r=await app.game.dispatchFetch('https://game.test/api/visit',{method:'POST',headers:{origin:'https://evil.test','Content-Type':'application/json'},body:JSON.stringify({id:crypto.randomUUID()})});assert.equal(r.status,403)});
test('analytics intake and reports require separate server credentials and owner identity',async()=>{
 assert.equal((await app.analytics.dispatchFetch('https://analytics.test/ingest',{method:'POST',body:'{}'})).status,401);
 assert.equal((await app.analytics.dispatchFetch('https://analytics.test/api/report')).status,403);
 assert.equal((await app.analytics.dispatchFetch('https://analytics.test/',{headers:{'oai-authenticated-user-email':'other@example.test'}})).status,403);
});
test('analytics deduplicates retries, keeps preview separate, strips referrer paths',async()=>{
 const payload={id:'start:fixture',kind:'game_play',player:crypto.randomUUID(),occurredAt:Date.now(),day:new Date().toISOString().slice(0,10),environment:'preview',mode:'daily',resumed:0};
 for(let i=0;i<2;i++){const r=await app.analytics.dispatchFetch('https://analytics.test/ingest',{method:'POST',headers:{Authorization:'Bearer local-intake-token','Content-Type':'application/json'},body:JSON.stringify({events:[payload]})});assert.equal(r.status,200)}
 const headers={'oai-authenticated-user-email':'owner@example.test'};
 const report=await (await app.analytics.dispatchFetch('https://analytics.test/api/report?environment=preview',{headers})).json();assert.ok(report.summary.players>=1);
 const production=await (await app.analytics.dispatchFetch('https://analytics.test/api/report?environment=production',{headers})).json();assert.equal(production.summary.players,0);
 assert.equal((await app.analyticsDb.prepare('SELECT COUNT(*) n FROM events WHERE id=?').bind(payload.id).first()).n,1);
 for(let tries=0;tries<20;tries++){if(await app.analyticsDb.prepare('SELECT id FROM events WHERE id=?').bind('start:'+id).first())break;await new Promise(r=>setTimeout(r,100));}
 const e=await app.analyticsDb.prepare('SELECT referrer FROM events WHERE id=?').bind('start:'+id).first();assert.equal(e.referrer,'example.org');
});
