'use strict';

import pairsFile from './pairs.txt';
import dictFile from './dictionary.txt';

import { compareWords, isLetter } from './words.mjs';

const loadFile = (file) => fetch(file).then((response) => response.text()).then((text) => text.split('\n'));

const key = () => new Date().toLocaleDateString("en-CA");

const getHistory = () => JSON.parse(localStorage.getItem('history')) ?? {};

const putHistory = (history) => localStorage.setItem('history', JSON.stringify(history));

const isEmpty = (obj) => Object.keys(obj).length === 0;

const numStars = (s) => 5 - Math.floor(s / 60);

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

function choosePair(pairs, level) {
    const maxCount = countForLevel(level);
    const minCount = countForLevel(level + 1);

    const filteredPairs = pairs.filter((pair) => checkCount(pair, minCount, maxCount));

    return filteredPairs[Math.floor(Math.random() * filteredPairs.length)];
}

function renderLetter(letter, classes) {
    const div = document.createElement('div');

    div.className = ['letter', ...classes].join(' ');
    div.textContent = letter;

    document.getElementById('board').appendChild(div);
}

function renderBoard(state) {
    const startWord = state.words[0];
    const endWord = state.words[5];
    const board = document.getElementById('board')
        
    board.innerHTML = '';

    state.words.forEach((w, y) => w.forEach((l, x) => {
        const colorClass = startWord.indexOf(l) !== -1 ? 'start' : endWord.indexOf(l) !== -1 ? 'end' : '';
        const activeClass = x === state.position.x && y === state.position.y ? 'active' : '';

        renderLetter(l, [colorClass, activeClass]);
    }));

    if (state.position.y > 1 && state.position.y < 5) {
        const el = document.createElement('div');
        el.className = 'trash';
        el.textContent = 'X';
        el.style.left = '280px';
        el.style.top = `${(state.position.y - 1) * 55 + 8}px`;

        el.addEventListener('click', () => {
            state.words[state.position.y] = '     '.split('');
            state.position.y -= 1;
            state.words[state.position.y] = '     '.split('');

            renderBoard(state);
        });
        
        board.appendChild(el);
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

function renderKeyboard(words) {
    const letters = [...words[0], ...words[5], '⌫', '⏎'];

    document.getElementById('keyboard').innerHTML = '';

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

        if (k !== key()) {
            if (!game.finished) {
                streak = 0;
            } else {
                streak++;
            }
        }

        if ((!game.finished || game.numSeconds >= 240) && level > 0) {
            level--;
        } else if (game.finished && game.numSeconds <= 120 && level < 100) {
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
    if (state.position.x < 5) {
        state.words[state.position.y][state.position.x] = letter;
        
        state.position.x = state.position.x + 1;
    }
}

function renderSuccess(state) {
    const game = loadGame();
    const n = numStars(game.numSeconds);

    const app = document.getElementById('app');
    const popup = document.createElement('div');

    popup.className = "success";

    const ok = document.createElement('button');
    const content = document.createElement('div');

    content.innerHTML = `
        <p>You solved it!</p>
        <p>You earned ${n} star${n !== 1 ? 's' : ''} and your streak is ${state.streak}.</p>
        <p>You're at level ${state.level}</p>
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
        const previousWord = state.words[y-1].join('');
        const firstWord = state.words[0].join('');
        const lastWord = state.words[5].join('');

        if (!state.dict.includes(word)) {
            showError('Not a word.', y);
        } else if (compareWords(word, previousWord) !== 4) {
            showError('You must change only 1 letter from the previous word.');
        } else if (compareWords(word, firstWord) !== (5 - y) || compareWords(word, lastWord) !== y) {
            showError(`The ${nth(y)} word must have ${5 - y} yellow${y === 4 ? '' : 's'} and ${y} red${y === 1 ? '' : 's'}.`);
        } else {
            state.position.y += 1;
            state.position.x = 0;

            if (y === 4) {
                if (state.timer) {
                    clearInterval(state.timer);
                }

                state.streak++;

                const game = loadGame();
                game.finished = true;
                game.words = state.words;
                saveGame(game);

                renderSuccess(state);
            }
        }
    }
}

function setupKeyboardHandler(state) {
    const div = document.getElementById('keyboard');

    div.addEventListener('click', (e) => {
        const key = e.target;

        if (state.position.y < 5 && !key.classList.contains('disabled')) {
            if (key.textContent === '⌫') {
                handleBackspace(state);
            } else if (key.textContent === '⏎') {
                handleEnter(state);
            } else if (key.textContent.length === 1) {
                handleLetterInput(state, key.textContent);
            }

            renderBoard(state);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (state.position.y < 5) {
            switch (e.key) {
                case 'Backspace':
                    handleBackspace(state);
                    break;
                case 'Enter':
                    handleEnter(state);
                    break;
                default:
                    if (isLetter(e.key)) {
                        if (state.words[0].includes(e.key) || state.words[5].includes(e.key)) {
                            handleLetterInput(state, e.key.toLowerCase());
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

function showError(message) {
    const app = document.getElementById('app');
    const error = document.createElement('div');

    error.className = 'error';
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
                <p>Welcome back, you're at level ${state.level} and your streak is currently ${state.streak}.</p>
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
}

function renderStars(seconds) {
    const div = document.getElementById('stars');
    const n = numStars(seconds);

    div.innerHTML = '';

    if (n >= 1) {
        const s = ('⭐'.repeat(n)).split('').map((s) => `<div>${s}</div>`).join('');

        div.innerHTML = s;
    }
}

function startClock(state) {
    state.timer = setInterval(() => {
        const game = loadGame();
        game.numSeconds += 1;
        saveGame(game);

        renderStars(game.numSeconds);
        console.log('tick');
    }, 1000);
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
