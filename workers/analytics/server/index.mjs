import {authorized} from './access.mjs';
import dashboard from './dashboard.html';
import {cachedReport,refreshSummaries} from './summary-cache.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const allowedKinds=new Set(['visit','game_start','game_play','game_complete','tutorial_start','tutorial_complete','tutorial_lesson_start','tutorial_lesson_complete','tutorial_exit']);
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
 const data=await cachedReport(env,environment,days);
 return json(data,data.pending?202:200);
}
export default {
 async scheduled(controller,env,ctx) {
  ctx.waitUntil((async()=>{for(const environment of ['production','preview'])await refreshSummaries(env,environment);})());
 },
 async fetch(request,env,ctx) {
 const url=new URL(request.url);
 try {
  if(url.pathname==='/ingest'&&request.method==='POST')return await ingest(request,env);
  let authCode='access_denied';
  if(!await authorized(request,env,{access:ctx?.access,onDenied:code=>{authCode=code;}}))return json({error:'Owner sign-in required.',code:authCode},403);
  if(url.pathname==='/api/report'&&request.method==='GET')return await report(url,env);
  if(url.pathname==='/'&&request.method==='GET')return new Response(env.AUTH_MODE==='access'?dashboard.replace('<option value="production">','<option value="production" selected>'):dashboard,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});
  return json({error:'Not found'},404);
 }catch(error){console.error('Analytics request failed',error.message);return json({error:'Analytics temporarily unavailable. Please retry.'},503);}
}};
