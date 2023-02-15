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

function goal(name) {
    try {
        clicky.goal(name);
    } catch (e) {
        console.error('Error logging goal', name, e);
    }
}

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

const countForLevel = (level) => level === 0 ? 10000 : Math.pow(2, 10 - ((1 + level) * 2)) * 10;

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
    const maxCount = countForLevel(level);
    const minCount = level === 4 ? 1 : countForLevel(level + 1);

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
    let pk = null;

    keys.sort().forEach((k) => {
        console.log({k, streak, level});

        const game = history[k];

        console.log(game, k !== key(), pk && new Date(k) - new Date(pk) > 86400000);

        if ((!game.finished && k !== key()) || (pk && new Date(k) - new Date(pk) > 86400000)) {
            console.log('reset streak a');
            streak = 0;
        }

        if (game.finished) {
            console.log('increment streak');
            streak++;
        }

        // lose a level if:
        //  not today's game and not finished or time > 240
        //  today's game and finished and time > 240
        // gain a level if:
        //  game finished and time < 120 (but not for today's game)
        if (k !== key() && (!game.finished || game.numSeconds >= 240) && level > 0) {
            console.log('lose a level a');
            level--;
        } else if (k === key() && game.finished && game.numSeconds >= 240 && level > 0) {
            console.log('lose a level b');
            level--;
        } else if (game.finished && game.numSeconds <= 120 && level < 4 && k !== key()) {
            console.log('gain a level');
            level++;
        }

        pk = k;
    });

    console.log(pk, key());

    if (pk && new Date(key()) - new Date(pk) > 86400000) {
        console.log('reset streak b');
        streak = 0;
    }

    console.log(key(), { level, streak });

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
        word.push(i <= level ? emojiletters.yellow : emojiletters.black);
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
        <button>Copy</button>
        <button>OK</button>
        <button>*</button>
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

        if (name === 'Share' || name === 'Copy') {
            goal('Shared');

            const share = [
                'Anagramish by @emh',
                emojiWord(state.words[0]),
                emojiLevel(state.level),
                emojiStars(n),
                emojiWord(state.words[5]),
                `Streak: ${state.streak}`,
                '',
                'https://anagramish.com'
            ];

            const data = {
                title: 'Anagramish',
                text: share.join('\n')
            };

            if (name === 'Share' && navigator.canShare && navigator.canShare(data)) {
                navigator.share(data);
            } else {
                const div = document.querySelector('#copied');
                div.style.visibility = "visible";

                navigator.clipboard.writeText(data.text);
            }
        } else if (name === '*') {
            navigator.clipboard.writeText(localStorage.getItem('history'));
        } else {
            app.removeChild(popup);
        }
    });
    popup.append(div);
    app.appendChild(popup);
}

function handleEnter(state) {
    if (state.position.x === 5 && state.position.y < 5) {
        const y = state.position.y;
        const word = state.words[y].join('');
        const previousWord = state.words[state.flipped ? y + 1 : y - 1].join('');
        const nextWord = state.words[state.flipped ? y - 1 : y + 1].join('');
        const firstWord = state.words[state.flipped ? 5 : 0].join('');
        const lastWord = state.words[state.flipped ? 0 : 5].join('');

        const hasNextWord = nextWord !== '     ';

        const classesFor = (l) => {
            const classes = ['letter'];

            if (state.words[0].indexOf(l) !== -1) classes.push('start');
            if (state.words[5].indexOf(l) !== -1) classes.push('end');

            return classes.join(' ');
        };

        const renderWord = (word) => {
            const letters = word.split('');

            return `<div class="word">${letters.map((l) => `<span class="${classesFor(l)}">${l}</span>`).join('')}</div>`;
        };

        if (!state.dict.includes(word)) {
            showError('Not a word.', y);
        } else if (compareWords(word, previousWord) !== 4) {
            showError(`${renderWord(word)}<p>can only be one letter different from</p>${renderWord(previousWord)}`);
        } else if (hasNextWord && compareWords(word, nextWord) !== 4) {
            showError(`${renderWord(word)}<p>can only be one letter different from</p>${renderWord(nextWord)}`);
        } else if (compareWords(word, firstWord) !== (state.flipped ? y : 5 - y) || compareWords(word, lastWord) !== (state.flipped ? 5 - y : y)) {
            showError(`<p>You have to use ${5 - y} letter${y === 4 ? '' : 's'} from</p>${renderWord(state.words[0].join(''))}<p>and ${y} letter${y === 1 ? '' : 's'} from</p>${renderWord(state.words[5].join(''))}`);
        } else {
            goal('Entered Word');

            state.position.y += state.flipped ? -1 : 1;
            state.position.x = 0;

            if (isFinished(state.words)) {
                goal('Game Finished');

                if (state.timer) {
                    clearInterval(state.timer);
                }

                const game = loadGame();

                state.streak++;
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

function clearPopup() {
    const app = document.getElementById('app');
    const popup = app.querySelector('popup-message');

    if (popup) {
        app.removeChild(popup);

        return true;
    }

    return false;
}

function setupKeyboardHandler(state) {
    const keyboard = document.querySelector('virtual-keyboard');

    keyboard.addEventListener('keypress', (event) => {
        const key = event.detail.key;

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
            if (clearPopup()) return;

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

    const content = document.createElement('div');
    content.setAttribute('slot', 'content');
    content.innerHTML = `${message}<br/><br/><div class="buttons"><button>OK</button>`;

    error.append(content);
    app.append(error);

    error.addEventListener('buttonClick', (e) => {
        app.removeChild(error);
    });
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
                <p>Welcome back. You're at level ${state.level + 1}.</p>
                ${emojiLevel(state.level)}
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

function fixHistoryDates() {
    const history = getHistory();

    const keys = Object.keys(history);

    console.log(keys);

    keys.forEach((key) => {
        const match = key.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

        if (match) {
            const newKey = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;

            history[newKey] = history[key];

            delete history[key];
        }
    });

    putHistory(history)
}

async function main() {
    fixHistoryDates();

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
