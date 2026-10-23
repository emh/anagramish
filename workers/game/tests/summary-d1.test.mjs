import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../scripts/local.mjs';
import {cachedReport} from '../../analytics/server/summary-cache.mjs';

test('D1 warm report reads only cache rows and keeps reports owner-only',async()=>{
 const app=await setup();
 try {
  const db=app.analyticsDb,now=Date.now(),day=new Date(now).toISOString().slice(0,10);
  // Several cache parts and repeated browsers, without 1,200 network requests.
  await db.prepare(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<1200)
   INSERT INTO events(id,kind,player,occurred_at,day,environment)
   SELECT 'visit:'||x,'visit','browser-'||(x%100),?,?, 'production' FROM n`).bind(now,day).run();
  let rowsRead=0;
  const measured={prepare:sql=>db.prepare(sql),async batch(statements){const r=await db.batch(statements);rowsRead+=r.reduce((n,x)=>n+x.meta.rows_read,0);return r;}};
  const env={DB:measured};
  const initial=await cachedReport(env,'production',7,now);
  assert.equal(initial.summary.visitors,100);
  rowsRead=0;
  const warm=await cachedReport(env,'production',7,now+1000);
  assert.equal(warm.summary.visitors,100);
  assert.ok(rowsRead<=4,`warm cache batch read ${rowsRead} rows`);
  const denied=await app.analytics.dispatchFetch('https://analytics.test/api/report?environment=production&days=7');
  assert.equal(denied.status,403);
  const allowed=await app.analytics.dispatchFetch('https://analytics.test/api/report?environment=production&days=7',{headers:{'oai-authenticated-user-email':'owner@example.test'}});
  assert.equal(allowed.status,200);assert.equal(allowed.headers.get('cache-control'),'no-store');
  assert.equal((await allowed.json()).summary.visitors,100);
 }finally{await app.dispose();}
});
