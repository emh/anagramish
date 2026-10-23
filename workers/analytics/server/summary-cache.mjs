import {summarize,aggregate,PART_SIZE} from './daily-summary.mjs';

// Raw history is consumed once, in bounded batches. Only the unfinished 500-row
// part is reread; completed parts are immutable. A late event is appended with a
// new rowid and contributes to its actual UTC day, even if that day is old.
const PAGE_SIZE=2000;
export async function refreshSummaries(env,environment,now=Date.now()) {
 const db=env.DB,token=crypto.randomUUID();
 const state=await db.prepare(`UPDATE analytics_summary_state SET lease_token=?,lease_until=?
  WHERE environment=? AND lease_until<=? AND next_refresh<=? RETURNING *`)
  .bind(token,now+60000,environment,now,now).first();
 if(!state)return;
 const guard=`EXISTS(SELECT 1 FROM analytics_summary_state WHERE environment=? AND lease_token=?)`;
 try {
  if(state.cursor>=state.latest_rowid) {
   await db.prepare(`UPDATE analytics_summary_state SET refreshed_at=?,next_refresh=?,lease_until=0,lease_token=NULL
    WHERE environment=? AND lease_token=?`).bind(now,now+Number(env.SUMMARY_REFRESH_MS??300000),environment,token).run();
   return;
  }
  const firstPart=Math.floor(state.cursor/PART_SIZE);
  const {results:events}=await db.prepare(`SELECT rowid AS event_rowid,* FROM events INDEXED BY idx_events_environment
   WHERE environment=? AND rowid>? AND rowid<=? ORDER BY rowid LIMIT ?`)
   .bind(environment,firstPart*PART_SIZE,state.latest_rowid,PAGE_SIZE).all();
  const cursor=events.at(-1)?.event_rowid??state.latest_rowid,lastPart=Math.floor((cursor-1)/PART_SIZE);
  const parts=new Map();
  for(const e of events){const part=Math.floor((e.event_rowid-1)/PART_SIZE);if(!parts.has(part))parts.set(part,[]);parts.get(part).push(e);}
  const statements=[db.prepare(`DELETE FROM analytics_daily_summaries WHERE environment=? AND part BETWEEN ? AND ? AND ${guard}`).bind(environment,firstPart,lastPart,environment,token)];
  for(const [part,rows] of parts)statements.push(db.prepare(`INSERT INTO analytics_daily_summaries(environment,part,payload)
   SELECT ?,?,? WHERE ${guard}`).bind(environment,part,JSON.stringify(summarize(rows)),environment,token));
  const caughtUp=cursor>=state.latest_rowid;
  statements.push(db.prepare(`UPDATE analytics_summary_state SET cursor=?,refreshed_at=?,next_refresh=?,lease_until=0,lease_token=NULL
   WHERE environment=? AND lease_token=?`).bind(cursor,caughtUp?now:state.refreshed_at,caughtUp?now+Number(env.SUMMARY_REFRESH_MS??300000):0,environment,token));
  // Replacement and checkpoint publish atomically, never half a daily summary.
  await db.batch(statements);
 } catch(error) {
  await db.prepare(`UPDATE analytics_summary_state SET lease_until=0,lease_token=NULL WHERE environment=? AND lease_token=?`).bind(environment,token).run();
  throw error;
 }
}
const freshness=(state,env)=>({updated_at:state.refreshed_at,refresh_seconds:Number(env.SUMMARY_REFRESH_MS??300000)/1000,catching_up:state.cursor<state.latest_rowid});
export async function cachedReport(env,environment,days,now=Date.now()) {
 await refreshSummaries(env,environment,now);
 const [states,reports]=await env.DB.batch([
  env.DB.prepare('SELECT * FROM analytics_summary_state WHERE environment=?').bind(environment),
  env.DB.prepare('SELECT * FROM analytics_report_cache WHERE environment=? AND days=?').bind(environment,days)
 ]);
 const state=states.results[0],cached=reports.results[0];
 if(!state.refreshed_at)return {pending:true,message:'Preparing daily summaries. Historical events are being processed in small batches.'};
 if(cached&&cached.cursor===state.cursor&&cached.expires_at>now)return {...JSON.parse(cached.payload),cache:freshness(state,env)};
 // A batch gives the checkpoint and its summaries one consistent DB snapshot.
 const [snapshot,parts]=await env.DB.batch([
  env.DB.prepare('SELECT * FROM analytics_summary_state WHERE environment=?').bind(environment),
  env.DB.prepare('SELECT payload FROM analytics_daily_summaries WHERE environment=? ORDER BY part').bind(environment)
 ]);
 const current=snapshot.results[0];
 const report=aggregate(parts.results.flatMap(r=>JSON.parse(r.payload)),{environment,days,now});
 // Age-based cohorts can mature without new events. Never carry a report across
 // UTC midnight, and expire within five minutes even when the cursor is unchanged.
 const expires=Math.min(now+300000,(Math.floor(now/86400000)+1)*86400000);
 await env.DB.prepare(`INSERT INTO analytics_report_cache(environment,days,cursor,expires_at,payload)
  SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM analytics_summary_state WHERE environment=? AND cursor=?)
  ON CONFLICT(environment,days) DO UPDATE SET cursor=excluded.cursor,expires_at=excluded.expires_at,payload=excluded.payload`)
  .bind(environment,days,current.cursor,expires,JSON.stringify(report),environment,current.cursor).run();
 return {...report,cache:freshness(current,env)};
}
