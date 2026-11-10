// Exercise the real frontend with a mocked API; no production traffic is sent.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {readFile}=require('node:fs/promises');
const {resolve,extname}=require('node:path');
const assert=require('node:assert/strict');
const root=resolve(__dirname,'../../..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
  for(const variant of ['control','short']) {
   const page=await browser.newPage({viewport:{width:390,height:844}}),events=[],games=[],errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/api/config')return route.fulfill({json:{pairCount:100,trafficEnvironment:'production',tutorialExperiment:{id:'tutorial-short-v1',variant}}});
    if(url.pathname==='/api/tutorial'){events.push(route.request().postDataJSON());return route.fulfill({json:{ok:true}});}
    if(url.pathname==='/api/visit')return route.fulfill({json:{ok:true}});
    if(url.pathname==='/api/start'){const b=route.request().postDataJSON();games.push(b);return route.fulfill({json:{id:b.id,pair:['caulk','horse'],puzzleNumber:1}});}
    if(url.pathname==='/api-config.mjs')return route.fulfill({contentType:'text/javascript',body:"export const API_ORIGIN='';"});
    const file=resolve(root,url.pathname==='/'?'index.html':url.pathname.slice(1));
    if(!file.startsWith(root+'/'))return route.abort();
    try{return route.fulfill({body:await readFile(file),contentType:{'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'}[extname(file)]||'text/plain'});}catch{return route.fulfill({status:404,body:'Not found'});}
   });
   await page.goto('http://127.0.0.1:4173/');
   await page.waitForFunction(()=>!document.querySelector('#play').disabled);
   await page.evaluate(()=>{localStorage.setItem('hard-mode','true');localStorage.setItem('practice',JSON.stringify({version:2,pair:['caulk','horse'],state:'playing',numSeconds:12,words:['lacks'],mistakes:0}));});
   const saved=await page.evaluate(()=>localStorage.getItem('practice'));
   await page.getByRole('button',{name:'Tutorial',exact:true}).click();
   assert.equal(await page.locator('.board .cell').count(),variant==='short'?9:12);
   await page.keyboard.type('act');await page.keyboard.press('Enter');await page.getByText(/Moving the same letters/).waitFor();
   const lessons=variant==='short'?[['tar']]:[['cot','dot'],['tar'],['cord','card','ward']];
   for(let i=0;i<lessons.length;i++){
    for(const word of lessons[i]){await page.keyboard.type(word);await page.keyboard.press('Enter');}
    if(i<lessons.length-1)await page.getByRole('button',{name:'Next lesson',exact:true}).click();
   }
   await page.getByRole('button',{name:'Play today’s puzzle',exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>localStorage.getItem('practice')),saved);
   assert.equal(await page.evaluate(()=>localStorage.getItem('hard-mode')),'true');
   assert.equal(games.length,0);
   for(let i=0;i<30&&!events.some(e=>e.action==='complete');i++)await page.waitForTimeout(50);
   assert.equal(events.filter(e=>e.action==='start').length,1);
   assert.equal(events.filter(e=>e.action==='complete').length,1);
   assert.ok(events.every(e=>e.experiment==='tutorial-short-v1'&&e.variant===variant));
   assert.equal(events.filter(e=>e.action==='lesson_complete').length,lessons.length);
   await page.screenshot({path:`/tmp/anagramish-tutorial-${variant}.png`,fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.getByRole('button',{name:'Play today’s puzzle',exact:true}).click();
   await page.waitForSelector('.board .current');assert.equal(await page.locator('.board .cell').count(),30);
   assert.equal(games.length,1);assert.equal(games[0].mode,'daily');
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('A/B browser checks passed: both complete paths, rule feedback, stable tags, mobile layout, saved-game isolation, and the same daily handoff.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
