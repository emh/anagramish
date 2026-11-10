import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {setup} from '../scripts/local.mjs';
import {cachedReport} from '../../analytics/server/summary-cache.mjs';
const sql="INSERT OR IGNORE INTO feedback(id,player,created_at,environment,entry,screen,comment,app_version,player_type) VALUES(?,?,?,?,'header','welcome','private comment','test','not_yet_played')";
const now=Date.parse('2026-11-10T12:00:00Z'),day=86400000;

test('daily feedback migration backfills existing feedback and counts retries once in the submission UTC day',()=>{
 const db=new DatabaseSync(':memory:');
 try {
  db.exec(readFileSync(new URL('../../analytics/drizzle/0003_yellow_moonstone.sql',import.meta.url),'utf8'));
  const insert=(id,at,environment='production')=>db.prepare(sql).run(id,'browser',at,environment);
  insert('old1',now-day);insert('old2',now-day);insert('today',now);insert('preview',now,'preview');
  db.exec(readFileSync(new URL('../../analytics/drizzle/0004_bored_giant_man.sql',import.meta.url),'utf8'));
  const count=(env,date)=>db.prepare('SELECT submissions FROM feedback_daily_counts WHERE environment=? AND day=?').get(env,date)?.submissions??0;
  assert.equal(count('production','2026-11-09'),2);assert.equal(count('production','2026-11-10'),1);assert.equal(count('preview','2026-11-10'),1);
  insert('today',now);assert.equal(count('production','2026-11-10'),1,'duplicate retry does not fire the insert counter');
  insert('late',now-day);assert.equal(count('production','2026-11-09'),3,'late delivery uses submission date');
  insert('end',Date.parse('2026-11-10T23:59:59.999Z'));insert('midnight',Date.parse('2026-11-11T00:00:00Z'));
  assert.equal(count('production','2026-11-10'),2);assert.equal(count('production','2026-11-11'),1);
 }finally{db.close();}
});

test('feedback counts are cached, isolated, independent of period, and roll over without adding gameplay',async()=>{
 const app=await setup();
 try {
  const queries=[],db=app.analyticsDb;let rowsRead=0;
  const DB={prepare(q){queries.push(q);return db.prepare(q);},async batch(statements){const results=await db.batch(statements);rowsRead+=results.reduce((n,r)=>n+r.meta.rows_read,0);return results;}};
  const env={DB,SUMMARY_REFRESH_MS:300000};
  const insert=(id,at,environment='production')=>db.prepare(sql).bind(id,'browser',at,environment).run();
  await insert('yesterday',now-day);await insert('today',now);await insert('old',now-100*day);await insert('preview',now,'preview');
  for(const days of [7,28,90]) {
   const report=await cachedReport(env,'production',days,now);
   assert.equal(report.today_overview.feedback_count,1);assert.equal(report.yesterday_overview.feedback_count,1);
   assert.equal(report.summary.players,0);assert.equal(report.summary.visitors,0);assert.equal(report.summary.starts??0,0);assert.equal(report.today_overview.last_event,null);
   assert.equal(JSON.stringify(report).includes('private comment'),false);
  }
  assert.equal((await cachedReport(env,'preview',7,now)).today_overview.feedback_count,1);
  await insert('new',now+1000);queries.length=0;rowsRead=0;
  const warm=await cachedReport(env,'production',7,now+2000);
  assert.equal(warm.today_overview.feedback_count,1,'cached totals remain stable until expiry');
  assert.ok(rowsRead<=4,'warm report retains its existing D1 read budget');
  assert.equal(queries.some(q=>/FROM feedback/.test(q)),false,'warm report does not query feedback or counters');
  queries.length=0;
  const fresh=await cachedReport(env,'production',7,now+300001);
  assert.equal(fresh.today_overview.feedback_count,2,'feedback alone refreshes after expiry without gameplay events');
  assert.equal(queries.some(q=>/FROM feedback\s/.test(q)),false,'even a cold report never reads comments');
  assert.equal(queries.filter(q=>/FROM feedback_daily_counts/.test(q)).length,1);
  const tomorrow=await cachedReport(env,'production',7,Date.parse('2026-11-11T00:00:00Z'));
  assert.equal(tomorrow.today_overview.feedback_count,0);assert.equal(tomorrow.yesterday_overview.feedback_count,2);
 }finally{await app.dispose();}
});
