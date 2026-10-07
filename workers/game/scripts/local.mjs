import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
export async function migrate(mf,dir) {
 const db=await mf.getD1Database('DB');
 for(const file of (await readdir(join(dir,'drizzle'))).filter(f=>f.endsWith('.sql')).sort()) {
  const sql=await readFile(join(dir,'drizzle',file),'utf8');
  for(const statement of sql.split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(statement).run();
 }
 return db;
}
export async function setup({production=false,frontendOrigin='https://anagramish.com'}={}) {
 const analyticsDir=resolve('../analytics');
 const analytics=new Miniflare({modulesRoot:analyticsDir,modules:true,scriptPath:join(analyticsDir,'dist/server/index.js'),compatibilityDate:'2026-08-01',d1Databases:['DB'],bindings:{AUTH_MODE:'sites',ADMIN_EMAIL:'owner@example.test',INGEST_TOKEN:'local-intake-token'},cf:false});
 const analyticsDb=await migrate(analytics,analyticsDir);
 const game=new Miniflare({modules:true,scriptPath:resolve('dist/server/index.js'),compatibilityDate:'2026-08-01',d1Databases:['DB'],bindings:{TRAFFIC_ENV:production?'production':'preview',FRONTEND_ORIGIN:production?frontendOrigin:'',PLAYER_SIGNING_KEY:'test-only-signing-key-at-least-32-characters',ANALYTICS_URL:'https://analytics.test',ANALYTICS_SERVICE_TOKEN:'local-service-token',ANALYTICS_INGEST_TOKEN:'local-intake-token'},serviceBindings:{...(production?{ANALYTICS:async request=>analytics.dispatchFetch(request.url,{method:request.method,headers:request.headers,body:await request.arrayBuffer()})}:{}),ASSETS:async request=>{
  const path=new URL(request.url).pathname;const file=path==='/'?'index.html':path.slice(1);
  if(!/^[a-zA-Z0-9._/-]+$/.test(file)||file.includes('..'))return new Response('Not found',{status:404});
  try {const data=await readFile(resolve('dist/client',file));const ext=file.split('.').pop();return new Response(data,{headers:{'Content-Type':{html:'text/html',mjs:'text/javascript',js:'text/javascript',css:'text/css',svg:'image/svg+xml',png:'image/png',xml:'application/xml',txt:'text/plain'}[ext]??'application/octet-stream'}});}catch{return new Response('Not found',{status:404})}
 }},outboundService:async request=>analytics.dispatchFetch(request.url,{method:request.method,headers:request.headers,body:await request.arrayBuffer()}),cf:false});
 const gameDb=await migrate(game,process.cwd());
 return {game,analytics,gameDb,analyticsDb,dispose:()=>Promise.all([game.dispose(),analytics.dispose()])};
}
