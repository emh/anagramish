import {pairCount,puzzle,practicePair,checkLadder} from './game.mjs';

const uuid = v => typeof v==='string' && /^[a-f0-9-]{36}$/.test(v);
const short = (v,n=100) => typeof v==='string'?v.slice(0,n):null;
const json = (data,status=200,headers={}) => Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
async function body(request) {
 if(!request.headers.get('content-type')?.includes('application/json')) throw new Error('JSON required.');
 const text=await request.text(); if(text.length>16000)throw new Error('Request too large.');
 return JSON.parse(text);
}
function playerFor(request) {
 const found=request.headers.get('cookie')?.match(/(?:^|;\s*)anagramish_player=([^;]+)/)?.[1];
 return uuid(found)?found:crypto.randomUUID();
}
function attribution(request, input={}) {
 let referrer=null;
 try { const u=new URL(input.referrer); if(/^https?:$/.test(u.protocol))referrer=u.hostname; }catch{}
 const cf=request.cf??{};
 return {source:short(input.source),medium:short(input.medium),campaign:short(input.campaign),referrer,landing:typeof input.landing==='string'&&input.landing.startsWith('/')?input.landing.split('?')[0].slice(0,200):'/',country:short(cf.country,2),region:short(cf.region,80),device:/mobile|android|iphone/i.test(request.headers.get('user-agent')??'')?'mobile':'desktop'};
}
function event(env,player,kind,id,extra={}) {
 const occurredAt=Date.now();
 return {id,player,kind,occurredAt,day:new Date(occurredAt).toISOString().slice(0,10),environment:env.TRAFFIC_ENV==='production'?'production':'preview',...extra};
}
function enqueue(db,e) {return db.prepare('INSERT OR IGNORE INTO outbox (id,payload,created_at) VALUES (?,?,?)').bind(e.id,JSON.stringify(e),Date.now());}
export async function flush(env) {
 if(!env.ANALYTICS_URL||!env.ANALYTICS_SERVICE_TOKEN||!env.ANALYTICS_INGEST_TOKEN)return;
 const rows=(await env.DB.prepare('SELECT id,payload FROM outbox ORDER BY created_at LIMIT 40').all()).results;
 if(!rows.length)return;
 const response=await fetch(new URL('/ingest',env.ANALYTICS_URL),{method:'POST',headers:{'Content-Type':'application/json','OAI-Sites-Authorization':`Bearer ${env.ANALYTICS_SERVICE_TOKEN}`,'Authorization':`Bearer ${env.ANALYTICS_INGEST_TOKEN}`},body:JSON.stringify({events:rows.map(r=>JSON.parse(r.payload))}),signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error(`Analytics intake returned ${response.status}`);
 await env.DB.batch(rows.map(r=>env.DB.prepare('DELETE FROM outbox WHERE id=?').bind(r.id)));
}
async function api(request,env,ctx) {
 const url=new URL(request.url), player=playerFor(request);
 const cookie=`anagramish_player=${player}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${url.protocol==='https:'?'; Secure':''}`;
 const reply=(d,s=200)=>json(d,s,{'Set-Cookie':cookie});
 if(request.method==='POST') {
  const origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)return reply({error:'Invalid request origin.'},403);
 }
 if(request.method==='GET'&&url.pathname==='/api/config')return reply({pairCount});
 if(request.method==='GET'&&url.pathname==='/api/puzzle')return reply(puzzle(url.searchParams.get('date')));
 if(request.method!=='POST')return reply({error:'Not found.'},404);
 const input=await body(request);
 if(url.pathname==='/api/visit') {
  if(!uuid(input.id))return reply({error:'Invalid visit.'},400);
  await enqueue(env.DB,event(env,player,'visit',`visit:${player}:${new Date().toISOString().slice(0,10)}:${input.id}`,attribution(request,input.attribution))).run();
  ctx.waitUntil(flush(env).catch(error=>console.error('Analytics delivery deferred',error.message))); return reply({ok:true});
 }
 if(url.pathname==='/api/tutorial') {
  if(!uuid(input.id)||!['start','complete'].includes(input.action))return reply({error:'Invalid tutorial event.'},400);
  const kind=input.action==='start'?'tutorial_start':'tutorial_complete';
  await enqueue(env.DB,event(env,player,kind,`tutorial:${player}:${input.id}:${input.action}`,{mode:'tutorial',...attribution(request,input.attribution)})).run();
  ctx.waitUntil(flush(env).catch(error=>console.error('Analytics delivery deferred',error.message)));
  return reply({ok:true});
 }
 if(url.pathname==='/api/start') {
  if(!uuid(input.id)||!['daily','practice'].includes(input.mode)||typeof input.hard!=='boolean')return reply({error:'Invalid game.'},400);
  const existing=await env.DB.prepare('SELECT * FROM sessions WHERE id=?').bind(input.id).first();
  if(existing) {
   if(existing.player!==player)return reply({error:'This game belongs to another browser. Start again.'},403);
   if(existing.mode!==input.mode||existing.hard!==Number(input.hard)||existing.date!==(input.mode==='daily'?input.date:null))return reply({error:'Game settings changed. Start again.'},409);
   await enqueue(env.DB,event(env,player,'game_play',`play:${existing.id}:${new Date().toISOString().slice(0,10)}`,{mode:existing.mode,puzzleDate:existing.date,hard:existing.hard,...attribution(request,input.attribution)})).run();
   ctx.waitUntil(flush(env).catch(error=>console.error('Analytics delivery deferred',error.message)));
   return reply({id:existing.id,pair:JSON.parse(existing.pair),puzzleNumber:existing.puzzle_number});
  }
  const p=input.mode==='daily'?puzzle(input.date):{pair:practicePair(input.savedPair),puzzleNumber:null};
  const resumed=!!input.resumed;
  const e=event(env,player,'game_start',`start:${input.id}`,{mode:input.mode,puzzleDate:input.mode==='daily'?input.date:null,hard:Number(input.hard),resumed:Number(resumed),...attribution(request,input.attribution)});
  await env.DB.batch([
   env.DB.prepare('INSERT OR IGNORE INTO sessions (id,player,mode,date,hard,pair,puzzle_number,started_at,resumed) VALUES (?,?,?,?,?,?,?,?,?)').bind(input.id,player,input.mode,input.mode==='daily'?input.date:null,Number(input.hard),JSON.stringify(p.pair),p.puzzleNumber,Date.now(),Number(resumed)),enqueue(env.DB,e),enqueue(env.DB,{...e,id:`play:${input.id}:${e.day}`,kind:'game_play'})
  ]);
  ctx.waitUntil(flush(env).catch(error=>console.error('Analytics delivery deferred',error.message)));return reply({id:input.id,...p});
 }
 if(url.pathname==='/api/guess'||url.pathname==='/api/complete') {
  if(!uuid(input.id))return reply({error:'Invalid game.'},400);
  const s=await env.DB.prepare('SELECT * FROM sessions WHERE id=? AND player=?').bind(input.id,player).first();
  if(!s)return reply({error:'Game session expired. Return home and reopen the game.'},404);
  const complete=url.pathname==='/api/complete';
  const error=checkLadder(input.words,JSON.parse(s.pair),!!s.hard,complete);
  if(error)return reply({valid:false,message:error});
  if(!complete)return reply({valid:true});
  if(!Number.isInteger(input.seconds)||input.seconds<0||input.seconds>604800||!Number.isInteger(input.mistakes)||input.mistakes<0||input.mistakes>10000)return reply({error:'Invalid result.'},400);
  const e=event(env,player,'game_complete',`complete:${s.id}`,{mode:s.mode,puzzleDate:s.date,hard:s.hard,seconds:input.seconds,mistakes:input.mistakes,wordCount:input.words.length,resumed:s.resumed});
  // Completion and its delivery record commit together; retries cannot double-count.
  await env.DB.batch([
   env.DB.prepare('UPDATE sessions SET completed_at=?,seconds=?,mistakes=?,words=? WHERE id=? AND completed_at IS NULL').bind(Date.now(),input.seconds,input.mistakes,JSON.stringify(input.words),s.id),
   enqueue(env.DB,e)
  ]);
  ctx.waitUntil(flush(env).catch(error=>console.error('Analytics delivery deferred',error.message))); return reply({valid:true,saved:true});
 }
 return reply({error:'Not found.'},404);
}
export default {
 async fetch(request,env,ctx) {
  const path=new URL(request.url).pathname;
  try {
   if(path.startsWith('/api/'))return await api(request,env,ctx);
   // Word data stays inside the Worker bundle and is never a public asset.
   if(path==='/robots.txt' && env.TRAFFIC_ENV!=='production')return new Response('User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain; charset=utf-8','X-Robots-Tag':'noindex, nofollow'}});
   if((path.endsWith('.txt')&&path!=='/robots.txt')||path.includes('/data/')||path.includes('/server/'))return new Response('Not found',{status:404});
   const response=await env.ASSETS.fetch(request);
   const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');
   if(env.TRAFFIC_ENV!=='production')headers.set('X-Robots-Tag','noindex, nofollow');
   return new Response(response.body,{status:response.status,headers});
  } catch(error) {
   console.error('Request failed',error.name,error.message);
   return json({error:error.message?.includes('puzzle')?error.message:'Service temporarily unavailable. Your game is still saved; try again.'},503);
  }
 }
};
