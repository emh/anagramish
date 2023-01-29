'use strict';

import { ThemeManager } from './theme.js';

import { VirtualKeyboard } from './virtual-keyboard.mjs';
import { GameBoard } from './game-board.mjs';
import { GameStars } from './game-stars.mjs';
import { PopupMessage } from './popup-message.mjs';
import { PopupHelp } from './popup-help.mjs';

import { compareWords, isLetter } from './words.mjs';
import { numStars, loadFile, key, getHistory, putHistory, isEmpty, isFinished } from './utils.mjs';

import pairsFile from './pairs.txt';
import dictFile from './dictionary.txt';

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

    return count >= minCount && count < maxCount;
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
    const maxCount = countForLevel(Math.floor(level / 2) * 2);
    const minCount = level >= 8 ? 1 : countForLevel(Math.floor(level / 2) * 2 + 2);

    const filteredPairs = pairs.filter((pair) => checkCount(pair, minCount, maxCount));
    const n = filteredPairs.length;
    const i = calcIndex(n);

    return filteredPairs[i];
}

function renderBoard(state) {
    const container = document.getElementById('board');
    const gameBoard = new GameBoard(state);

    container.innerHTML = '';    
    container.append(gameBoard);

    setupBoardHandler(state);
}

function renderKeyboard(state) {
    const container = document.getElementById('keyboard');
    const validLetters = [...state.words[0], ...state.words[5]];

    const control = (value) => ({ value, control: true });
    const letter = (value) => ({ value, disabled: !validLetters.includes(value) });
    const keys = [
        [control('Flip ⇵')],
        [],
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map(letter),
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'].map(letter),
        [control('⏎'), ...['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(letter), control('⌫')]
    ];

    const keyboard = new VirtualKeyboard(keys);

    container.innerHTML = '';
    container.append(keyboard);
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
        started: false,
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

const emojiletters = {
    a: '🇦',
    b: '🇧',
    c: '🇨',
    d: '🇩',
    e: '🇪',
    f: '🇫',
    g: '🇬',
    h: '🇭',
    i: '🇮',
    j: '🇯',
    k: '🇰',
    l: '🇱',
    m: '🇲',
    n: '🇳',
    o: '🇴',
    p: '🇵',
    q: '🇶',
    r: '🇷',
    s: '🇸',
    t: '🇹',
    u: '🇺',
    v: '🇻',
    w: '🇼',
    x: '🇽',
    y: '🇾',
    z: '🇿',
    black: '⬛',
    yellow: '🟨',
    star: '⭐'
};

function emojiWord(word) {
    return word.map((letter) => emojiletters[letter]).join(' ');
}

function emojiLevel(level) {
    const word = [];

    for (let i = 0; i < 5; i++) {
        word.push(i < level ? emojiletters.yellow : emojiletters.black);
    }

    return word.join(' ');
}

function emojiStars(n) {
    const word = [];

    for (let i = 0; i < n; i++) {
        word.push(emojiletters.star);
    }

    return word.join(' ');
}

function showSuccess(state) {
    const game = loadGame();
    const n = numStars(game.numSeconds);
    
    const message = `
        <p>You solved it!</p>
        <p>You earned ${n} star${n !== 1 ? 's' : ''}<br/>
        ${state.streak === 1 ? 'and you started a new streak' : `and your streak is ${state.streak}`}.</p>
        <div>
        ${emojiWord(state.words[0])}<br/>
        ${emojiLevel(state.level)}<br/>
        ${emojiStars(n)}<br/>
        ${emojiWord(state.words[5])}
        </div>
        <p>Come back tomorrow to extend your streak!</p>
        <p id="copied">Copied to clipboard.</p>
        <div class="buttons">
        <button>Share</button>
        <button>OK</button>
        </div>
    `;

    const app = document.getElementById('app');
    const popup = new PopupMessage('success');
    const div = document.createElement('div');

    div.setAttribute('id', 'popup');
    div.setAttribute('slot', 'content');
    div.innerHTML = message;
    popup.addEventListener('buttonClick', (e) => {
        const { name } = e.detail;

        if (name === 'Share') {
            const share = [
                'Anagramish by @emh',
                emojiWord(state.words[0]),
                emojiLevel(state.level),
                emojiStars(n),
                emojiWord(state.words[5]),
                '',
                'https://anagramish.com'
            ];

            const data = {
                title: 'Anagramish',
                text: share.join('\n')
            };
            
            if (navigator.canShare && navigator.canShare(data)) {
                navigator.share(data);
            } else {
                const div = document.querySelector('#copied');
                div.style.visibility = "visible";

                navigator.clipboard.writeText(data.text);
            }
        } else {
            app.removeChild(popup);
        }
    });
    popup.append(div);
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

                showSuccess(state);
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
    const keyboard = document.querySelector('virtual-keyboard');

    keyboard.addEventListener('keypress', (event) => {
        const key = event.detail.key;

        if (state.finished) return;

        if (state.position.y < 5) {
            if (key === '⌫') {
                handleBackspace(state);
            } else if (key === '⏎') {
                handleEnter(state);
            } else if (key.length === 1) {
                handleLetterInput(state, key);
            } else if (key.startsWith('Flip')) {
                handleFlip(state);
            }

            renderBoard(state);
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
    const div = document.querySelector('game-board');

    div.addEventListener('letterPress', (event) => {
        if (!state.started || state.finshed) return;

        const letter = event.detail.letter;

        handleLetterInput(state, letter);

        renderBoard(state);
    });

    div.addEventListener('enterPress', () => {
        handleEnter(state);
        renderBoard(state);
    });

    div.addEventListener('backspacePress', () => {
        handleBackspace(state);
        renderBoard(state);
    });

    div.addEventListener('trashPress', () => {
        handleDeleteWord(state);
        renderBoard(state);
    });
}

function showError(message) {
    const app = document.getElementById('app');
    const error = new PopupMessage('error');

    const p = document.createElement('p');
    p.setAttribute('slot', 'content');
    p.textContent = message;

    error.append(p);
    app.append(error);

    setTimeout(() => {
        app.removeChild(error);
    }, 2000);
} 

function showHelp() {
    const app = document.getElementById('app');
    const popup = new PopupHelp();

    popup.addEventListener('buttonClick', (event) => {
        app.removeChild(popup);
    });

    app.appendChild(popup);
}

function showPopup(state) {
    return new Promise((resolve) => {
        const app = document.getElementById('app');
        const popup = new PopupMessage();

        const div = document.createElement('div');
        div.setAttribute('slot', 'content');
        let message = '';

        if (state.newUser) {
            message = `
                <p>Welcome to ANAGRAMISH.</p><p>Find the four words that connect the first word to the last.</p><p>Each word in between must use four letters from the word above it and 1 letter from the bottom word.</p>
            `;
        } else {
            message = `
                <p>Welcome back. You're at level ${Math.floor(state.level/2) + 1}.</p>
                ${state.streak > 0 ?
                    `<p>Your streak is currently ${state.streak}.</p>` :
                    '<p>Starting a new streak today - come back daily to keep it going.'
                }
            `;
        }

        div.innerHTML = `
            ${message}
            <p>Good luck!</p>
            <div class="buttons">
                <button>Help</button>
                <button>Start</button>
            </div>
        `;

        popup.append(div);

        popup.addEventListener('buttonClick', (event) => {
            const { name } = event.detail;
            
            if (name === 'Start') {
                app.removeChild(popup);
                state.started = true;
                resolve();
            } else {
                showHelp();
            }
        });

        app.appendChild(popup);
    });
}

function renderStars(seconds) {
    const div = document.getElementById('stars');
    const stars = new GameStars(seconds);
    
    div.innerHTML = '';
    div.append(stars);
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
    renderKeyboard(state);
}

async function main() {
    const pairs = await loadFile(pairsFile);
    const dict = await loadFile(dictFile);
    const state = init(parse(pairs), dict);

    const themeManager = new ThemeManager();
    window.themeManager = themeManager;

    render(state);

    const help = document.getElementById('help');
    help.addEventListener('click', showHelp);

    if (state.finished) {
        showSuccess(state);
    } else {
        showPopup(state).then(() => {
            setupKeyboardHandler(state);
            startClock(state);
        });
    }
}

main();
