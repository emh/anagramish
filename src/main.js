'use strict';

import pairsFile from './pairs.txt';
import { isLetter } from './words.mjs';

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
    const el = document.createElement('input');

    el.className = ['letter', ...classes].join(' ');
    el.value = letter;

    document.getElementById('board').appendChild(el);
}

function renderBoard(state) {
    const startWord = state.words[0];
    const endWord = state.words[5];

    document.getElementById('board').innerHTML = '';

    state.words.forEach((w, y) => w.forEach((l, x) => {
        const colorClass = startWord.indexOf(l) !== -1 ? 'start' : endWord.indexOf(l) !== -1 ? 'end' : '';
        const activeClass = x === state.position.x && y === state.position.y ? 'active' : '';

        renderLetter(l, [colorClass, activeClass]);
    }));
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

function init(pairs) {
    const level = 0;

    const words = initWords(pairs, level);

    return {
        pairs,
        words,
        level,
        position: { x: 0, y: 1 }
    };
}

function setupControls(state) {
    const levelButtons = document.querySelectorAll('#controls button');

    levelButtons.forEach((button) => button.addEventListener('click', (e) => {
        const classList = e.target.classList;

        if (classList.contains("zero")) state.level = 0;
        if (classList.contains("one")) state.level = 1;
        if (classList.contains("two")) state.level = 2;
        if (classList.contains("three")) state.level = 3;

        state.words = initWords(state.pairs, state.level);

        renderBoard(state);
    }));
}

Promise.all([
    loadFile(pairsFile)
]).then(([pairs]) => {
    const state = init(parse(pairs));

    setupControls(state);
    renderBoard(state);

    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowUp':
                state.position.y = state.position.y === 1 ? 1 : state.position.y - 1;
                break;
            case 'ArrowDown':
                state.position.y = state.position.y === 4 ? 4 : state.position.y + 1;
                break;
            case 'ArrowLeft':
                state.position.x = state.position.x === 0 ? 0 : state.position.x - 1;
                break;
            case 'ArrowRight':
                state.position.x = state.position.x === 4 ? 4 : state.position.x + 1;
                break;
            case 'Delete':
                state.words[state.position.y][state.position.x] = ' ';

                break;
            case 'Backspace':
                if (state.position.x === 0) {
                    if (state.position.y > 1) {
                        state.position.y = state.position.y - 1;
                    }

                    state.position.x = 4;
                } else {
                    state.position.x = state.position.x - 1;
                }

                state.words[state.position.y][state.position.x] = ' ';

                break;
            default:
                if (isLetter(e.key)) {
                    state.words[state.position.y][state.position.x] = e.key.toLowerCase();

                    if (state.position.x === 4) {
                        if (state.position.y === 4) {
                            state.position.y = 1;
                        } else {
                            state.position.y = state.position.y + 1;
                        }

                        state.position.x = 0;
                    } else {
                        state.position.x = state.position.x + 1;
                    }
                } else {
                    console.log(e.key);
                }
        }

        renderBoard(state);
    });
});
