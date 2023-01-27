'use strict';

import pairsFile from './pairs.txt';
import dictFile from './dictionary.txt';

import { compareWords, isLetter } from './words.mjs';

const loadFile = (file) => fetch(file).then((response) => response.text()).then((text) => text.split('\n'));

const key = () => new Date().toLocaleDateString("en-CA");

const getHistory = () => JSON.parse(localStorage.getItem('history')) ?? {};

const putHistory = (history) => localStorage.setItem('history', JSON.stringify(history));

const isEmpty = (obj) => Object.keys(obj).length === 0;

const numStars = (s) => Math.max(0, 5 - Math.floor(s / 60));

const isFinished = (words) => words.every((w) => w.every((l) => l !== ' '));

function loadGame() {
    const history = getHistory();

    return history[key()];
}

function saveGame(game) {
    const history = getHistory();

    history[key()] = game;

    putHistory(history);
}

function parse(pairs) {
    return pairs.map((pair) => {
        const pieces = pair.split(',');

        return [pieces[0], pieces[1], Number(pieces[2])];
    });
}

const countForLevel = (level) => level === 0 ? 10000 : Math.pow(2, 9 - level) * 10;

const checkCount = (pair, minCount, maxCount) => {
    const count = pair[2];

    return count >= minCount && count <= maxCount;
}

const calcIndex = (n) => {
    var d = Date.parse(key());

    const f = Math.PI - 3; // need a number > 0 and < 1
    const s = d.valueOf() / 1000;
    const r = (s * f) - Math.floor(s * f);
    const i = Math.floor(n * r);

    return i;
}

function choosePair(pairs, level) {
    const maxCount = countForLevel(level);
    const minCount = countForLevel(level + 1);

    const filteredPairs = pairs.filter((pair) => checkCount(pair, minCount, maxCount));
    const n = filteredPairs.length;
    const i = calcIndex(n);

    return filteredPairs[i];
}

function renderLetter(letter, classes) {
    const div = document.createElement('div');

    div.className = ['letter', ...classes].join(' ');
    div.textContent = letter;

    document.getElementById('board').appendChild(div);
}

function renderTrash(y) {
    const el = document.createElement('div');
    el.className = 'trash';
    el.textContent = '🗑️';
    el.style.left = '280px';
    el.style.top = `${y * 55 + 8}px`;

    return el;
}

function renderBoardEnter(y) {
    const el = document.createElement('div');
    el.className = 'enter';
    el.textContent = '⏎';
    el.style.left = '330px';
    el.style.top = `${y * 55}px`;

    return el;
}

function renderBoardBackspace(x, y) {
    const el = document.createElement('div');
    el.className = 'backspace';
    el.textContent = '⌫';
    el.style.left = '275px';
    el.style.top = `${y * 55}px`;

    return el;
}

function renderBoard(state) {
    const flipped = state.flipped;

    const startWord = state.words[0];
    const endWord = state.words[5];
    const board = document.getElementById('board')
        
    board.innerHTML = '';

    const words = flipped ? [...state.words].reverse() : state.words;

    words.forEach((w, y) => w.forEach((l, x) => {
        const actualY = flipped ? 5 - y : y;

        const colorClass = startWord.indexOf(l) !== -1 ? 'start' : endWord.indexOf(l) !== -1 ? 'end' : '';
        const activeClass = !state.finished && x === state.position.x && actualY === state.position.y && actualY < 5 ? 'active' : '';

        renderLetter(l, [colorClass, activeClass]);
    }));

    if (state.finished) {
        return;
    }

    if ((!flipped && state.position.y > 1) || (flipped && state.position.y < 4)) {
        const previousY = state.flipped ? state.position.y + 1 : state.position.y - 1;

        if (state.words[previousY][0] !== ' ') {
            board.append(renderTrash(state.flipped ? 5 - previousY : previousY));
        }
    }

    if (state.position.x === 5) {
        board.append(renderBoardEnter(state.flipped ? 5 - state.position.y : state.position.y));
    }

    if (state.position.x > 0) {
        board.append(renderBoardBackspace(state.position.x, state.flipped ? 5 - state.position.y : state.position.y));
    }
}

const row1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
const row2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
const row3 = ['⏎', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫'];

function renderRow(keys, letters) {
    const div = document.createElement('div');

    keys.forEach((key) => {
        const el = document.createElement('div');
        const disabled = key.length === 1 && !letters.includes(key);
        const control = key === '⌫' || key === '⏎';
        el.className = `key${disabled ? ' disabled' : ''}${control ? ' control' : ''}`;
        el.textContent = key;
        div.appendChild(el);
    })

    document.getElementById('keyboard').appendChild(div);
}

function renderFlip() {
    const div = document.createElement('div');

    div.className = 'flip';

    const el = document.createElement('div');
    el.className = `key`;
    el.textContent = 'Flip ⇵';
    div.appendChild(el);

    document.getElementById('keyboard').appendChild(div);
}

function renderKeyboard(words) {
    const letters = [...words[0], ...words[5], '⌫', '⏎'];

    document.getElementById('keyboard').innerHTML = '';

    renderFlip();

    renderRow(row1, letters);
    renderRow(row2, letters);
    renderRow(row3, letters);
}

function initWords(pair) {
    const words = [
        pair[0],
        '     ',
        '     ',
        '     ',
        '     ',
        pair[1]
    ].map((w) => w.split(''));

    return words;
}

function calculateStats(history) {
    let level = 0;
    let streak = 0;
    const keys = Object.keys(history);

    keys.sort().forEach((k) => {
        const game = history[k];

        if (!game.finished && k !== key()) {
            streak = 0;
        } else if (game.finished) {
            streak++;
        }

        if ((k !== key() && (!game.finished) || game.numSeconds >= 240) && level > 0) {
            level--;
        } else if (game.finished && game.numSeconds <= 120 && level < 9) {
            level++;
        }
    });

    return { level, streak };
}

function initTodaysGame(pairs, level) {
    const pair = choosePair(pairs, level);

    return {
        pair,
        numSeconds: 0
    };
}

function init(pairs, dict) {
    const history = getHistory();
    const { level, streak } = calculateStats(history);
    let game = loadGame();

    if (!game) {
        game = initTodaysGame(pairs, level);
        saveGame(game);
    }

    return {
        dict,
        level,
        streak,
        finished: game.finished,
        words: game.finished ? game.words : initWords(game.pair),
        position: { x: 0, y: 1 },
        newUser: isEmpty(history)
    };
}

function handleBackspace(state) {
    if (state.position.x > 0) {
        state.position.x -= 1;
        state.words[state.position.y][state.position.x] = ' ';
    }
}

function handleLetterInput(state, letter) {
    if (state.position.x < 5 && state.position.y > 0 && state.position.y < 5) {
        state.words[state.position.y][state.position.x] = letter;
        
        state.position.x = state.position.x + 1;
    }
}

function renderSuccess(state) {
    const game = loadGame();
    const n = numStars(game.numSeconds);

    const app = document.getElementById('app');
    const popup = document.createElement('div');

    popup.className = "popup success";

    const ok = document.createElement('button');
    const content = document.createElement('div');

    content.innerHTML = `
        <p>You solved it!</p>
        <p>You earned ${n} star${n !== 1 ? 's' : ''} and your streak is ${state.streak}.</p>
        <p>You're at level ${state.level+1}</p>
        <p>Come back tomorrow!</p>
    `;

    ok.innerHTML = "Ok";

    popup.append(content, ok);

    ok.addEventListener('click', () => {
        app.removeChild(popup);
    });

    app.appendChild(popup);
}

const nth = (n) => {
    switch (n) {
        case 1:
            return 'first';
        case 2:
            return 'second';
        case 3:
            return 'third';
        case 4:
            return 'fourth';
    }
}

function handleEnter(state) {
    if (state.position.x === 5 && state.position.y < 5) {
        const y = state.position.y;
        const word = state.words[y].join('');
        const previousWord = state.words[state.flipped ? y + 1 : y - 1].join('');
        const firstWord = state.words[state.flipped ? 5 : 0].join('');
        const lastWord = state.words[state.flipped ? 0 : 5].join('');

        if (!state.dict.includes(word)) {
            showError('Not a word.', y);
        } else if (compareWords(word, previousWord) !== 4) {
            showError('You must change only 1 letter from the previous word.');
        } else if (compareWords(word, firstWord) !== (state.flipped ? y : 5 - y) || compareWords(word, lastWord) !== (state.flipped ? 5 - y : y)) {
            showError(`The ${nth(y)} word must have ${5 - y} yellow${y === 4 ? '' : 's'} and ${y} red${y === 1 ? '' : 's'}.`);
        } else {
            state.position.y += state.flipped ? -1 : 1;
            state.position.x = 0;

            if (isFinished(state.words)) {
                if (state.timer) {
                    clearInterval(state.timer);
                }

                const game = loadGame();

                state.streak++;
                state.level += Math.min(9, Math.max(0, (game.numSeconds >= 240 ? -1 : game.numSeconds <= 120 ? 1 : 0)));
                state.finished = true;

                game.finished = true;
                game.words = state.words;
                saveGame(game);

                renderSuccess(state);
            }
        }
    }
}

function handleDeleteWord(state) {
    state.words[state.position.y] = '     '.split('');
    state.position.y -= state.flipped ? -1 : 1;
    state.words[state.position.y] = '     '.split('');
}

const emptyWord = (word) => word.join('') === '     ';

function handleFlip(state) {
    state.flipped = !state.flipped;
    state.words[state.position.y] = '     '.split('');
    state.position.x = 0;
    state.position.y = state.flipped ? state.words.findLastIndex(emptyWord) : state.words.findIndex(emptyWord);
}

function setupKeyboardHandler(state) {
    const div = document.getElementById('keyboard');

    div.addEventListener('click', (e) => {
        const key = e.target;

        if (state.finished) return;

        if ([...key.classList].includes('key')) {
            if (state.position.y < 5 && !key.classList.contains('disabled')) {
                if (key.textContent === '⌫') {
                    handleBackspace(state);
                } else if (key.textContent === '⏎') {
                    handleEnter(state);
                } else if (key.textContent.length === 1) {
                    handleLetterInput(state, key.textContent);
                } else if (key.textContent.startsWith('Flip')) {
                    handleFlip(state);
                }

                renderBoard(state);
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!state.finished) {
            switch (e.key) {
                case 'Backspace':
                    handleBackspace(state);
                    break;
                case 'Enter':
                    handleEnter(state);
                    break;
                default:
                    if (isLetter(e.key)) {
                        const letter = e.key.toLowerCase();

                        if (state.words[0].includes(letter) || state.words[5].includes(letter)) {
                            handleLetterInput(state, letter);
                        } else {
                            showError('All letters must come from the first or last word');
                        }
                    } else {
                        console.log(e.key);
                    }
            }

            renderBoard(state);
        }
    });
}

function setupBoardHandler(state) {
    const div = document.getElementById('board');

    div.addEventListener('click', (e) => {
        const key = e.target;

        if (state.finshed) return;

        if (isLetter(key.textContent)) {
            handleLetterInput(state, key.textContent);
        } else if (key.textContent === '🗑️') {
            handleDeleteWord(state);
        } else if (key.textContent === '⏎') {
            handleEnter(state);
        } else if (key.textContent === '⌫') {
            handleBackspace(state);
        }

        renderBoard(state);
    });
}

function showError(message) {
    const app = document.getElementById('app');
    const error = document.createElement('div');

    error.className = 'popup error';
    error.innerHTML = message;

    app.append(error);

    setTimeout(() => {
        app.removeChild(error);
    }, 2000);
}

function showPopup(state) {
    return new Promise((resolve) => {
        const app = document.getElementById('app');
        const popup = document.createElement('div');

        popup.className = "popup";

        const ok = document.createElement('button');
        const content = document.createElement('div');

        if (state.newUser) {
            content.innerHTML = `
                Welcome to anagramish. Your goal is to find 4 words that complete 
                the path from the top word to the bottom word. Each word has to use
                4 letters from the word above it and 1 new letter from the word at
                the bottom of the puzzle.
            `;
        } else {
            content.innerHTML = `
                <p>Welcome back, you're at level ${state.level+1}.</p>
                ${state.streak > 0 ? `<p>Your streak is currently ${state.streak}.</p>` : ''}
                <p>Good luck!</p>
            `;
        }

        ok.innerHTML = "Start";

        popup.append(content, ok);

        ok.addEventListener('click', () => {                     
            app.removeChild(popup);

            resolve();
        });

        app.appendChild(popup);
    });
}

function setupControls(state) {
    setupKeyboardHandler(state);
    setupBoardHandler(state);
}

function renderStars(seconds) {
    const div = document.getElementById('stars');
    const n = numStars(seconds);

    div.innerHTML = '';

    for (let i = 0; i < n; i++) {
        const star = document.createElement('div');
        star.textContent = '⭐';

        if (i === n - 1) {
            star.style.opacity = 1 - (seconds % 60) / 60;
        }

        div.append(star);
    }
}

function startClock(state) {
    const fn = () => {
        const game = loadGame();
        game.numSeconds += 1;
        saveGame(game);

        renderStars(game.numSeconds);
    };

    fn();

    state.timer = setInterval(fn, 1000);
}

function render(state) {
    renderBoard(state);
    renderKeyboard(state.words);
}

async function main() {
    const pairs = await loadFile(pairsFile);
    const dict = await loadFile(dictFile);
    const state = init(parse(pairs), dict);

    render(state);

    if (state.finished) {
        renderSuccess(state);
    } else {
        showPopup(state).then(() => {
            setupControls(state);
            startClock(state);
        });
    }
}

main();
