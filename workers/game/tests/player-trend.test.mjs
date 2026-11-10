import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarize,aggregate} from '../../analytics/server/daily-summary.mjs';
const DAY=86400000,now=Date.parse('2026-11-10T12:00:00Z');
const date=at=>new Date(at).toISOString().slice(0,10),id=n=>`${String(n).padStart(8,'0')}-0000-0000-0000-000000000000`;
let sequence=0;
function plays(daysAgo,count){const at=now-daysAgo*DAY;return Array.from({length:count},(_,i)=>({id:`play:${id(++sequence)}:${date(at)}`,kind:'game_play',player:id(i+1),occurred_at:at,day:date(at),mode:'practice',hard:0,resumed:0}));}
const visit=daysAgo=>({id:'visit:'+id(++sequence),kind:'visit',player:id(9999),occurred_at:now-daysAgo*DAY,day:date(now-daysAgo*DAY)});
const report=(events,days=28,time=now)=>aggregate(events.flatMap(e=>summarize([e])),{environment:'production',days,now:time});

test('rolling player average includes tracked zero days, deduplicates browsers and excludes today',()=>{
 const events=[visit(7),...plays(6,7),...plays(5,14),...plays(4,21),...plays(3,28),...plays(2,35),...plays(1,42),...plays(0,700)];
 // Reopening or starting another game on the same day cannot add a player.
 events.push(...plays(3,28));
 const trend=report(events).player_trend;
 assert.equal(trend.method,'simple_moving_average');assert.equal(trend.window_days,7);assert.equal(trend.scope,'daily_and_practice');
 assert.equal(trend.completed_tracked_days,7);assert.equal(trend.points.length,1);
 assert.deepEqual(trend.points[0],{day:'2026-11-09',window_from:'2026-11-03',player_days:147,average_daily_players:21});
 assert.equal(JSON.stringify(trend).includes(id(1)),false,'no browser identifiers leave the report');
});
test('period changes retain the same averages and use history before the selected window',()=>{
 const events=[visit(40),...Array.from({length:30},(_,i)=>plays(i+1,30-i)).flat()];
 const short=report(events,7).player_trend.points,long=report(events,90).player_trend.points;
 assert.equal(short.length,6);assert.deepEqual(short,long.filter(p=>p.day>=date(now-6*DAY)));
 assert.equal(short.at(-1).average_daily_players,27);
 assert.equal(short[0].average_daily_players,22,'first point includes the six days preceding its date');
});
test('no partial or pre-tracking windows, and seven completed zero-player days produce a real zero',()=>{
 assert.deepEqual(report([]).player_trend.points,[]);
 assert.deepEqual(report([visit(0),...plays(0,100)]).player_trend.points,[]);
 assert.deepEqual(report([visit(6),...plays(1,7)]).player_trend.points,[]);
 const zero=report([visit(7)]).player_trend;
 assert.equal(zero.points.length,1);assert.equal(zero.points[0].average_daily_players,0);
 const quiet=report([visit(120)],7).player_trend.points;assert.equal(quiet.length,6);assert.ok(quiet.every(p=>p.average_daily_players===0));
});
test('UTC rollover admits yesterday and late activity changes the appropriate full weeks',()=>{
 const events=[visit(7),...plays(1,7),...plays(0,14)];
 const before=report(events).player_trend.points;assert.equal(before.at(-1).average_daily_players,1);
 const after=report(events,28,Date.parse('2026-11-11T00:00:00Z')).player_trend.points;
 assert.equal(after.length,2);assert.equal(after.at(-1).day,'2026-11-10');assert.equal(after.at(-1).average_daily_players,3);
 events.push(...plays(3,7));assert.equal(report(events).player_trend.points.at(-1).average_daily_players,2);
});
