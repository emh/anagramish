import assert from 'node:assert/strict';

export async function run(page, baseURL = 'http://127.0.0.1:4173') {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const cell = (y, x) => page.locator(`.board.interactive .cell[data-y="${y}"][data-x="${x}"]`);
    const word = y => page.locator(`.board.interactive .cell[data-y="${y}"]`).allTextContents().then(letters => letters.join(''));
    const seed = async (hard = false) => {
        await page.goto(baseURL);
        await page.waitForFunction(() => document.querySelector('#practice') && !document.querySelector('#practice').disabled);
        await page.evaluate(hard => {
            localStorage.setItem('hard-mode', String(hard));
            localStorage.setItem('practice', JSON.stringify({version: 2, pair: ['caulk', 'horse'], state: 'playing', numSeconds: 0, words: [], mistakes: 0}));
        }, hard);
        await page.reload();
        await page.getByRole('button', {name: 'Practice', exact: true}).click();
        await page.waitForSelector('.board.interactive');
    };
    const drag = async (from, to) => {
        const a = await from.boundingBox(), b = await to.boundingBox();
        await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
        await page.mouse.down();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, {steps: 10});
        assert.equal(await to.evaluate(el => el.classList.contains('drop-target')), true);
        assert.ok(await page.locator('.flying-tile').count() > 0);
        await page.mouse.up();
        await page.waitForTimeout(600);
    };

    await page.setViewportSize({width: 1100, height: 850});
    await seed();
    await page.keyboard.press('l');
    assert.ok(await page.locator('.key[data-key="l"]').evaluate(el => el.getAnimations().length) > 0);
    assert.ok(await page.locator('.flying-tile').count() > 0);
    await page.keyboard.type('acks', {delay: 25});
    assert.equal(await word(1), 'lacks');
    await page.waitForTimeout(600);
    await cell(1, 0).click();
    await page.waitForTimeout(200);
    const before = await cell(1, 0).boundingBox();
    await cell(1, 0).hover();
    assert.deepEqual(await cell(1, 0).boundingBox(), before, 'Hover must not move or resize selection');
    assert.equal(await cell(1, 0).evaluate(el => getComputedStyle(el).outlineStyle), 'none');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.current')?.dataset.y === '2');
    await page.locator('.key[data-key="h"]').click();
    await page.keyboard.type('acks');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.current')?.dataset.y === '3');
    for (const [entry, next] of [['shake', '4'], ['share', null]]) {
        await page.keyboard.type(entry);
        await page.keyboard.press('Enter');
        if (next) await page.waitForFunction(y => document.querySelector('.current')?.dataset.y === y, next);
    }
    await page.getByText('Result saved.', {exact: true}).waitFor();
    assert.equal(await page.locator('.flying-tile').count(), 0);

    await seed();
    await drag(cell(0, 0), cell(1, 3));
    assert.equal(await word(1), 'c');
    assert.equal(await cell(1, 3).textContent(), 'c');
    assert.equal(await cell(0, 0).textContent(), 'c');
    await cell(0, 1).click();
    assert.equal(await cell(1, 4).textContent(), 'a');
    await cell(1, 1).click();
    await page.keyboard.press('l');
    await page.waitForTimeout(600);
    await drag(cell(1, 3), cell(1, 1));
    assert.equal(await cell(1, 1).textContent(), 'c');
    assert.equal(await cell(1, 3).textContent(), 'l');
    await drag(cell(1, 4), cell(1, 0));
    assert.equal(await cell(1, 0).textContent(), 'a');
    assert.equal(await cell(1, 4).textContent(), '');
    const draft = await word(1), source = await cell(1, 0).boundingBox();
    await page.mouse.move(source.x + 20, source.y + 20);
    await page.mouse.down();
    await page.mouse.move(20, 75, {steps: 10});
    await page.mouse.up();
    assert.equal(await word(1), draft);
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.flying-tile').count(), 0);
    await page.mouse.move(source.x + 20, source.y + 20);
    await page.mouse.down();
    await page.mouse.move(source.x + 70, source.y + 70, {steps: 10});
    await page.keyboard.press('Escape');
    await page.mouse.up();
    assert.equal(await word(1), draft);
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.flying-tile').count(), 0);

    await seed(true);
    assert.equal(await page.locator('.key[data-key="z"]').isDisabled(), true);
    await page.keyboard.press('z');
    assert.equal(await word(1), '');
    await page.keyboard.type('lacks');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.current')?.dataset.y === '2');
    const deleteButton = page.getByRole('button', {name: 'Delete previous word'});
    const row = await cell(1, 4).boundingBox(), button = await deleteButton.boundingBox();
    assert.ok(Math.abs(row.y + row.height / 2 - button.y - button.height / 2) < 2);
    await page.keyboard.type('ha');
    await deleteButton.click();
    assert.equal(await word(1), '');
    assert.equal(await page.locator('.current').getAttribute('data-x'), '0');

    await page.waitForTimeout(250);
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.keyboard.press('l');
    assert.equal(await page.locator('.flying-tile').count(), 0);
    assert.equal(await page.locator('.key[data-key="l"]').evaluate(el => el.getAnimations().length), 0);
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await page.setViewportSize({width: 320, height: 568});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.ok(await page.locator('footer').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight));
    assert.deepEqual(errors, []);
    return 'Passed typing, tap placement, selection, completion, drag/copy/swap, cancellation, hard mode, undo, reduced motion and mobile layout.';
}

// Run directly with the same Playwright settings as the other browser checks.
if (process.argv[1]?.endsWith('/interactions-browser.mjs')) {
    const {createRequire} = await import('node:module');
    const require = createRequire(import.meta.url);
    const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
    const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true});
    try { console.log(await run(await browser.newPage(), process.env.BASE_URL)); }
    finally { await browser.close(); }
}
