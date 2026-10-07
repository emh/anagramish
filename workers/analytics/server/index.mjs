import {authorized} from './access.mjs';
import dashboard from './dashboard.html';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const allowedKinds=new Set(['visit','game_start','game_play','game_complete','tutorial_start','tutorial_complete']);
const fields=['id','kind','player','occurredAt','day','environment','mode','puzzleDate','hard','seconds','mistakes','wordCount','resumed','source','medium','campaign','referrer','landing','country','region','device'];
const cols=['id','kind','player','occurred_at','day','environment','mode','puzzle_date','hard','seconds','mistakes','word_count','resumed','source','medium','campaign','referrer','landing','country','region','device'];
async function secureEquals(a,b) {
 const digest=async x=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)));
 const [x,y]=await Promise.all([digest(a),digest(b)]);let d=0;for(let i=0;i<x.length;i++)d|=x[i]^y[i];return d===0;
}
function validEvent(e) {
 return e && allowedKinds.has(e.kind) && typeof e.id==='string' && e.id.length<=160 && /^[a-f0-9-]{36}$/.test(e.player) && ['preview','production'].includes(e.environment) && Number.isSafeInteger(e.occurredAt) && e.occurredAt>0 && e.occurredAt<=Date.now()+60000 && e.day===new Date(e.occurredAt).toISOString().slice(0,10) && fields.every(k=>e[k]===undefined||e[k]===null||typeof e[k]==='number'||(typeof e[k]==='string'&&e[k].length<=200));
}
async function ingest(request,env) {
 if(!env.INGEST_TOKEN||!await secureEquals(request.headers.get('authorization')??'',`Bearer ${env.INGEST_TOKEN}`))return json({error:'Unauthorized'},401);
 const raw=await request.text();if(raw.length>100000)return json({error:'Too large'},413);
 const {events}=JSON.parse(raw);
 if(!Array.isArray(events)||events.length>50||!events.length||!events.every(validEvent))return json({error:'Invalid events'},400);
 await env.DB.batch(events.map(e=>env.DB.prepare(`INSERT OR IGNORE INTO events (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`).bind(...fields.map(k=>e[k]??(k==='resumed'?0:null)))));
 return json({accepted:events.length});
}
async function report(url,env) {
 const environment=url.searchParams.get('environment')==='production'?'production':'preview';
 const days=[7,28,90].includes(Number(url.searchParams.get('days')))?Number(url.searchParams.get('days')):28;
 const today=new Date().toISOString().slice(0,10);
 const from=new Date(Date.now()-(days-1)*86400000).toISOString().slice(0,10);
 const firsts=`SELECT player,MIN(day) first_day FROM events WHERE environment=? AND kind='game_play' GROUP BY player`;
 const results=await env.DB.batch([
  env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN kind='visit' THEN player END) visitors, COUNT(DISTINCT CASE WHEN kind='game_play' THEN player END) players, SUM(kind='game_start') starts,SUM(kind='game_complete') completions,SUM(kind='tutorial_start') tutorial_starts,SUM(kind='tutorial_complete') tutorial_completions,AVG(CASE WHEN kind='game_complete' THEN seconds END) avg_seconds,MAX(occurred_at) last_event FROM events WHERE environment=? AND day BETWEEN ? AND ?`).bind(environment,from,today),
  env.DB.prepare(`WITH firsts AS (${firsts}) SELECT e.day,COUNT(DISTINCT CASE WHEN kind='visit' THEN e.player END) visitors,COUNT(DISTINCT CASE WHEN kind='game_play' THEN e.player END) players,COUNT(DISTINCT CASE WHEN kind='game_play' AND f.first_day=e.day THEN e.player END) new_players,SUM(kind='game_start') starts,SUM(kind='game_complete') completions FROM events e LEFT JOIN firsts f ON f.player=e.player WHERE e.environment=? AND e.day BETWEEN ? AND ? GROUP BY e.day ORDER BY e.day DESC`).bind(environment,environment,from,today),
  env.DB.prepare(`SELECT COALESCE(source,referrer,'Direct / unknown') source,COALESCE(medium,'—') medium,COALESCE(campaign,'—') campaign,COUNT(DISTINCT player) players,COUNT(*) starts FROM events WHERE environment=? AND kind='game_play' AND day BETWEEN ? AND ? GROUP BY source,medium,campaign ORDER BY players DESC LIMIT 30`).bind(environment,from,today),
  env.DB.prepare(`SELECT COALESCE(country,'Unknown') country,COALESCE(region,'Unknown') region,COUNT(DISTINCT player) players FROM events WHERE environment=? AND kind='game_play' AND day BETWEEN ? AND ? GROUP BY country,region ORDER BY players DESC LIMIT 20`).bind(environment,from,today),
  env.DB.prepare(`SELECT puzzle_date,hard,COUNT(*) completions,COUNT(DISTINCT player) players,ROUND(AVG(seconds)) avg_seconds,ROUND(AVG(mistakes),1) avg_mistakes,ROUND(AVG(word_count),1) avg_words,SUM(resumed) resumed FROM events WHERE environment=? AND kind='game_complete' AND mode='daily' AND day BETWEEN ? AND ? GROUP BY puzzle_date,hard ORDER BY puzzle_date DESC LIMIT 40`).bind(environment,from,today),
  env.DB.prepare(`WITH firsts AS (${firsts}), active AS (SELECT DISTINCT player,day FROM events WHERE environment=? AND kind='game_play') SELECT SUM(first_day<=date(?,'-1 day')) eligible_d1,SUM(first_day<=date(?,'-1 day') AND EXISTS(SELECT 1 FROM active WHERE active.player=f.player AND active.day=date(f.first_day,'+1 day'))) returned_d1,SUM(first_day<=date(?,'-7 day')) eligible_d7,SUM(first_day<=date(?,'-7 day') AND EXISTS(SELECT 1 FROM active WHERE active.player=f.player AND active.day=date(f.first_day,'+7 day'))) returned_d7 FROM firsts f WHERE first_day BETWEEN ? AND ?`).bind(environment,environment,today,today,today,today,from,today),
  env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN e.kind='visit' AND lower(COALESCE(e.medium,''))='organic' THEN e.player END) visitors,COUNT(DISTINCT CASE WHEN e.kind='game_play' AND lower(COALESCE(e.medium,''))='organic' THEN e.player END) players,COUNT(DISTINCT CASE WHEN e.kind='game_complete' AND lower(COALESCE(s.medium,''))='organic' THEN e.player END) finishers FROM events e LEFT JOIN events s ON e.kind='game_complete' AND s.id='start:'||substr(e.id,10) AND s.environment=e.environment WHERE e.environment=? AND e.day BETWEEN ? AND ?`).bind(environment,from,today)
 ]);
 return json({environment,days,from,today,summary:results[0].results[0],daily:results[1].results,sources:results[2].results,locations:results[3].results,puzzles:results[4].results,retention:results[5].results[0],organic:results[6].results[0]});
}
export default {async fetch(request,env) {
 const url=new URL(request.url);
 try {
  if(url.pathname==='/ingest'&&request.method==='POST')return await ingest(request,env);
  if(!await authorized(request,env))return json({error:'Owner sign-in required.'},403);
  if(url.pathname==='/api/report'&&request.method==='GET')return await report(url,env);
  if(url.pathname==='/'&&request.method==='GET')return new Response(env.AUTH_MODE==='access'?dashboard.replace('<option value="production">','<option value="production" selected>'):dashboard,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});
  return json({error:'Not found'},404);
 }catch(error){console.error('Analytics request failed',error.message);return json({error:'Analytics temporarily unavailable. Please retry.'},503);}
}};
