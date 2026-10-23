import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../scripts/local.mjs';

let app;
before(async()=>{app=await setup();});
after(async()=>{await app?.dispose();});
beforeEach(async()=>{await app.analyticsDb.batch([app.analyticsDb.prepare('DELETE FROM events'),app.analyticsDb.prepare('DELETE FROM analytics_daily_summaries'),app.analyticsDb.prepare('DELETE FROM analytics_report_cache'),app.analyticsDb.prepare('UPDATE analytics_summary_state SET cursor=0,latest_rowid=0,refreshed_at=0,next_refresh=0,lease_until=0,lease_token=NULL')]);});
const ago=days=>Date.now()-days*86400000;
function tutorial(player,id,action,at,lesson,environment='production') {
 return {id:`tutorial:${player}:${id}:${action}${lesson?':'+lesson:''}`,kind:'tutorial_'+action,player,occurredAt:at,day:new Date(at).toISOString().slice(0,10),environment,mode:'tutorial'};
}
function game(player,kind,at,{id=crypto.randomUUID(),environment='production',mode='daily',hard=0,resumed=0}={}) {
 const day=new Date(at).toISOString().slice(0,10),prefix={game_start:'start',game_play:'play',game_complete:'complete'}[kind];
 return {id:`${prefix}:${id}${kind==='game_play'?':'+day:''}`,kind,player,occurredAt:at,day,environment,mode,hard,resumed};
}
async function ingest(events) {
 const r=await app.analytics.dispatchFetch('https://analytics.test/ingest',{method:'POST',headers:{Authorization:'Bearer local-intake-token','Content-Type':'application/json'},body:JSON.stringify({events})});
 assert.equal(r.status,200);
}
async function report() {
 const r=await app.analytics.dispatchFetch('https://analytics.test/api/report?environment=production&days=7',{headers:{'oai-authenticated-user-email':'owner@example.test'}});
 assert.equal(r.status,200);return r.json();
}
test('tutorial funnel uses the first attempt, matching completion, full 24 hours, and subsequent game activity',async()=>{
 const players=Array.from({length:6},()=>crypto.randomUUID());
 const [converted,replay,pending,late,old,previous]=players;
 const id=crypto.randomUUID(),at=ago(3),session=crypto.randomUUID();
 const events=[
  tutorial(converted,id,'start',at),tutorial(converted,id,'complete',at+1000),
  game(converted,'game_play',at+2000,{id:session}),game(converted,'game_complete',at+3000,{id:session}),
  // A replay cannot complete this learner's first abandoned attempt.
  tutorial(replay,id,'start',at),tutorial(replay,'another','complete',at+1000),
  tutorial(pending,id,'start',ago(.25)),tutorial(pending,id,'complete',ago(.2)),
  tutorial(late,id,'start',at),tutorial(late,id,'complete',at+86400001),
  tutorial(old,id,'start',ago(10)),tutorial(old,'another','start',at),
  game(previous,'game_play',at-1000),tutorial(previous,id,'start',at),tutorial(previous,id,'complete',at+1000),
  // A game completed after the tutorial but played only before it is not a handoff.
  game(previous,'game_complete',at+2000),
  tutorial(pending,id,'start',ago(4),undefined,'preview')
 ];
 await ingest(events);await ingest(events);
 assert.deepEqual((await report()).tutorial_funnel,{starters:5,eligible:4,eligible_previous_players:1,completed:2,played_after_completion:1,finished_after_completion:1});
});
test('lesson diagnostics match attempts and do not mix historical or preview completions',async()=>{
 const p=crypto.randomUUID(),a=crypto.randomUUID(),b=crypto.randomUUID(),at=ago(2);
 const events=[tutorial(p,a,'start',at),tutorial(p,a,'complete',at+5000),
  tutorial(p,a,'lesson_start',at,1),tutorial(p,a,'lesson_complete',at+1000,1),
  tutorial(p,a,'lesson_start',at+2000,2),tutorial(p,a,'exit',at+3000,2),
  tutorial(p,b,'lesson_start',at,1),tutorial(p,b,'lesson_complete',at+1000,1,'preview'),
  tutorial(p,'older','complete',at)];
 await ingest(events);await ingest(events);
 assert.deepEqual((await report()).tutorial_lessons,[{lesson:1,starts:2,completions:1,explicit_exits:0},{lesson:2,starts:1,completions:0,explicit_exits:1}]);
});
test('start diagnostics separate practice and modes and count concentration without exposing player IDs',async()=>{
 const p=crypto.randomUUID(),q=crypto.randomUUID(),at=ago(2),id=crypto.randomUUID();
 const events=[game(p,'game_start',at,{id}),game(p,'game_play',at,{id}),
  game(p,'game_play',at+86400000,{id}),game(p,'game_start',at,{mode:'practice'}),
  game(p,'game_start',at,{mode:'practice'}),game(q,'game_start',at,{mode:'practice'}),
  game(p,'game_start',at,{hard:1,resumed:1}),game(p,'game_start',at,{environment:'preview'})];
 await ingest(events);await ingest(events);
 const rows=(await report()).start_activity;
 assert.equal(rows.length,3);
 assert.deepEqual(rows.map(({day,...r})=>r),[
  {mode:'daily',hard:0,starts:1,players:1,max_starts_per_player:1,resumed_starts:0},
  {mode:'daily',hard:1,starts:1,players:1,max_starts_per_player:1,resumed_starts:1},
  {mode:'practice',hard:0,starts:3,players:2,max_starts_per_player:2,resumed_starts:0}
 ]);
});
test('tutorial API validates lesson numbers and keeps event IDs stable across retries',async()=>{
 const response=await app.game.dispatchFetch('https://game.test/api/config');
 const cookie=response.headers.get('set-cookie').split(';')[0],id=crypto.randomUUID();
 async function send(action,lesson){return app.game.dispatchFetch('https://game.test/api/tutorial',{method:'POST',headers:{cookie,'Content-Type':'application/json',origin:'https://game.test'},body:JSON.stringify({id,action,lesson})});}
 for(const value of [undefined,0,4,'1',1.5])assert.equal((await send('lesson_start',value)).status,400);
 assert.equal((await send('anything',1)).status,400);
 for(const action of ['start','lesson_start','lesson_complete','exit','complete']) {
  for(let i=0;i<2;i++)assert.equal((await send(action,1)).status,200);
 }
 const headers={'oai-authenticated-user-email':'owner@example.test'};
 let d;
 for(let i=0;i<30;i++){
  d=await (await app.analytics.dispatchFetch('https://analytics.test/api/report?environment=preview',{headers})).json();
  if(d.tutorial_lessons[0]?.explicit_exits===1 && d.summary.tutorial_completions===1)break;
  await new Promise(r=>setTimeout(r,100));
 }
 assert.equal(d.summary.tutorial_starts,1);assert.equal(d.summary.tutorial_completions,1);
 assert.equal(d.summary.players,0);
 assert.deepEqual(d.tutorial_lessons,[{lesson:1,starts:1,completions:1,explicit_exits:1}]);
});
