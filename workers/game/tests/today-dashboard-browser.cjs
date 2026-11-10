// Local fixture only: never sends gameplay or report requests to production.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {readFile}=require('node:fs/promises');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const {summarize,aggregate}=await import('../../analytics/server/daily-summary.mjs');
 const root=resolve(__dirname,'../../..'),now=Date.now(),day=new Date(now).toISOString().slice(0,10),events=[];
 const id=n=>`${String(n).padStart(8,'0')}-0000-0000-0000-000000000000`;
 for(let i=1;i<=12;i++){
  const common={player:id(i),occurred_at:now-10000+i,day,mode:i<=9?'daily':'practice',hard:0,resumed:0,puzzle_date:i<=9?day:null};
  events.push({...common,id:'visit:'+id(i),kind:'visit'},
   {...common,id:'start:'+id(i),kind:'game_start'},
   {...common,id:'play:'+id(i)+':'+day,kind:'game_play',source:i<=9?'playlin':'google',medium:i<=9?null:'organic',campaign:'sample',country:i<=9?'CA':'US',region:i<=9?'British Columbia':'California'});
  if(i<=5)events.push({...common,id:'complete:'+id(i),kind:'game_complete',seconds:100+i});
 }
 const yesterdayAt=now-86400000,yesterday=new Date(yesterdayAt).toISOString().slice(0,10);
 const previous={player:id(99),occurred_at:yesterdayAt,day:yesterday,mode:'daily',hard:0,resumed:0,puzzle_date:yesterday};
 events.push({...previous,id:'visit:'+id(99),kind:'visit'},{...previous,id:'start:'+id(99),kind:'game_start'},{...previous,id:'play:'+id(99)+':'+yesterday,kind:'game_play',source:'yesterday-source'},{...previous,id:'complete:'+id(99),kind:'game_complete',seconds:30});
 events.push({player:id(100),id:'visit:'+id(100),kind:'visit',occurred_at:now-3*86400000,day:new Date(now-3*86400000).toISOString().slice(0,10)});
 let legacy=false,empty=false,reportRequests=0,feedbackRequests=0;
 const html=(await readFile(resolve(root,'workers/analytics/server/dashboard.html'),'utf8')).replace('<option value="production">','<option value="production" selected>');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/api/feedback'){feedbackRequests++;return route.fulfill({json:{items:[],next_cursor:null}});}
   if(url.pathname==='/api/report'){
    reportRequests++;
    const environment=url.searchParams.get('environment'),d=aggregate(summarize(empty||environment==='preview'?[]:events),{environment,days:Number(url.searchParams.get('days')),now});
    d.today_overview.feedback_count=empty||environment==='preview'?0:3;d.yesterday_overview.feedback_count=empty||environment==='preview'?0:1;
    d.cache={updated_at:now,catching_up:false};if(legacy){delete d.today_overview;delete d.coverage;}
    return route.fulfill({json:d});
   }
   return route.fulfill({contentType:'text/html',body:html});
  });
  await page.goto('http://127.0.0.1:4173/');await page.locator('#report:not([hidden])').waitFor();
  assert.equal(await page.locator('#today-players').textContent(),'9');assert.equal(await page.locator('#today-completions').textContent(),'5');assert.equal(await page.locator('#today-feedback').textContent(),'3');
  assert.equal(await page.locator('#today-sources tbody tr').count(),1);
  await page.selectOption('#days','7');await page.waitForFunction(()=>document.querySelector('#period-title').textContent.includes('7 days'));
  assert.equal(await page.locator('#today-players').textContent(),'9');
  assert.equal(await page.locator('#average').textContent(),'0.3');assert.match(await page.locator('#average-days').textContent(),/3 completed tracked UTC days/);
  await page.selectOption('#days','90');await page.waitForFunction(()=>document.querySelector('#period-title').textContent.includes('90 days'));
  assert.equal(await page.locator('#average').textContent(),'0.3');assert.equal(await page.locator('#chart .chart-day').count(),4,'no pre-tracking zero bars');
  const prior=page.locator('#chart .chart-day[data-day="'+yesterday+'"]');
  await prior.hover();await page.locator('#chart-tooltip:not([hidden])').waitFor();
  assert.match(await page.locator('#chart-tooltip').textContent(),/1 players/);assert.match(await page.locator('#chart-tooltip').textContent(),/1 games started · 1 finished/);
  await prior.focus();await page.keyboard.press('ArrowRight');assert.match(await page.locator('#chart-tooltip').textContent(),/In progress · excluded from average/);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#chart-tooltip').isVisible(),false);
  const gap=page.locator('#chart .chart-day').nth(1);await gap.hover();assert.match(await page.locator('#chart-tooltip').textContent(),/0 players/);
  await page.locator('#chart').screenshot({path:'/tmp/anagramish-chart-hover.png'});
  await page.selectOption('#days','7');await page.waitForFunction(()=>document.querySelector('#period-title').textContent.includes('7 days'));
  await page.locator('.daily-feedback a').click();assert.equal(feedbackRequests,0,'count and link do not load comments');
  const beforeSwitch=reportRequests;
  await page.selectOption('#overview-day','yesterday');
  assert.equal(await page.locator('#today-players').textContent(),'1');assert.equal(await page.locator('#today-feedback').textContent(),'1');
  assert.match(await page.locator('#today-title').textContent(),new RegExp(yesterday));
  assert.match(await page.locator('#today-sources').textContent(),/yesterday-source/);
  assert.match(await page.locator('#overview-badge').textContent(),/Completed day/);
  await page.selectOption('#overview-day','today');
  assert.equal(await page.locator('#today-players').textContent(),'9');assert.equal(reportRequests,beforeSwitch,'day switching reads the same cached response');assert.equal(await page.locator('#today-feedback').textContent(),'3');
  const download=page.waitForEvent('download');await page.click('#download-json');
  const file=await download,payload=JSON.parse(await readFile(await file.path(),'utf8'));
  assert.equal(payload.today_overview.daily.players,9);assert.equal(payload.today_overview.feedback_count,3);assert.equal(payload.yesterday_overview.feedback_count,1);assert.equal(payload.days,7);assert.equal(payload.coverage.completed_days,3);assert.equal(payload.coverage.average_daily_players,1/3);assert.equal(payload.yesterday_overview.daily.players,1);assert.equal(payload.today_overview.practice.players,3);
  assert.equal(await page.locator('#today-tutorials tbody tr').count(),3);
  await page.locator('#today-section').screenshot({path:'/tmp/anagramish-today-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await page.locator('#chart .chart-day').last().click();assert.equal(await page.locator('#chart-tooltip').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile page should not overflow');
  await page.locator('#today-section').screenshot({path:'/tmp/anagramish-today-mobile.png'});
  await page.selectOption('#environment','preview');await page.waitForFunction(()=>document.querySelector('#today-players').textContent==='0');
  assert.match(await page.locator('#today-sources').textContent(),/No activity/);assert.equal(await page.locator('#today-feedback').textContent(),'0');
  legacy=true;await page.click('#refresh');await page.locator('#today-pending:not([hidden])').waitFor();
  assert.equal(await page.locator('#today-content').isVisible(),false);assert.equal(await page.locator('#average').textContent(),'—');
  legacy=false;empty=true;await page.click('#refresh');await page.locator('#today-content:not([hidden])').waitFor();
  assert.equal(await page.locator('#today-time').textContent(),'—');assert.equal(await page.locator('#average').textContent(),'—');assert.equal(await page.locator('#chart .chart-day').count(),0);assert.match(await page.locator('#today-empty').textContent(),/Select Yesterday/);assert.deepEqual(errors,[]);
  console.log('Today dashboard passes desktop/mobile, period switching, preview isolation, JSON download, empty and older-cache checks.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
