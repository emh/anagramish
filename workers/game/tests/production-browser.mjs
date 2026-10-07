import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {setup} from '../scripts/local.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const frontend='http://127.0.0.1:4180',backend='http://127.0.0.1:4181';
const app=await setup({production:true,frontendOrigin:frontend});
const servers=[];
let browser;
try {
    servers.push(createServer(async(req,res)=>{
        try {
            if(req.url==='/api-config.mjs'){
                res.writeHead(200,{'Content-Type':'text/javascript'});res.end(`export const API_ORIGIN=${JSON.stringify(backend)};`);return;
            }
            const response=await app.game.dispatchFetch(frontend+req.url,{headers:req.headers});
            res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
        }catch{res.writeHead(500);res.end();}
    }));
    servers.push(createServer(async(req,res)=>{
        try {
            const chunks=[];for await(const chunk of req)chunks.push(chunk);
            const response=await app.game.dispatchFetch(backend+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
            res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
        }catch{res.writeHead(500);res.end();}
    }));
    await Promise.all(servers.map((server,index)=>new Promise(resolve=>server.listen(4180+index,'127.0.0.1',resolve))));
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    const context=await browser.newContext();
    const page=await context.newPage(),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(r.url().startsWith(backend))requests.push(r);});
    await page.goto(frontend);
    await page.getByRole('button',{name:'Practice',exact:true}).waitFor();
    await page.evaluate(()=>localStorage.setItem('practice',JSON.stringify({version:2,pair:['caulk','horse'],state:'playing',numSeconds:12,words:[],mistakes:0})));
    await page.getByRole('button',{name:'Practice',exact:true}).click();
    await page.waitForSelector('.board .current');
    await page.keyboard.type('lacks');await page.keyboard.press('Enter');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('practice')).words.length===1);
    const saved=await page.evaluate(()=>({id:JSON.parse(localStorage.getItem('practice')).apiId,player:localStorage.getItem('anagramish-player-token').split('.')[0]}));
    await context.clearCookies();await page.reload();
    await page.getByRole('button',{name:'Practice',exact:true}).click();await page.waitForSelector('.board .current');
    assert.deepEqual(await page.evaluate(()=>({id:JSON.parse(localStorage.getItem('practice')).apiId,player:localStorage.getItem('anagramish-player-token').split('.')[0]})),saved);
    for(const word of ['hacks','shake','share']){
        await page.keyboard.type(word);await page.keyboard.press('Enter');
        await page.waitForFunction(w=>JSON.parse(localStorage.getItem('practice')).words.includes(w),word);
    }
    await page.getByText('Result saved.',{exact:true}).waitFor();
    assert.equal((await context.cookies()).length,0);
    assert.ok(requests.some(r=>r.url().endsWith('/api/complete')&&r.headers().authorization?.startsWith('Bearer ')));
    assert.equal(requests.some(r=>r.headers().cookie),false);
    assert.deepEqual(errors,[]);
    console.log('Production browser passed: real cross-origin requests, cookie-free identity, saved-session reload and completed game.');
} finally {
    await browser?.close();
    await Promise.all(servers.map(server=>new Promise(resolve=>server.close(resolve))));
    await app.dispose();
}
