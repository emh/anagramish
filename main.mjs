import { get, set } from './html.mjs';
import { compareWords, emptyBoard, emptyRow } from './utils.js';

const STATES = {
    WELCOME: 'welcome',
    PLAYING: 'playing',
    FINISHED: 'finished',
    HISTORY: 'history'
};
const GAME_VERSION = 2;
const HARD_MODE_STORAGE_KEY = 'hard-mode';
const BOARD_ROW_SIZE = 50;
const BOARD_PADDING_TOP = 20;
const CELL_SIZE = 42;
const TRASH_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';

const loadHardModeSetting = () => localStorage.getItem(HARD_MODE_STORAGE_KEY) === 'true';

const saveHardModeSetting = (hardMode) => localStorage.setItem(HARD_MODE_STORAGE_KEY, hardMode ? 'true' : 'false');

const state = {
    puzzleNumber: 1,
    pair: [[], []],
    hardMode: loadHardModeSetting(),
    isPractice: false,
    dailyKey: null,
    mistakes: 0,
    board: emptyBoard(),
    position: { x: 0, y: 1 },
    state: STATES.WELCOME,
    numSeconds: 0
};

const rnd = (n) => Math.floor(Math.random() * n);

let dictionary = [];
let dictionarySet = new Set();
let pairs = [];
let isDataLoaded = false;

const fetchText = async (path) => {
    const response = await fetch(path);

    if (!response.ok) {
        throw new Error(`Unable to load ${path}`);
    }

    return response.text();
};

const loadWordData = async () => {
    try {
        const [dictionaryText, pairsText] = await Promise.all([
            fetchText('./dictionary.txt'),
            fetchText('./pairs.txt')
        ]);

        dictionary = dictionaryText.split('\n');
        dictionarySet = new Set(dictionary);
        pairs = pairsText.split('\n').map((line) => line.split(','));
        isDataLoaded = true;
        render();
    } catch {
        renderMessage('Unable to load word data. Reload to try again.');
    }
};

const key = () => {
    const d = new Date(); // local time

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const calcIndex = (seed, n) => {
    const f = Math.PI - 3; // need a number > 0 and < 1
    const s = seed.valueOf() / 1000;
    const r = (s * f) - Math.floor(s * f);
    const i = Math.floor(n * r);

    return i;
};

const randomPair = () => pairs[rnd(pairs.length)];

const todaysPair = (puzzleNumber) => pairs[puzzleNumber];

const formatElapsedTime = (numSeconds) => {
    const minutes = Math.floor(numSeconds / 60);
    const seconds = numSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatGameTime = () => `${formatElapsedTime(state.numSeconds)}${state.hardMode ? ' 💪' : ''}`;

const getShareText = () => [
    `Anagramish #${state.puzzleNumber} in ${formatGameTime()}`,
    ...state.board.map((row) => row.map((c) => state.pair[0].includes(c) ? '🟦' : state.pair[1].includes(c) ? '🟧' : '⬜').join(''))
].join('\n');

const copyShareText = async () => {
    try {
        await navigator.clipboard.writeText(getShareText());
        renderMessage('The share was copied.');
    } catch {
        renderMessage('Unable to copy share.');
    }
};

const getSavedPuzzleNumber = (date, game) => {
    if (Number.isInteger(game?.puzzleNumber)) {
        return game.puzzleNumber;
    }

    if (pairs.length === 0) {
        return 1;
    }

    const puzzleNumber = calcIndex(new Date(date), pairs.length);

    return Number.isFinite(puzzleNumber) ? puzzleNumber : 1;
};

const formatHistoryEntry = (date, game) => {
    const puzzleNumber = getSavedPuzzleNumber(date, game);
    const start = (game?.pair?.[0] ?? '').toUpperCase();
    const end = (game?.pair?.[1] ?? '').toUpperCase();
    const time = formatElapsedTime(game?.numSeconds ?? 0);
    const isVersion2 = game?.version === GAME_VERSION;
    const rawWords = Array.isArray(game?.words) ? game.words.length : 0;
    const words = isVersion2 ? rawWords : Math.max(0, rawWords - 2);
    const mistakes = Number.isFinite(game?.mistakes) ? game.mistakes : 0;
    const details = isVersion2 ? `${time} ${words} words ${mistakes} mistakes` : `${time} ${words} words`;

    return {
        top: `${date} #${puzzleNumber} ${start} ${end}`,
        bottom: details
    };
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const readStorageJSON = (storageKey) => {
    const json = localStorage.getItem(storageKey);

    if (json === null) {
        return null;
    }

    try {
        return JSON.parse(json);
    } catch {
        return null;
    }
};

export const getHistory = () => {
    const history = readStorageJSON('history');
    return isPlainObject(history) ? history : {};
};

export const putHistory = (history) => localStorage.setItem('history', JSON.stringify(history));

const isVersion2Game = (game) => isPlainObject(game) && game.version === GAME_VERSION;

const loadGame = () => {
    if (state.isPractice) {
        const game = readStorageJSON('practice');
        return isVersion2Game(game) ? game : null;
    }

    if (!state.dailyKey) {
        return undefined;
    }

    const game = getHistory()[state.dailyKey];

    return isVersion2Game(game) ? game : null;
};

const initTodaysGame = (dailyKey) => {
    const puzzleNumber = calcIndex(new Date(dailyKey), pairs.length);
    const pair = todaysPair(puzzleNumber);

    return {
        version: GAME_VERSION,
        pair,
        puzzleNumber,
        state: STATES.PLAYING,
        numSeconds: 0,
        words: [],
        mistakes: 0
    };
};

const initPracticeGame = () => ({
    version: GAME_VERSION,
    pair: randomPair(),
    state: STATES.PLAYING,
    numSeconds: 0,
    words: [],
    mistakes: 0
});

const hydrateGameState = (game, isPractice) => {
    state.puzzleNumber = game.puzzleNumber ?? (isPractice ? state.puzzleNumber : 1);
    state.pair = game.pair;
    state.board = resetBoard(state.pair);
    const maxLoadedWords = state.hardMode ? 4 : Number.POSITIVE_INFINITY;
    const words = Array.isArray(game.words) ? game.words.slice(0, maxLoadedWords) : [];

    let i = words.length - 3;

    if (game.state === STATES.FINISHED) i--;

    while (!state.hardMode && i > 0) {
        state.board.splice(state.board.length - 1, 0, emptyRow());
        i -= 1;
    }

    words.forEach((word, i) => {
        state.board[i + 1] = word.split('');
    });

    state.position = { x: 0, y: words.length + 1 };
    state.state = game.state === STATES.FINISHED ? STATES.FINISHED : STATES.PLAYING;
    state.numSeconds = game.numSeconds;
    state.mistakes = game.mistakes;

    renderKeyboard();
    if (state.state === STATES.PLAYING) startClock();
    render();
};

const startGame = (isPractice) => {
    if (!isDataLoaded) {
        renderMessage('Loading word data...');
        return;
    }

    stopClock();

    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    state.isPractice = isPractice;
    state.dailyKey = isPractice ? null : key();

    let game = loadGame();

    if (!game || (isPractice && game.state === STATES.FINISHED)) {
        game = isPractice ? initPracticeGame() : initTodaysGame(state.dailyKey);
        saveGame(game);
    }

    hydrateGameState(game, isPractice);
};

const saveGame = (game) => {
    game.version = GAME_VERSION;

    if (state.isPractice) {
        localStorage.setItem('practice', JSON.stringify(game));
        return;
    }

    if (!state.dailyKey) {
        return;
    }

    const history = getHistory();

    history[state.dailyKey] = game;

    putHistory(history);
};

const updateSavedGame = () => {
    const game = loadGame() ?? {
        version: GAME_VERSION,
        pair: state.pair,
        puzzleNumber: state.puzzleNumber,
        state: state.state,
        numSeconds: state.numSeconds,
        words: [],
        mistakes: state.mistakes
    };

    game.version = GAME_VERSION;
    game.pair = state.pair;
    game.puzzleNumber = state.puzzleNumber;
    game.numSeconds = state.numSeconds;
    game.state = state.state;
    game.words = [];

    state.board.slice(1, -1).forEach((row, i) => {
        if (state.position === null || i < state.position.y - 1) {
            game.words.push(row.join(''));
        }
    });

    game.mistakes = state.mistakes;

    saveGame(game);
};

const startClock = () => {
    const fn = () => {
        state.numSeconds += 1;

        updateSavedGame();
    };

    state.timer = setInterval(fn, 1000);
};

const stopClock = () => {
    if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
    }
};

const resetBoard = (pair) => {
    const board = emptyBoard();
    board[0] = pair[0].split('');
    board[5] = pair[1].split('');
    return board;
};

const renderMessage = (message) => {
    const el = get('#message');

    el.textContent = message;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(el._timer);

    el._timer = setTimeout(() => el.classList.remove('show'), 3000);
};

const isLetter = (key) => key.length === 1 && key >= 'a' && key <= 'z';
const isHardModeAllowedLetter = (letter) => state.pair[0].includes(letter) || state.pair[1].includes(letter);

const colorKeyboard = () => {
    get('.key').forEach((el) => {
        const key = el.dataset.key;
        el.disabled = false;

        if (key === 'Backspace' || key === 'Enter') {
            el.classList.add('special');
            return;
        }

        if (state.hardMode && !isHardModeAllowedLetter(key)) {
            el.classList.add('invalid');
            el.disabled = true;
            return;
        } else if (state.pair[0].includes(key)) {
            el.classList.add('start');
        } else if (state.pair[1].includes(key)) {
            el.classList.add('end');
        } else {
            el.classList.add('misc');
        }
    });
};

const handleKey = (key) => {
    const normalizedKey = key.length === 1 ? key.toLowerCase() : key;

    if (state.state !== STATES.PLAYING || state.position === null) {
        return;
    }

    if (normalizedKey === 'Backspace') {
        if (state.position.x > 0) {
            state.board[state.position.y][state.position.x - 1] = null;
            state.position.x -= 1;
        }
    } else if (isLetter(normalizedKey) && state.position.x <= 4) {
        if (state.hardMode && !isHardModeAllowedLetter(normalizedKey)) {
            return;
        }

        const { x, y } = state.position;

        state.board[y][x] = normalizedKey;
        state.position.x += 1;
    } else if (normalizedKey === 'Enter' && state.position.x === 5) {
        const { y } = state.position;

        if (!dictionarySet.has(state.board[y].join(''))) {
            renderMessage(`${state.board[y].join('')} is not in our dictionary`);
            state.mistakes += 1;
            state.board.splice(state.position.y, 1, emptyRow());
            state.position.x = 0;
        } else if (compareWords(state.board[y], state.board[y - 1]) !== 4) {
            renderMessage(`${state.board[y].join('')} can only differ by one letter from ${state.board[y - 1].join('')}`);
            state.mistakes += 1;
            state.board.splice(state.position.y, 1, emptyRow());
            state.position.x = 0;
        } else if (y === state.board.length - 2 && compareWords(state.board[y], state.board[y + 1]) === 4) {
            state.position = null;
            state.state = STATES.FINISHED;
        } else if (state.hardMode && y === state.board.length - 2) {
            renderMessage(`${state.board[y].join('')} must differ by one letter from ${state.board[y + 1].join('')}`);
            state.mistakes += 1;
            state.board.splice(state.position.y, 1, emptyRow());
            state.position.x = 0;
        } else {
            state.position.x = 0;
            state.position.y += 1;

            if (!state.hardMode && state.position.y > state.board.length - 2) {
                state.board.splice(state.board.length - 1, 0, emptyRow());
            }
        }

        updateSavedGame();
    }

    render();
};

const deleteLastCompletedWord = () => {
    if (!state.hardMode || state.state !== STATES.PLAYING || state.position === null || state.position.y <= 1) {
        return;
    }

    const currentY = state.position.y;
    const previousY = currentY - 1;

    state.board[currentY] = emptyRow();
    state.board[previousY] = emptyRow();
    state.position = { x: 0, y: previousY };

    updateSavedGame();
    render();
};

const setupHandlers = () => {
    get('footer').addEventListener('click', (e) => {
        if (e.target.dataset.key) handleKey(e.target.dataset.key);
    });

    get('main').addEventListener('click', (e) => {
        if (!(e.target instanceof Element)) {
            return;
        }

        const cell = e.target.closest('.cell');

        if (!cell) {
            return;
        }

        const letter = cell.textContent.trim().toLowerCase();

        if (letter.length === 1 && letter >= 'a' && letter <= 'z') {
            handleKey(letter);
        }
    });

    document.addEventListener('keydown', (e) => handleKey(e.key));
};

const renderKeyboard = () => {
    const footer = get('footer');
    footer.innerHTML = '';

    if (state.state !== STATES.PLAYING) {
        return;
    }

    const template = get('#keyboard-template');
    footer.appendChild(template.content.cloneNode(true));
    footer.classList.add('visible');

    colorKeyboard();

    get('#back').style.display = 'inline-block';
};

const killKeyboard = () => {
    get('footer').innerHTML = '';
    get('footer').classList.remove('visible');
};

const renderWelcome = (app) => {
    stopClock();
    killKeyboard();

    const template = get('#welcome-template');
    app.innerHTML = '';
    app.appendChild(template.content.cloneNode(true));
    get('#play').disabled = !isDataLoaded;
    get('#practice').disabled = !isDataLoaded;
    get('#hard-mode').checked = state.hardMode;

    get('#play').addEventListener('click', () => {
        startGame(false);
    });

    get('#practice').addEventListener('click', () => {
        startGame(true);
    });

    get('#history').addEventListener('click', () => {
        state.state = STATES.HISTORY;
        render();
    });

    get('#hard-mode').addEventListener('change', (e) => {
        state.hardMode = e.target.checked;
        saveHardModeSetting(state.hardMode);
    });
};

const renderFinish = (app) => {
    killKeyboard();
    stopClock();

    const template = get('#finish-template');
    app.innerHTML = '';
    app.appendChild(template.content.cloneNode(true));

    get('#time').textContent = formatGameTime();
    get('#mistakes').textContent = state.mistakes;
    get('#words').textContent = state.board.length - 2;
    get('#puzzle-number').textContent = `#${state.puzzleNumber}`;

    const boardEl = renderBoard(state.board);

    get('#board-container').appendChild(boardEl);

    get('#practice').addEventListener('click', () => {
        startGame(true);
    });

    get('#history').addEventListener('click', () => {
        state.state = STATES.HISTORY;
        render();
    });

    if (!state.isPractice) {
        get('#copy').addEventListener('click', () => {
            copyShareText();
        });

        get('#share').addEventListener('click', () => {
            const data = {
                text: getShareText()
            };

            if (navigator.canShare && navigator.canShare(data)) {
                navigator.share(data).catch(() => {});
            } else {
                copyShareText();
            }
        });
    } else {
        get('#share').style.display = 'none';
        get('#copy').style.display = 'none';
        get('#puzzle-number').style.display = 'none';
    }
};

const renderHistory = (app) => {
    stopClock();
    killKeyboard();

    const template = get('#history-template');
    app.innerHTML = '';
    app.appendChild(template.content.cloneNode(true));

    const history = getHistory();
    const entries = Object.entries(history)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, game]) => formatHistoryEntry(date, game));

    const list = get('#history-list');

    if (entries.length === 0) {
        list.textContent = 'No games yet.';
        return;
    }

    entries.forEach((entry) => {
        list.appendChild(
            set(
                'div.history-entry',
                {},
                set('span.history-top', {}, entry.top),
                set('span.history-bottom', {}, entry.bottom)
            )
        );
    });
};

const getPositionClass = (y, x) => state.position?.x === x && state.position?.y === y ? 'current' : '';
const getCharClass = (char) => char === null ? 'normal' : state.pair[0].includes(char) ? 'start' : state.pair[1].includes(char) ? 'end' : 'misc';

const renderCell = (char, y, x) => set(`div.${[getPositionClass(y, x), getCharClass(char), 'cell'].join('.')}`, {}, char);
const renderRow = (chars, y) => chars.map((c, x) => renderCell(c, y, x));
const renderBoard = (board) => set('div.board', {}, ...board.flatMap((row, y) => renderRow(row, y)));

const renderHeaderButtons = () => {
    get('#back').style.display = state.state === STATES.WELCOME ? 'none' : 'inline-block';
    get('#reset').style.display = state.isPractice && state.state === STATES.PLAYING ? 'inline-block' : 'none';
};

const render = () => {
    const app = get('main');
    renderHeaderButtons();

    if (state.state === STATES.WELCOME) {
        renderWelcome(app);
        return;
    } else if (state.state === STATES.FINISHED) {
        renderFinish(app);
        return;
    } else if (state.state === STATES.HISTORY) {
        renderHistory(app);
        return;
    }

    app.innerHTML = '';

    const boardEl = renderBoard(state.board);
    const boardContainer = set('div.board-container', {}, boardEl);

    if (state.hardMode && state.position !== null && state.position.y > 1) {
        const deleteButtonTop = BOARD_PADDING_TOP + ((state.position.y - 1) * BOARD_ROW_SIZE) + (CELL_SIZE / 2);
        const deleteWordButton = set(
            'button.delete-word',
            { type: 'button', style: `top: ${deleteButtonTop}px`, ariaLabel: 'Delete previous word', title: 'Delete previous word', innerHTML: TRASH_ICON_SVG }
        );
        deleteWordButton.addEventListener('click', deleteLastCompletedWord);
        boardContainer.appendChild(deleteWordButton);
    }

    app.appendChild(boardContainer);

    app.scrollTo(0, app.scrollHeight);
};

get('#back').addEventListener('click', () => {
    stopClock();
    state.state = STATES.WELCOME;
    render();
});

get('#reset').addEventListener('click', () => {
    if (!state.isPractice) {
        return;
    }

    localStorage.removeItem('practice');
    startGame(true);
});

setupHandlers();

render();
loadWordData();
