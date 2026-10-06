import {createServer} from 'node:http';
import {setup} from './local.mjs';
const app=await setup();
function serve(mf,port,admin=false){return createServer(async(req,res)=>{try{const headers=new Headers(req.headers);if(admin)headers.set('oai-authenticated-user-email','owner@example.test');const chunks=[];for await(const c of req)chunks.push(c);const response=await mf.dispatchFetch(`http://127.0.0.1:${port}${req.url}`,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500);res.end(e.message)}}).listen(port,'127.0.0.1')}
const servers=[serve(app.game,4173),serve(app.analytics,4174,true)];
console.log('Local game: http://127.0.0.1:4173 · local test dashboard: http://127.0.0.1:4174');
process.on('SIGINT',async()=>{servers.forEach(s=>s.close());await app.dispose();process.exit()});
