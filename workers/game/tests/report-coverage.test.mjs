import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aggregate,summarize} from '../../analytics/server/daily-summary.mjs';

const now=Date.parse('2026-11-10T12:00:00Z'),DAY=86400000,day=at=>new Date(at).toISOString().slice(0,10);
const id=n=>`${String(n).padStart(8,'0')}-0000-0000-0000-000000000000`;
function event(kind,n,player,daysAgo){const at=now-daysAgo*DAY;return {id:`${kind==='visit'?'visit':'play'}:${id(n)}${kind==='game_play'?':'+day(at):''}`,kind,player:id(player),occurred_at:at,day:day(at),mode:'practice',puzzle_date:null,resumed:0};}
const report=(events,days=90,time=now)=>aggregate(events.flatMap(e=>summarize([e])),{environment:'production',days,now:time});

test('average counts completed calendar days since first activity, including gaps and visit-only days, but excludes today',()=>{
 const events=[event('visit',1,1,4),event('game_play',2,1,3),event('game_play',3,1,3),event('game_play',4,2,3),event('game_play',5,1,1),...Array.from({length:10},(_,i)=>event('game_play',10+i,10+i,0))];
 const expected={first_recorded_day:'2026-11-06',from:'2026-11-06',through:'2026-11-09',completed_days:4,player_days:3,average_daily_players:.75};
 for(const days of [7,28,90])assert.deepEqual(report(events,days).coverage,expected);
 assert.equal(report(events).summary.players,12,'period unique players are not the average numerator');
 const tomorrow=report(events,90,Date.parse('2026-11-11T00:00:00Z')).coverage;
 assert.equal(tomorrow.completed_days,5);assert.equal(tomorrow.player_days,13);assert.equal(tomorrow.average_daily_players,2.6);
});
test('history before a selected window establishes coverage even when the selected window is quiet',()=>{
 const events=[event('visit',1,1,120),event('game_play',2,2,3)];
 for(const days of [7,28,90]) {
  const c=report(events,days).coverage;
  assert.equal(c.completed_days,days-1);assert.equal(c.player_days,1);assert.equal(c.average_daily_players,1/(days-1));
 }
 const quiet=report([events[0]],7).coverage;
 assert.equal(quiet.completed_days,6);assert.equal(quiet.average_daily_players,0);
});
test('no history or only an unfinished first day yields no average, and late older activity extends coverage',()=>{
 const empty=report([]).coverage;
 assert.deepEqual(empty,{first_recorded_day:null,from:null,through:null,completed_days:0,player_days:0,average_daily_players:null});
 const current=report([event('game_play',1,1,0)]).coverage;
 assert.equal(current.from,'2026-11-10');assert.equal(current.completed_days,0);assert.equal(current.average_daily_players,null);
 const events=[event('game_play',1,1,1)];
 assert.equal(report(events).coverage.average_daily_players,1);
 events.push(event('visit',2,2,5));
 assert.equal(report(events).coverage.completed_days,5);assert.equal(report(events).coverage.average_daily_players,.2);
});
