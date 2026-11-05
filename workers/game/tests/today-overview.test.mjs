import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarize,aggregate} from '../../analytics/server/daily-summary.mjs';

const now=Date.parse('2026-11-04T12:00:00Z'),day=at=>new Date(at).toISOString().slice(0,10);
const uuid=n=>`${String(n).padStart(8,'0')}-0000-0000-0000-000000000000`;
function event(kind,session,player,offset,extra={}) {
 const at=now+offset,prefix={visit:'visit',game_start:'start',game_play:'play',game_complete:'complete'}[kind];
 return {id:`${prefix}:${uuid(session)}${kind==='game_play'?':'+day(at):''}`,kind,player:uuid(player),occurred_at:at,day:day(at),mode:'daily',hard:0,puzzle_date:day(at),resumed:0,...extra};
}
const report=(events,days=7,time=now)=>aggregate(events.flatMap(e=>summarize([e])),{environment:'production',days,now:time});

test('today counts distinct browsers across summary parts and assigns each to one current-day source and location',()=>{
 const events=[
  event('game_play',1,1,-100*86400000,{source:'old-source'}),
  event('visit',2,1,-10000),event('visit',3,1,-9000),event('visit',4,2,-9000),event('visit',5,3,-9000),
  event('game_play',6,1,-8000,{source:'playlin',country:'CA',region:'BC'}),
  event('game_play',7,1,-7000,{source:'google',country:'US',region:'WA'}),
  event('game_play',8,2,-8000,{referrer:'example.test',country:'GB',region:'England',mode:'practice',puzzle_date:null}),
  event('game_play',9,2,-7000,{source:'playlin',mode:'practice',puzzle_date:null}),event('game_play',10,4,-6000),
  event('game_start',6,1,-8000),event('game_start',7,1,-7000),event('game_start',8,2,-8000,{mode:'practice'}),
  event('game_complete',6,1,-5000,{seconds:60}),event('game_complete',7,1,-4000,{seconds:120}),
  // A completion today for a session started earlier, with no play today.
  event('game_complete',11,5,-3000,{seconds:90})
 ];
 const r=report(events),overview=r.today_overview,t=overview.daily;
 assert.equal(overview.visitors,3);assert.equal(t.players,2);assert.equal(t.new_players,1);assert.equal(t.returning_players,1);
 assert.equal(t.starts,2);assert.equal(t.completions,3);assert.equal(t.finishers,2);assert.equal(t.avg_seconds,90);
 assert.deepEqual(t.sources.map(x=>[x.source,x.players,x.new_players,x.returning_players]),[
  ['Direct / unknown',1,1,0],['playlin',1,0,1]
 ]);
 assert.equal(t.locations.length,2);assert.ok(!t.locations.some(x=>x.country==='US'));
 for(const rows of [t.sources,t.locations]) {
  assert.equal(rows.reduce((n,r)=>n+r.players,0),t.players);
  assert.equal(rows.reduce((n,r)=>n+r.new_players,0),t.new_players);
 }
 assert.deepEqual(t.game_starts,[{mode:'daily',hard:0,starts:2,players:1,max_starts_per_player:2}]);
 assert.equal(overview.practice.players,1);assert.equal(overview.practice.starts,1);assert.equal(overview.practice.completions,0);
 assert.equal(overview.practice.sources[0].source,'example.test');
 for(const days of [28,90])assert.deepEqual(report(events,days).today_overview,overview,'Today does not depend on the period filter');
 assert.ok(!JSON.stringify(overview).includes(uuid(1)),'private browser/session IDs never reach the report');
});

test('late and tied plays are deterministic, history changes new/returning classification, and UTC midnight clears today',()=>{
 const events=[event('game_play',20,1,-5000,{source:'z',country:'CA'}),event('game_play',19,1,-5000,{source:'a',country:'US'})];
 const t=report(events).today_overview.daily;
 assert.equal(t.sources[0].source,'a');assert.equal(t.locations[0].country,'US');assert.equal(t.new_players,1);
 assert.deepEqual(report([...events].reverse()).today_overview.daily,t);
 events.push(event('game_play',21,1,-6000,{source:'earlier',country:'GB'}));
 assert.equal(report(events).today_overview.daily.sources[0].source,'earlier');
 events.push(event('game_play',22,1,-86400000));
 assert.equal(report(events).today_overview.daily.returning_players,1);
 const next=report(events,7,Date.parse('2026-11-05T00:00:00Z')).today_overview;
 assert.equal(next.day,'2026-11-05');assert.equal(next.timezone,'UTC');
 assert.equal(next.visitors,0);
 for(const mode of ['daily','practice'])for(const k of ['players','new_players','returning_players','starts','completions','finishers'])assert.equal(next[mode][k],0);
 assert.equal(next.daily.avg_seconds,null);assert.equal(next.last_event,null);assert.deepEqual(next.daily.sources,[]);assert.deepEqual(next.daily.locations,[]);
 assert.deepEqual(report([],7,Date.parse('2026-11-05T00:00:00Z')).today_overview,next);
 assert.deepEqual(report(events,7,Date.parse('2026-11-05T00:00:00Z')).yesterday_overview,report(events).today_overview,'the completed UTC day remains available after midnight');
});


test('practice history does not make a first daily player returning; tutorial variants match exact attempts across days',()=>{
 const start=(n,player,offset,variant)=>event('tutorial_start',n,player,offset,{id:`tutorial:${uuid(player)}:${uuid(n)}:start`,mode:'tutorial',experiment:variant?'tutorial-short-v1':null,variant});
 const complete=(n,player,offset)=>event('tutorial_complete',n,player,offset,{id:`tutorial:${uuid(player)}:${uuid(n)}:complete`,mode:'tutorial'});
 const events=[
  event('game_play',1,1,-86400000,{mode:'practice',puzzle_date:null}),event('game_play',2,1,-5000),
  event('game_play',3,1,-3000,{mode:'practice',puzzle_date:null}),
  start(10,2,-86400000,'control'),complete(10,2,-3000),
  start(11,2,-5000,'short'),complete(11,2,-2000),
  start(12,2,-1000,'short'),start(13,3,-5000,null),complete(13,3,-1000),
  start(14,4,-5000,'control'),complete(99,5,-1000)
 ];
 const t=report(events).today_overview;
 assert.equal(t.daily.new_players,1);assert.equal(t.daily.returning_players,0);
 assert.equal(t.practice.new_players,0);assert.equal(t.practice.returning_players,1);
 assert.deepEqual(t.tutorials,[{variant:'control',starts:1,completions:1},{variant:'short',starts:2,completions:1},{variant:'unassigned',starts:1,completions:2}]);
});
