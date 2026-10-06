const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const gameCalls=[];page.on('request',r=>{if(/\/api\/(start|guess|complete)$/.test(r.url()))gameCalls.push(r.url())});
 await page.goto('http://127.0.0.1:4173');
 await page.evaluate(()=>{localStorage.setItem('hard-mode','true');localStorage.setItem('practice',JSON.stringify({version:2,pair:['caulk','horse'],state:'playing',numSeconds:12,words:['lacks'],mistakes:0}));localStorage.setItem('history',JSON.stringify({'2026-10-05':{version:2,pair:['caulk','horse'],state:'playing',numSeconds:9,words:[],mistakes:0}}));});
 await page.reload();const saved=await page.evaluate(()=>({history:localStorage.getItem('history'),practice:localStorage.getItem('practice')}));
 await page.getByRole('button',{name:'Learn to play',exact:true}).click();
 assert.equal(await page.locator('.board .cell').count(),12);
 await page.keyboard.type('act');await page.keyboard.press('Enter');await page.getByText(/Moving the same letters/).waitFor();
 for(const key of ['c','o','t'])await page.locator(`.key[data-key="${key}"]`).click();
 await page.keyboard.press('Enter');await page.getByText('Now type DOT.',{exact:false}).waitFor();
 await page.screenshot({path:'/tmp/anagramish-tutorial-mobile.png',fullPage:true});
 await page.keyboard.type('dot');await page.keyboard.press('Enter');await page.getByRole('button',{name:'Next lesson'}).click();
 await page.keyboard.type('tar');await page.keyboard.press('Enter');await page.getByRole('button',{name:'Next lesson'}).click();
 assert.equal(await page.locator('.board .cell').count(),20);
 await page.getByRole('button',{name:'Show hint',exact:true}).click();await page.getByText('Change L to R: CORD.',{exact:true}).waitFor();
 for(const word of ['cord','card','ward']){await page.keyboard.type(word);await page.keyboard.press('Enter');}
 await page.getByRole('button',{name:'Play today’s puzzle',exact:true}).waitFor();
 assert.deepEqual(await page.evaluate(()=>({history:localStorage.getItem('history'),practice:localStorage.getItem('practice')})),saved);
 assert.equal(await page.evaluate(()=>localStorage.getItem('hard-mode')),'true');
 assert.equal(await page.evaluate(()=>localStorage.getItem('anagramish-tutorial-completed')),'true');
 assert.deepEqual(gameCalls,[]);
 await page.getByRole('button',{name:'Replay tutorial',exact:true}).click();await page.getByRole('button',{name:'Skip tutorial',exact:true}).click();
 await page.getByRole('button',{name:'Replay tutorial',exact:true}).click();
 for(const word of ['cot','dot']){await page.keyboard.type(word);await page.keyboard.press('Enter')}
 await page.getByRole('button',{name:'Next lesson'}).click();await page.keyboard.type('tar');await page.keyboard.press('Enter');await page.getByRole('button',{name:'Next lesson'}).click();
 for(const word of ['cord','card','ward']){await page.keyboard.type(word);await page.keyboard.press('Enter')}
 await page.getByRole('button',{name:'Play today’s puzzle',exact:true}).click();await page.waitForSelector('.board .current');
 assert.equal(await page.locator('.board .cell').count(),30);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const offline=await browser.newPage();offline.on('pageerror',e=>errors.push(e.message));await offline.route('**/api/**',r=>r.abort());await offline.goto('http://127.0.0.1:4173');await offline.getByRole('button',{name:'Learn to play'}).click();await offline.keyboard.type('cot');await offline.keyboard.press('Enter');await offline.getByText('Now type DOT.',{exact:false}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('Tutorial browser passed: three lessons, physical/touch input, reordering rule, hints, skip/replay, saved-game isolation, hard-mode preservation, daily handoff, and offline use.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
