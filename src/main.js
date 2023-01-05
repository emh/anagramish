'use strict';

import pairsFile from './pairs.txt';
import { isLetter } from './words.mjs';

const loadFile = (file) => fetch(file).then((response) => response.text()).then((text) => text.split('\n'));

function choosePair(pairs) {
    return pairs[Math.floor(Math.random() * pairs.length)];
}

function renderLetter(letter, classes) {
    const div = document.createElement('div');

    div.className = ['letter', ...classes].join(' ');
    div.textContent = letter;

    document.getElementById('board').appendChild(div);
}

function render(state) {
    const startWord = state.words[0];
    const endWord = state.words[5];

    document.getElementById('board').innerHTML = '';

    state.words.forEach((w, y) => w.forEach((l, x) => {
        const colorClass = startWord.indexOf(l) !== -1 ? 'start' : endWord.indexOf(l) !== -1 ? 'end' : '';
        const activeClass = x === state.position.x && y === state.position.y ? 'active' : '';

        renderLetter(l, [colorClass, activeClass]);
    }));
}

function init(pairs) {
    const pair = choosePair(pairs).split(',');

    const words = [
        pair[0],
        '     ',
        '     ',
        '     ',
        '     ',
        pair[1]
    ].map((w) => w.split(''));

    return {
        words,
        position: { x: 0, y: 1 }
    };
}

Promise.all([
    loadFile(pairsFile)
]).then(([pairs]) => {
    const state = init(pairs);

    render(state);

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

        render(state);
    });
});
