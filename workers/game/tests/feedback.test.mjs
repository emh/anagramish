import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../scripts/local.mjs';
import {saveFeedback} from '../server/feedback.mjs';
import {feedbackPage,validFeedback} from '../../analytics/server/feedback.mjs';
let app;
before(async()=>{app=await setup({production:true});});
after(async()=>{await app?.dispose();});
const draft=(extra={})=>({id:crypto.randomUUID(),entry:'header',screen:'welcome',rating:null,comment:'A useful comment',appVersion:'test-release',sessionId:null,...extra});
const headers={'oai-authenticated-user-email':'owner@example.test'};
async function player(){const r=await app.game.dispatchFetch('https://game.test/api/config');return (await r.json()).playerToken;}
async function post(path,input,token){return app.game.dispatchFetch('https://game.test'+path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Origin:'https://anagramish.com'},body:JSON.stringify(input)});}
async function delivered(id){for(let n=0;n<30;n++){const row=await app.analyticsDb.prepare('SELECT * FROM feedback WHERE id=?').bind(id).first();if(row)return row;await new Promise(r=>setTimeout(r,50));}throw Error('feedback not delivered');}

test('production feedback is owner-private, authenticated, durable, idempotent, and separate from activity',async()=>{
 const token=await player(),input=draft({comment:'<img src=x onerror=alert(1)> & useful feedback'});
 assert.equal((await post('/api/feedback',input,null)).status,401);
 const response=await post('/api/feedback',input,token);assert.equal(response.status,200);
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://anagramish.com');
 const row=await delivered(input.id);
 assert.equal(row.player_type,'not_yet_played');assert.equal(row.first_play_day,null);assert.equal(row.completed,null);assert.equal(row.comment,input.comment);
 assert.equal((await post('/api/feedback',{...input,comment:'replacement'},token)).status,200);
 assert.equal((await delivered(input.id)).comment,input.comment);
 assert.equal((await app.analyticsDb.prepare('SELECT COUNT(*) n FROM events WHERE player=?').bind(row.player).first()).n,0);
 assert.equal((await app.analytics.dispatchFetch('https://analytics.test/api/feedback?environment=production')).status,403);
 assert.equal((await app.analytics.dispatchFetch('https://analytics.test/ingest-feedback',{method:'POST',body:'{}'})).status,401);
 const page=await (await app.analytics.dispatchFetch('https://analytics.test/api/feedback?environment=production',{headers})).json();
 assert.equal(page.items.find(f=>f.id===input.id).comment,input.comment);assert.equal('player' in page.items[0],false);
 assert.equal((await post('/api/feedback',input,await player())).status,409);
});

test('first-day versus returning status is frozen at submission; context comes from owned sessions',async()=>{
 const token=await player(),who=token.split('.')[0],id=crypto.randomUUID();
 await post('/api/start',{id,mode:'practice',hard:false,savedPair:['caulk','horse']},token);
 let input=draft({sessionId:id,rating:'hard',screen:'playing'});assert.equal((await post('/api/feedback',input,token)).status,200);
 let row=await delivered(input.id);assert.equal(row.player_type,'first_day');assert.equal(row.completed,0);assert.equal(row.mode,'practice');assert.equal(row.puzzle_date,null);
 await post('/api/complete',{id,words:['lacks','hacks','shake','share'],seconds:30,mistakes:0},token);
 const previous=Date.now()-86400000;await app.gameDb.prepare('UPDATE sessions SET started_at=? WHERE id=?').bind(previous,id).run();
 input=draft({sessionId:id,entry:'completion',screen:'finished',rating:'right'});assert.equal((await post('/api/feedback',input,token)).status,200);
 row=await delivered(input.id);assert.equal(row.player_type,'returning');assert.equal(row.completed,1);assert.equal(row.first_play_day,new Date(previous).toISOString().slice(0,10));
 assert.equal((await app.analyticsDb.prepare('SELECT player_type FROM feedback WHERE player=? ORDER BY created_at LIMIT 1').bind(who).first()).player_type,'first_day');
 assert.equal((await post('/api/feedback',draft({sessionId:id}),await player())).status,404);
});

test('validation rejects empty, oversized, malformed or spoofed feedback and cross-origin requests',async()=>{
 const token=await player();
 for(const input of [draft({comment:''}),draft({comment:'x'.repeat(1001)}),draft({rating:'bad'}),draft({rating:'hard'}),draft({tutorial:{variant:'bogus'}}),draft({appVersion:'<script>'}),null])
  assert.equal((await post('/api/feedback',input,token)).status,400);
 assert.equal((await app.game.dispatchFetch('https://game.test/api/feedback',{method:'POST',headers:{Authorization:'Bearer '+token,Origin:'https://evil.test','Content-Type':'application/json'},body:JSON.stringify(draft())})).status,403);
 const intake=await app.analytics.dispatchFetch('https://analytics.test/ingest-feedback',{method:'POST',headers:{Authorization:'Bearer local-intake-token'},body:JSON.stringify({feedback:[{}]})});assert.equal(intake.status,400);
 assert.equal(validFeedback({}),false);
});

test('three per rolling 24h limit is atomic under concurrency and duplicates remain retryable',async()=>{
 const who=crypto.randomUUID(),env={DB:app.gameDb,TRAFFIC_ENV:'production'},now=Date.now();
 const inputs=Array.from({length:7},()=>draft());
 const results=await Promise.all(inputs.map(i=>saveFeedback(env,who,i,now)));
 assert.equal(results.filter(r=>r.status===200).length,3);assert.equal(results.filter(r=>r.status===429).length,4);
 const accepted=inputs[results.findIndex(r=>r.status===200)];assert.equal((await saveFeedback(env,who,accepted,now)).status,200);
 assert.equal((await saveFeedback(env,who,draft(),now+86400001)).status,200);
 const dupe=draft(),other=crypto.randomUUID();const duplicateResults=await Promise.all([saveFeedback(env,other,dupe,now),saveFeedback(env,other,dupe,now)]);assert.deepEqual(duplicateResults.map(r=>r.status),[200,200]);
 const pending=await app.gameDb.prepare('SELECT COUNT(*) n FROM outbox WHERE id=?').bind('feedback:'+dupe.id).first();assert.equal(pending.n,1,'durable delivery record survives without a flush');
});

test('feedback pagination is bounded, indexed, isolated by environment, and stable for tied timestamps',async()=>{
 const now=Date.now(),base={player:crypto.randomUUID(),created_at:now-100,environment:'preview',entry:'header',screen:'welcome',rating:null,comment:'page fixture',app_version:'test',session_id:null,mode:null,puzzle_date:null,hard:null,completed:null,player_type:'not_yet_played',first_play_day:null,tutorial_experiment:null,tutorial_variant:null};
 const rows=Array.from({length:35},()=>({...base,id:crypto.randomUUID()}));
 const r=await app.analytics.dispatchFetch('https://analytics.test/ingest-feedback',{method:'POST',headers:{Authorization:'Bearer local-intake-token'},body:JSON.stringify({feedback:rows})});assert.equal(r.status,200);
 let reads=0;
 const DB={prepare(sql){const stmt=app.analyticsDb.prepare(sql);return {bind(...args){const q=stmt.bind(...args);return {async all(){const result=await q.all();reads+=result.meta.rows_read;return result;}};}};}};
 const url=new URL('https://analytics.test/api/feedback?environment=preview&days=7');
 const first=await feedbackPage(url,{DB},now);assert.equal(first.items.length,30);assert.ok(first.next_cursor);assert.ok(reads<=70,'bounded index read budget: '+reads);
 url.searchParams.set('cursor',first.next_cursor);reads=0;const second=await feedbackPage(url,{DB},now);assert.equal(second.items.length,5);assert.equal(second.next_cursor,null);assert.ok(reads<=15,'second page seeks, rather than scanning prior rows: '+reads);
 assert.equal(new Set([...first.items,...second.items].map(r=>r.id)).size,35);
 url.searchParams.set('cursor','broken');assert.equal((await feedbackPage(url,{DB},now)).status,400);
});
