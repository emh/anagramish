// Deterministic local report fixture; no production requests.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {readFile}=require('node:fs/promises');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const {aggregate,summarize}=await import('../../analytics/server/daily-summary.mjs');
 const now=Date.now(),DAY=86400000,date=at=>new Date(at).toISOString().slice(0,10),id=n=>`${String(n).padStart(8,'0')}-0000-0000-0000-000000000000`;
 let sequence=0,mode='normal',feedbackRequests=0;
 const events=[{id:'visit:'+id(9999),kind:'visit',player:id(9999),occurred_at:now-35*DAY,day:date(now-35*DAY)}];
 for(let ago=0;ago<35;ago++)for(let i=0;i<(ago===0?999:42-ago+(ago%7===0?25:0));i++)events.push({id:'play:'+id(++sequence)+':'+date(now-ago*DAY),kind:'game_play',player:id(i+1),occurred_at:now-ago*DAY,day:date(now-ago*DAY),mode:'practice',hard:0,resumed:0});
 const html=(await readFile(resolve(__dirname,'../../analytics/server/dashboard.html'),'utf8')).replace('<option value="production">','<option value="production" selected>');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let report;
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/api/feedback'){feedbackRequests++;return route.fulfill({json:{items:[],next_cursor:null}});}
   if(url.pathname==='/api/report'){
    const environment=url.searchParams.get('environment');
    let source=events;
    if(environment==='preview'||mode==='empty')source=[];
    if(mode==='zero')source=[events[0]];
    if(mode==='short'||mode==='one')source=[{...events[0],occurred_at:now-(mode==='short'?5:7)*DAY,day:date(now-(mode==='short'?5:7)*DAY)}];
    report=aggregate(summarize(source),{environment,days:Number(url.searchParams.get('days')),now});report.cache={updated_at:now,catching_up:false};
    if(mode==='legacy')delete report.player_trend;
    return route.fulfill({json:report});
   }
   return route.fulfill({contentType:'text/html',body:html});
  });
  const ready=()=>page.waitForFunction(()=>!document.querySelector('#report').hidden&&!document.querySelector('#refresh').disabled);
  await page.goto('http://127.0.0.1:4173/');await ready();
  await page.locator('#trend-chart .trend-day').last().waitFor();
  const last=report.player_trend.points.at(-1),latest=last.average_daily_players.toFixed(1);
  assert.equal(await page.locator('#trend-average').textContent(),latest);assert.ok(Number(latest)<100,'today spike excluded');
  assert.equal(await page.locator('#trend-chart .trend-day').count(),27);assert.equal(last.day,date(now-DAY));
  await page.locator('#trend-chart .trend-day').last().hover();await page.locator('#trend-tooltip:not([hidden])').waitFor();
  assert.match(await page.locator('#trend-tooltip').textContent(),new RegExp(last.window_from));assert.match(await page.locator('#trend-tooltip').textContent(),new RegExp(latest+' players / day'));
  await page.locator('[aria-labelledby="trend-title"]').screenshot({path:'/tmp/anagramish-trend-desktop.png'});
  await page.locator('#trend-chart .trend-day').first().focus();await page.keyboard.press('ArrowRight');assert.match(await page.locator('#trend-tooltip').textContent(),new RegExp(report.player_trend.points[1].day));
  await page.keyboard.press('Escape');assert.equal(await page.locator('#trend-tooltip').isVisible(),false);
  await page.selectOption('#days','7');await ready();assert.equal(await page.locator('#trend-chart .trend-day').count(),6);assert.equal(await page.locator('#trend-average').textContent(),latest);
  const downloadEvent=page.waitForEvent('download');await page.click('#download-json');const file=await downloadEvent,data=JSON.parse(await readFile(await file.path(),'utf8'));assert.deepEqual(data.player_trend,report.player_trend);
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>Number(document.querySelector('#trend-chart svg').getAttribute('viewBox').split(' ')[2])===Math.max(280,document.querySelector('#trend-chart').clientWidth));
  await page.locator('#trend-chart .trend-day').last().click();assert.equal(await page.locator('#trend-tooltip').isVisible(),true);
  await page.locator('[aria-labelledby="trend-title"]').screenshot({path:'/tmp/anagramish-trend-mobile.png'});
  await page.selectOption('#days','90');await ready();assert.equal(await page.locator('#trend-chart .trend-day').count(),29);assert.equal(await page.locator('#trend-average').textContent(),latest);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal page overflow');
  assert.equal(await page.locator('#trend-chart svg').evaluate(el=>Number(el.getAttribute('viewBox').split(' ')[2])===Math.max(280,el.parentNode.clientWidth)),true,'responsive width survives hidden report refresh');
  mode='zero';await page.click('#refresh');await ready();assert.equal(await page.locator('#trend-average').textContent(),'0.0');assert.ok(await page.locator('#trend-chart polyline').count());
  mode='one';await page.click('#refresh');await ready();assert.equal(await page.locator('#trend-chart .trend-day').count(),1);assert.equal(await page.locator('#trend-chart circle').count(),1);
  mode='short';await page.click('#refresh');await ready();assert.equal(await page.locator('#trend-average').textContent(),'—');assert.equal(await page.locator('#trend-chart .trend-day').count(),0);assert.match(await page.locator('#trend-note').textContent(),/5 of 7/);
  mode='legacy';await page.click('#refresh');await ready();assert.match(await page.locator('#trend-note').textContent(),/next summary update/);
  mode='normal';await page.selectOption('#environment','preview');await ready();assert.equal(await page.locator('#trend-average').textContent(),'—');assert.match(await page.locator('#trend-note').textContent(),/0 of 7/);
  assert.equal(feedbackRequests,0);assert.deepEqual(errors,[]);
  console.log('Player trend browser passed: desktop/mobile, tooltips, keyboard/tap, period consistency, export, zero/single-point/short/legacy reports and no additional requests.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
