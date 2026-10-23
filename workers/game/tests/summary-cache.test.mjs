import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {cachedReport,refreshSummaries} from '../../analytics/server/summary-cache.mjs';
import {rawReport} from './fixtures/raw-report.mjs';

// Real SQLite executes the production SQL, with the small D1 API surface adapted.
function setup({historical=[]}={}) {
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(readFileSync(new URL('../../analytics/drizzle/0000_little_northstar.sql',import.meta.url),'utf8'));
 const queries=[];
 const db={prepare(sql){let args=[];const execute=()=>{
  queries.push({sql,args});const s=sqlite.prepare(sql);const results=s.all(...args).map(r=>({...r}));return {results};
 };return {bind(...values){args=values;return this;},async first(){return execute().results[0]??null;},async all(){return execute();},async run(){return execute();}};},
 async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.all());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const insert=e=>{const cols=Object.keys(e);sqlite.prepare(`INSERT OR IGNORE INTO events(${cols.join(',')}) VALUES(${cols.map(()=>'?').join(',')})`).run(...Object.values(e));};
 historical.forEach(insert);
 sqlite.exec(readFileSync(new URL('../../analytics/drizzle/0001_daily_summaries.sql',import.meta.url),'utf8'));
 return {sqlite,DB:db,queries,insert,SUMMARY_REFRESH_MS:0};
}
const now=Date.parse('2026-10-23T12:00:00Z'),day=at=>new Date(at).toISOString().slice(0,10),ago=n=>now-n*86400000;
const id=n=>`${n.toString(16).padStart(8,'0')}-0000-0000-0000-000000000000`;
function event(kind,n,player,at,extra={}) {
 const prefix={visit:'visit',game_start:'start',game_play:'play',game_complete:'complete'}[kind];
 return {id:`${prefix}:${id(n)}${kind==='game_play'?':'+day(at):''}`,kind,player:id(player),occurred_at:at,day:day(at),environment:'production',mode:'daily',hard:0,puzzle_date:day(at),resumed:0,...extra};
}
function tutorial(action,n,player,at,lesson) {
 return event('tutorial_'+action,n,player,at,{id:`tutorial:${id(player)}:${id(n)}:${action}${lesson?':'+lesson:''}`,mode:'tutorial'});
}
function normalized(report) {
 const {cache,...r}=report;
 // Original SQL leaves ties in these rankings unspecified.
 for(const field of ['sources','locations'])r[field]=[...r[field]].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 return r;
}
async function check(env,days=28,time=now) {
 const cached=await cachedReport(env,'production',days,time);
 assert.ok(!cached.pending);
 assert.deepEqual(normalized(cached),normalized(await rawReport(env,'production',days,time)));
 return cached;
}
test('cached reports match raw queries across windows, late arrivals, sessions, cohorts and lessons',async()=>{
 const env=setup();
 const fixtures=[
  event('visit',1,1,ago(5),{medium:'organic'}),event('visit',2,1,ago(4)),
  event('game_start',10,1,ago(5),{medium:'organic'}),event('game_play',10,1,ago(5),{source:'google',medium:'organic'}),
  event('game_play',10,1,ago(4)),event('game_complete',10,1,ago(4),{seconds:120,mistakes:3,word_count:4}),
  event('game_play',11,1,ago(0)),event('game_play',12,2,ago(8),{source:'playlin'}),event('game_play',13,2,ago(1)),
  event('game_play',14,3,ago(100)),event('game_play',15,3,ago(1)),
  event('game_start',16,4,ago(1),{mode:'practice'}),event('game_start',17,4,ago(1),{mode:'practice',resumed:1}),
  tutorial('start',20,5,ago(3)),tutorial('lesson_start',20,5,ago(3),1),tutorial('lesson_complete',20,5,ago(3)+200,1),tutorial('exit',20,5,ago(3)+300,1),tutorial('complete',20,5,ago(3)+1000),
  event('game_play',21,5,ago(3)+2000),event('game_complete',21,5,ago(3)+3000,{seconds:40,mistakes:0,word_count:4}),
  tutorial('start',22,6,ago(.5)),tutorial('complete',22,6,ago(.4)),
  tutorial('start',23,7,ago(5)),tutorial('start',24,7,ago(4)),tutorial('complete',24,7,ago(4)+2000),
  event('game_play',25,8,ago(2),{environment:'preview'}),event('game_start',26,9,ago(2),{hard:1})
 ];
 for(const e of fixtures)env.insert(e);
 for(const days of [7,28,90])await check(env,days);
 const before=await cachedReport(env,'production',7,now);fixtures.forEach(env.insert);
 assert.deepEqual(await cachedReport(env,'production',7,now),before,'duplicate retries do not change summaries');
 // Earlier first play arrives after its cohort had already been cached.
 env.insert(event('game_play',27,1,ago(9),{source:'newsletter',campaign:'late'}));
 // Completion for a game active on a different date.
 env.insert(event('game_complete',26,9,ago(0),{hard:1,seconds:60,mistakes:1,word_count:4}));
 for(const days of [7,28,90])await check(env,days);
 await check(env,7,now+86400000); // UTC rollover and newly mature tutorial/retention.
 assert.ok(!JSON.stringify(before).includes(id(1)),'public reports must not contain browser IDs');
});
test('bounded historical backfill, hot reports and incremental tail reads',async()=>{
 const historical=Array.from({length:5100},(_,i)=>event('visit',i+1,i%100,ago(i%28)));
 const env=setup({historical});
 assert.equal((await cachedReport(env,'production',28,now)).pending,true);
 assert.equal((await cachedReport(env,'production',28,now)).pending,true);
 await check(env);
 assert.equal(env.sqlite.prepare('SELECT COUNT(*) n FROM analytics_daily_summaries').get().n,11);
 env.queries.length=0;
 for(const days of [7,28,90])await cachedReport(env,'production',days,now);
 assert.equal(env.queries.filter(q=>/FROM events/.test(q.sql)).length,0,'warm reports read no raw events');
 env.insert(event('visit',6000,101,ago(100)));
 env.queries.length=0;
 await cachedReport(env,'production',28,now);
 const raw=env.queries.filter(q=>/FROM events/.test(q.sql));assert.equal(raw.length,1);
 assert.equal(raw[0].args[1],5000,'only the unfinished part is reread, not the 5,000 finalized rows');
 const plan=env.sqlite.prepare('EXPLAIN QUERY PLAN '+raw[0].sql).all(...raw[0].args);
 assert.match(plan.map(r=>r.detail).join(' '),/environment=\? AND rowid>\? AND rowid<\?/);
 await check(env);
});
test('refresh interval, leases and failure recovery prevent duplicate builds and partial publication',async()=>{
 const env=setup();env.SUMMARY_REFRESH_MS=300000;
 env.insert(event('visit',1,1,ago(1)));await cachedReport(env,'production',7,now);
 env.insert(event('visit',2,2,ago(0)));env.queries.length=0;
 assert.equal((await cachedReport(env,'production',7,now+1000)).summary.visitors,1);
 assert.equal(env.queries.filter(q=>/FROM events/.test(q.sql)).length,0);
 assert.equal((await cachedReport(env,'production',7,now+300000)).summary.visitors,2);
 env.insert(event('visit',3,3,ago(0)));
 env.sqlite.prepare('UPDATE analytics_summary_state SET lease_token=?,lease_until=? WHERE environment=?').run('other',now+700000,'production');
 assert.equal((await cachedReport(env,'production',7,now+600000)).summary.visitors,2,'active lease serves existing snapshot');
 const batch=env.DB.batch;let fail=true;
 env.DB.batch=async statements=>{if(fail){fail=false;throw Error('simulated D1 failure');}return batch(statements);};
 await assert.rejects(refreshSummaries(env,'production',now+800000),/simulated/);
 assert.equal(env.sqlite.prepare("SELECT cursor FROM analytics_summary_state WHERE environment='production'").get().cursor,2);
 assert.equal((await cachedReport(env,'production',7,now+800001)).summary.visitors,3);
});
test('empty reports preserve prior API shapes',async()=>{await check(setup());});
test('partial parts stay correct across many environments, days and refreshes',async()=>{
 const env=setup();let n=10000;
 for(let round=0;round<6;round++) {
  // Reverse event-time order exercises historical days arriving in new parts.
  for(let i=0;i<173;i++) {
   const player=i%19,at=ago((i*7+round)%100),session=++n;
   const extra={environment:i%11===0?'preview':'production',source:['playlin','google','newsletter'][i%3],medium:i%3===1?'organic':null,country:['US','CA','GB'][i%3],region:['A','B'][i%2],mode:i%4?'daily':'practice',hard:i%2};
   env.insert(event('visit',session,player,at,extra));
   env.insert(event('game_start',session,player,at,extra));
   env.insert(event('game_play',session,player,at,extra));
   if(i%3)env.insert(event('game_complete',session,player,at+60000,{...extra,seconds:i+1,mistakes:i%10,word_count:4}));
  }
  for(const days of [7,28,90])await check(env,days,now+round*300000);
 }
 const result=await cachedReport(env,'preview',28,now+1800000);
 assert.deepEqual(normalized(result),normalized(await rawReport(env,'preview',28,now+1800000)));
});
test('an expired builder cannot overwrite a newer checkpoint',async()=>{
 const env=setup();env.insert(event('visit',1,1,ago(1)));
 const batch=env.DB.batch;let takenOver=false;
 env.DB.batch=async statements=>{
  if(!takenOver){takenOver=true;await refreshSummaries(env,'production',now+61000);}
  return batch(statements);
 };
 await refreshSummaries(env,'production',now);
 assert.equal(env.sqlite.prepare("SELECT refreshed_at FROM analytics_summary_state WHERE environment='production'").get().refreshed_at,now+61000);
 await check(env,7,now+61001);
});
