import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../scripts/local.mjs';

let app;
before(async()=>{app=await setup();});
after(async()=>{await app?.dispose();});
beforeEach(async()=>{await app.analyticsDb.prepare('DELETE FROM events').run();});
const ago=days=>Date.now()-days*86400000;
const date=at=>new Date(at).toISOString().slice(0,10);
function event(kind,player,days,{id=crypto.randomUUID(),at=ago(days),...extra}={}) {
 const day=date(at),prefix={game_start:'start',game_play:'play',game_complete:'complete'}[kind];
 return {id:`${prefix}:${id}${kind==='game_play'?':'+day:''}`,kind,player,occurredAt:at,day,environment:'production',mode:'daily',...extra};
}
async function ingest(events) {
 const response=await app.analytics.dispatchFetch('https://analytics.test/ingest',{method:'POST',headers:{Authorization:'Bearer local-intake-token','Content-Type':'application/json'},body:JSON.stringify({events})});
 assert.equal(response.status,200);
}
async function report(days=7) {
 const response=await app.analytics.dispatchFetch('https://analytics.test/api/report?environment=production&days='+days,{headers:{'oai-authenticated-user-email':'owner@example.test'}});
 assert.equal(response.status,200);return response.json();
}
test('retention waits for the entire return day and excludes older cohorts from the selected window',async()=>{
 const [returned,recent,today,late,old]=Array.from({length:5},()=>crypto.randomUUID());
 await ingest([
  event('game_play',returned,2),event('game_play',returned,1),
  event('game_play',recent,1),event('game_play',recent,0),
  event('game_play',today,0),
  event('game_play',late,3),event('game_play',late,1),
  event('game_play',old,10),event('game_play',old,9),event('game_play',old,3),
  event('game_play',recent,4,{environment:'preview'})
 ]);
 const d=await report();
 assert.deepEqual(d.retention,{eligible_d1:2,returned_d1:1,eligible_d7:0,returned_d7:0});
 const sum=key=>d.acquisition.reduce((n,r)=>n+r[key],0);
 assert.equal(sum('new_players'),4);
 assert.equal(sum('eligible_d1'),2);assert.equal(sum('returned_d1'),1);
});
test('day-seven retention excludes a return day that is still in progress',async()=>{
 const mature=crypto.randomUUID(),pending=crypto.randomUUID(),missed=crypto.randomUUID();
 await ingest([
  event('game_play',mature,8),event('game_play',mature,1),
  event('game_play',pending,7),event('game_play',pending,0),
  event('game_play',missed,9),event('game_play',missed,1)
 ]);
 const d=await report(28);
 assert.equal(d.retention.eligible_d7,2);assert.equal(d.retention.returned_d7,1);
});
test('acquisition fixes each new player to their first source and counts distinct mature outcomes',async()=>{
 const [a,b,c,today,old]=Array.from({length:5},()=>crypto.randomUUID());
 const session=crypto.randomUUID();
 const events=[
  event('game_play',a,3,{id:session,source:'playlin',campaign:'trial'}),
  event('game_start',a,3,{id:session,source:'playlin',campaign:'trial'}),
  event('game_complete',a,3,{id:session,seconds:60}),
  event('game_play',a,2,{id:session}),
  event('game_play',a,2,{source:'google',medium:'organic'}),
  event('game_play',b,2,{source:'playlin',campaign:'trial'}),
  event('game_play',b,1,{source:'google',medium:'organic'}),
  event('game_complete',b,1,{seconds:60}),
  event('game_play',c,1,{source:'google',medium:'organic'}),
  event('game_complete',c,1,{seconds:60}),
  event('game_play',c,0),
  event('game_play',today,0,{source:'',medium:'',campaign:''}),
  event('game_complete',today,0,{seconds:60}),
  event('game_play',old,10,{source:'google',medium:'organic'}),
  event('game_play',old,3,{source:'playlin',campaign:'trial'}),
  event('game_play',a,5,{environment:'preview',source:'preview-only'})
 ];
 await ingest(events);await ingest(events);
 const d=await report(),bySource=s=>d.acquisition.find(r=>r.source===s);
 assert.deepEqual(bySource('playlin'),{source:'playlin',medium:'—',campaign:'trial',new_players:2,eligible_first_day:2,first_day_finishers:1,eligible_d1:2,returned_d1:2});
 assert.deepEqual(bySource('google'),{source:'google',medium:'organic',campaign:'—',new_players:1,eligible_first_day:1,first_day_finishers:1,eligible_d1:0,returned_d1:0});
 assert.deepEqual(bySource('Direct / unknown'),{source:'Direct / unknown',medium:'—',campaign:'—',new_players:1,eligible_first_day:0,first_day_finishers:0,eligible_d1:0,returned_d1:0});
 assert.equal(d.acquisition.length,3);
 const traffic=d.sources.find(r=>r.source==='playlin');
 assert.equal(traffic.players,3);assert.equal(traffic.active_game_days,3);
 assert.equal('starts' in traffic,false);
});
test('first-source ties are deterministic and preserve separate campaigns',async()=>{
 const a=crypto.randomUUID(),b=crypto.randomUUID(),at=ago(3);
 await ingest([
  event('game_play',a,3,{at,id:'ffffffff-ffff-ffff-ffff-ffffffffffff',source:'later-tie'}),
  event('game_play',a,3,{at,id:'00000000-0000-0000-0000-000000000000',source:'newsletter',campaign:'one'}),
  event('game_play',b,3,{source:'newsletter',campaign:'two'})
 ]);
 const rows=(await report()).acquisition;
 assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>r.campaign),['one','two']);
 assert.ok(rows.every(r=>r.new_players===1&&r.source==='newsletter'));
});
