import assert from 'node:assert/strict';

export async function run(page, baseURL = 'http://127.0.0.1:4173') {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async text => {window.copiedShare = text;}}});
        Object.defineProperty(navigator, 'canShare', {configurable: true, value: () => window.useNativeShare === true});
        Object.defineProperty(navigator, 'share', {configurable: true, value: async data => {window.nativeShare = data.text;}});
    });
    await page.goto(baseURL);
    await page.waitForFunction(() => document.querySelector('#play')?.disabled === false);
    const seed = async ({legacy = false, hard = false, words = ['lacks', 'hacks', 'shake', 'share']} = {}) => {
        await page.evaluate(({legacy, hard, words}) => {
            const d = new Date();
            const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const game = {pair: ['caulk', 'horse'], puzzleNumber: 73, numSeconds: 42, mistakes: 0};
            Object.assign(game, legacy ? {finished: true, words: ['caulk', ...words, 'horse']}
                : {version: 2, state: 'finished', words});
            localStorage.setItem('history', JSON.stringify({[date]: game}));
            localStorage.setItem('hard-mode', String(hard));
        }, {legacy, hard, words});
        await page.reload();
        await page.waitForFunction(() => document.querySelector('#play')?.disabled === false);
        await page.getByRole('button', {name: 'Play', exact: true}).click();
        await page.locator('#style-rating').waitFor();
    };

    await seed();
    assert.equal(await page.locator('#style-rating').textContent(), '💅💅');
    assert.equal(await page.locator('.stats').getByText('Style:', {exact: true}).count(), 1);
    assert.equal(await page.locator('#style-rating').getAttribute('aria-label'), '2 out of 5 for style');
    await page.getByRole('button', {name: 'Copy', exact: true}).click();
    const copied = await page.evaluate(() => window.copiedShare);
    assert.match(copied, /^Anagramish \d{4}\.\d{2}\.\d{2}\n#73 in 00:42\n/);
    assert.deepEqual(copied.split('\n').slice(2, -1), ['🟦🟦🟦🟦🟧', '🟧🟦🟦🟦🟧', '🟧🟧🟦🟦🟧', '🟧🟧🟦🟧🟧']);
    assert.equal(copied.split('\n').at(-1), '💅💅');
    await page.evaluate(() => {window.copiedShare = null;});
    await page.getByRole('button', {name: 'Share', exact: true}).click();
    assert.equal(await page.evaluate(() => window.copiedShare), copied);
    await page.evaluate(() => {window.useNativeShare = true;});
    await page.getByRole('button', {name: 'Share', exact: true}).click();
    assert.equal(await page.evaluate(() => window.nativeShare), copied);

    await seed({legacy: true, hard: true});
    assert.equal(await page.locator('#style-rating').textContent(), '💅💅');
    await page.getByRole('button', {name: 'Copy', exact: true}).click();
    const hardShare = await page.evaluate(() => window.copiedShare);
    assert.match(hardShare, /#73 in 00:42 💪\n/);
    assert.equal(hardShare.split('\n').at(-1), '💅💅');

    await seed({words: ['lacks', 'hacks', 'shack', 'shake', 'share']});
    const longerScore = await page.locator('#style-rating').textContent();
    assert.equal(await page.locator('.board .cell').count(), 35);
    await page.getByRole('button', {name: 'Copy', exact: true}).click();
    const longerShare = await page.evaluate(() => window.copiedShare);
    assert.equal(longerShare.split('\n').at(-1), longerScore);
    assert.equal(longerShare.split('\n').length, 8);

    // Complete a real practice ladder to exercise the live finish transition.
    await page.getByRole('button', {name: 'Home', exact: true}).click();
    await page.evaluate(() => localStorage.setItem('practice', JSON.stringify({version: 2, pair: ['caulk', 'horse'], state: 'playing', numSeconds: 0, words: [], mistakes: 0})));
    await page.getByRole('button', {name: 'Practice', exact: true}).click();
    await page.waitForSelector('.board.interactive');
    for (const [i, word] of ['lacks', 'hacks', 'shake', 'share'].entries()) {
        await page.keyboard.type(word);
        await page.keyboard.press('Enter');
        if (i < 3) await page.waitForFunction(y => document.querySelector('.current')?.dataset.y === String(y), i + 2);
    }
    await page.locator('#style-rating').waitFor();
    assert.equal(await page.locator('#style-rating').textContent(), '💅💅');
    assert.equal(await page.locator('#share').isVisible(), false);
    assert.equal(await page.locator('#copy').isVisible(), false);

    await seed();
    for (const width of [320, 390, 1100]) {
        await page.setViewportSize({width, height: 844});
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.equal(await page.locator('#style-rating').isVisible(), true);
    }
    assert.deepEqual(errors, []);
    return 'Passed final-screen emoji ratings, copy, native share, share fallback, legacy saves, hard mode, longer boards, practice completion, and mobile layout.';
}

if (process.argv[1]?.endsWith('/style-share-browser.mjs')) {
    const {createRequire} = await import('node:module');
    const require = createRequire(import.meta.url);
    const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
    const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true});
    try {console.log(await run(await browser.newPage(), process.env.BASE_URL));}
    finally {await browser.close();}
}
