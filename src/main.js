'use strict';

import pairsFile from './pairs.txt';
import dictFile from './dictionary.txt';

import { compareWords, isLetter } from './words.mjs';

const loadFile = (file) => fetch(file).then((response) => response.text()).then((text) => text.split('\n'));

function parse(pairs) {
    return pairs.map((pair) => pair.split(','));
}

const checkLevel = (pair, level) => {
    const count = pair[2];

    switch (level) {
        case 3:
            return count < 10;
        case 2:
            return count >= 10 && count < 100;
        case 1:
            return count >= 100 && count < 1000;
        default:
            return count >= 1000;
    }
}

function choosePair(pairs, level) {
    const filteredPairs = pairs.filter((pair) => checkLevel(pair, level));

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

function initWords(pairs, level) {
    const pair = choosePair(pairs, level);

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

function init(pairs, dict) {
    const level = 0;

    const words = initWords(pairs, level);

    return {
        pairs,
        dict,
        words,
        level,
        position: { x: 0, y: 1 }
    };
}

function setupLevelButtons(state) {
    const levelButtons = document.querySelectorAll('#levels button');

    levelButtons.forEach((button) => button.addEventListener('click', (e) => {
        const classList = e.target.classList;

        if (classList.contains("zero")) state.level = 0;
        if (classList.contains("one")) state.level = 1;
        if (classList.contains("two")) state.level = 2;
        if (classList.contains("three")) state.level = 3;

        state.words = initWords(state.pairs, state.level);
        state.position = { x: 0, y: 1 };

        e.target.blur();

        render(state);
    }));
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

function renderError(message, y) {
    const div = document.getElementById('error');

    div.textContent = message;
    div.style.display = 'block';

    setTimeout(() => div.style.display = 'none', 2000);
}

function renderSuccess() {
    console.log('success');
    const div = document.getElementById('success');

    div.textContent = 'You did it!';
    div.style.display = 'block';

    setTimeout(() => div.style.display = 'none', 2000);
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
        const firstWord = state.words[0].join('');
        const lastWord = state.words[5].join('');

        if (!state.dict.includes(word)) {
            renderError('Not a word!', y);
        } else if (compareWords(word, firstWord) !== (5 - y) || compareWords(word, lastWord) !== y) {
            renderError(`The ${nth(y)} word must have ${5 - y} yellows and ${y} reds.`);
        } else {
            state.position.y += 1;
            state.position.x = 0;

            if (y === 4) {
                renderSuccess();
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
                            renderError('All letters must come from the first or last word');
                        }
                    } else {
                        console.log(e.key);
                    }
            }

            renderBoard(state);
        }
    });
}

function setupControls(state) {
    setupLevelButtons(state);
    setupKeyboardHandler(state);
}

function render(state) {
    renderBoard(state);
    renderKeyboard(state.words);
}

Promise.all([
    loadFile(pairsFile),
    loadFile(dictFile)
]).then(([pairs, dict]) => {
    const state = init(parse(pairs), dict);

    render(state);
    setupControls(state);
});
