// Real local Workers and D1 only; no production gameplay or feedback is sent.
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {setup} from '../scripts/local.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const frontend='http://127.0.0.1:4190',backend='http://127.0.0.1:4191',dashboard='http://127.0.0.1:4192';
const app=await setup({production:true,frontendOrigin:frontend,tutorialExperiment:'tutorial-short-v1'}),servers=[];
let browser;
try {
 for(let index=0;index<3;index++) {
  const server=createServer(async(req,res)=>{try{
   if(index===0&&req.url==='/api-config.mjs'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(`export const API_ORIGIN=${JSON.stringify(backend)};`);return;}
   const chunks=[];for await(const c of req)chunks.push(c);
   const worker=index===2?app.analytics:app.game,origin=[frontend,backend,dashboard][index];
   const response=await worker.dispatchFetch(origin+req.url,{method:req.method,headers:{...req.headers,...(index===2?{'oai-authenticated-user-email':'owner@example.test'}:{})},body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(e){console.error(e);res.writeHead(500);res.end();}});
  await new Promise(r=>server.listen(4190+index,'127.0.0.1',r));servers.push(server);
 }
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(frontend);await page.waitForFunction(()=>!document.querySelector('#practice').disabled);
 await page.screenshot({path:'/tmp/anagramish-feedback-home.png'});
 await page.getByRole('button',{name:'Feedback',exact:true}).click();
 assert.equal(await page.locator('main').isVisible(),false);assert.equal(await page.locator('#feedback-rating').isVisible(),false);
 await page.getByRole('button',{name:'Send feedback',exact:true}).click();assert.match(await page.locator('#feedback-status').textContent(),/Choose a rating/);
 await page.locator('#feedback-comment').fill('<img src=x onerror=alert(1)> Great game!');
 await page.screenshot({path:'/tmp/anagramish-feedback-form.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.getByRole('button',{name:'Send feedback',exact:true}).click();await page.getByText('Thank you! Your feedback has been sent.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Back to game',exact:true}).click();
 await page.evaluate(()=>localStorage.setItem('practice',JSON.stringify({version:2,pair:['caulk','horse'],state:'playing',numSeconds:12,words:[],mistakes:0})));
 await page.getByRole('button',{name:'Practice',exact:true}).click();await page.waitForSelector('.board .current');
 await page.getByRole('button',{name:'Feedback',exact:true}).click();
 const paused=await page.evaluate(()=>JSON.parse(localStorage.getItem('practice')).numSeconds);
 await page.locator('#feedback-comment').fill('I got stuck finding the second word.');await page.locator('[name=rating][value=hard]').check();
 await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('practice')).numSeconds),paused,'feedback pauses game time');
 await page.getByRole('button',{name:'Send feedback',exact:true}).click();await page.getByText('Thank you! Your feedback has been sent.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Back to game',exact:true}).click();
 for(const word of ['lacks','hacks','shake','share']) {await page.keyboard.type(word);await page.keyboard.press('Enter');await page.waitForFunction(w=>JSON.parse(localStorage.getItem('practice')).words.includes(w),word);}
 await page.getByText('Result saved.',{exact:true}).waitFor();
 await page.setViewportSize({width:1100,height:1100});await page.screenshot({path:'/tmp/anagramish-feedback-complete.png'});
 await page.locator('.completion-feedback [data-rating=right]').click();assert.equal(await page.locator('[name=rating][value=right]').isChecked(),true);
 // Lose the response after the real Worker has saved it. Retry must not duplicate it.
 await page.route(backend+'/api/feedback',async route=>{await route.fetch();await route.abort('failed');},{times:1});
 await page.getByRole('button',{name:'Send feedback',exact:true}).click();await page.getByRole('button',{name:'Try again',exact:true}).waitFor();
 await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByText('Thank you! Your feedback has been sent.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Back to game',exact:true}).click();
 await page.getByRole('button',{name:'Feedback',exact:true}).click();await page.locator('#feedback-comment').fill('Fourth submission is limited');await page.getByRole('button',{name:'Send feedback',exact:true}).click();await page.getByText(/Please wait 24 hours/).waitFor();assert.equal(await page.locator('#feedback-comment').inputValue(),'Fourth submission is limited');await page.keyboard.press('Escape');assert.equal(await page.locator('#feedback-panel').isVisible(),false);
 const admin=await browser.newPage({viewport:{width:1280,height:1000}});admin.on('pageerror',e=>errors.push(e.message));let feedbackRequests=0;admin.on('request',r=>{if(r.url().includes('/api/feedback'))feedbackRequests++;});
 await admin.goto(dashboard);await admin.selectOption('#environment','production');await admin.waitForFunction(()=>document.querySelector('#notice').textContent.startsWith('Production traffic'));
 assert.equal(feedbackRequests,0,'ordinary dashboard loads do not query feedback');
 await admin.getByRole('button',{name:'Load feedback',exact:true}).click();await admin.getByText('3 submissions loaded.',{exact:true}).waitFor();
 assert.equal(await admin.locator('#feedback-list article').count(),3);assert.equal(await admin.locator('#feedback-list img').count(),0,'comments render as text, never HTML');
 assert.match(await admin.locator('#feedback-list').textContent(),/First-day player/);assert.match(await admin.locator('#feedback-list').textContent(),/No game started yet/);assert.match(await admin.locator('#feedback-list').textContent(),/Finished/);
 await admin.locator('#feedback-list').screenshot({path:'/tmp/anagramish-feedback-dashboard.png'});
 const downloadEvent=admin.waitForEvent('download');await admin.getByRole('button',{name:'Download loaded feedback',exact:true}).click();const download=await downloadEvent;assert.match(download.suggestedFilename(),/anagramish-feedback-production/);
 await admin.selectOption('#environment','preview');await admin.waitForFunction(()=>document.querySelector('#notice').textContent.startsWith('Preview activity'));assert.equal(await admin.locator('#feedback-list article').count(),0);
 await admin.getByRole('button',{name:'Load feedback',exact:true}).click();await admin.getByText('No feedback in this period yet.',{exact:true}).waitFor();
 // A separate newcomer can give feedback during either assigned tutorial.
 const learner=await browser.newPage({viewport:{width:320,height:720}});learner.on('pageerror',e=>errors.push(e.message));await learner.goto(frontend);await learner.waitForFunction(()=>!document.querySelector('#practice').disabled);await learner.getByRole('button',{name:'Tutorial',exact:true}).click();await learner.getByRole('button',{name:'Feedback',exact:true}).click();await learner.locator('#feedback-comment').fill('Tutorial comment');await learner.getByRole('button',{name:'Send feedback',exact:true}).click();await learner.getByText('Thank you! Your feedback has been sent.',{exact:true}).waitFor();
 assert.equal(await learner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 for(let n=0;n<30;n++){const row=await app.analyticsDb.prepare('SELECT tutorial_variant,player_type FROM feedback WHERE comment=?').bind('Tutorial comment').first();if(row){assert.ok(['control','short'].includes(row.tutorial_variant));assert.equal(row.player_type,'not_yet_played');break;}if(n===29)throw Error('Tutorial feedback missing');await new Promise(r=>setTimeout(r,50));}
 assert.deepEqual(errors,[]);
 console.log('Feedback browser passed: mobile/header/completion/tutorial, pause/resume, response-loss retry, quota error, protected dashboard, safe comments, downloads and environment isolation.');
} finally {await browser?.close();await Promise.all(servers.map(s=>new Promise(r=>s.close(r))));await app.dispose();}
