import { api } from './api-client.mjs';
import { get, set } from './html.mjs';
import { compareWords, emptyBoard, emptyRow } from './utils.js';
import { tutorialLessons, checkTutorialWord } from './tutorial.mjs';
import { tutorialChoice } from './tutorial-experiment.mjs';
import { getAttribution } from './acquisition.mjs';
import { placeLetter, eraseLetter, rowComplete } from './puzzle-input.mjs';
import { animate, press, fly, clearFlights, rowFeedback } from './tile-motion.mjs';
import { setupTileDrag } from './tile-drag.mjs';

// The initial HTML is also the welcome screen, so rules are readable without JS.
const welcomeTemplate = document.createElement('template');
welcomeTemplate.innerHTML = get('main').innerHTML;

const STATES = {
    WELCOME: 'welcome',
    PLAYING: 'playing',
    TUTORIAL: 'tutorial',
    FINISHED: 'finished',
    HISTORY: 'history',
    PAST_GAME: 'past-game'
};
const GAME_VERSION = 2;
const FIRST_PUZZLE_DATE = '2026-03-02'; // v2 launch
const HARD_MODE_STORAGE_KEY = 'hard-mode';
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
    numSeconds: 0,
    pastGameKey: null,
    tutorial: null
};

let pairCount = 0;
let isDataLoaded = false;
let tutorialAssignment = {variant:'control', experiment:null};
let startingGame = false;
let checkingGuess = false;
const attribution = getAttribution;
getAttribution();
const loadWordData = async () => {
    try {
        const config = await api('/api/config');
        pairCount = config.pairCount;
        tutorialAssignment = tutorialChoice(config, location.search);
        isDataLoaded = true;
        flushTutorialEvents();
        render();
        let visitId = sessionStorage.getItem('anagramish-visit');
        if (!visitId) {visitId=crypto.randomUUID();sessionStorage.setItem('anagramish-visit',visitId);}
        api('/api/visit',{id:visitId,attribution:attribution()}).catch(()=>{});
    } catch {
        renderMessage('Unable to connect. Reload to try again.');
        if (state.state !== STATES.WELCOME) return;
        document.querySelector('#connection-retry')?.remove();
        const retry=document.createElement('button');retry.id='connection-retry';retry.textContent='Retry connection';retry.onclick=loadWordData;get('main').appendChild(retry);
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

const formatElapsedTime = (numSeconds) => {
    const minutes = Math.floor(numSeconds / 60);
    const seconds = numSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatGameTime = () => `${formatElapsedTime(state.numSeconds)}${state.hardMode ? ' 💪' : ''}`;
const formatShareDate = (dateKey) => dateKey.replace(/-/g, '.');
const getShareSquare = (char) => state.pair[0].includes(char) ? '🟦' : state.pair[1].includes(char) ? '🟧' : '⬜';

const getShareText = () => [
    `Anagramish ${formatShareDate(state.dailyKey ?? key())}`,
    `#${state.puzzleNumber} in ${formatGameTime()}`,
    ...state.board.slice(1, -1).map((row) => row.map(getShareSquare).join(''))
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

    if (pairCount === 0) {
        return 1;
    }

    const puzzleNumber = calcIndex(new Date(date), pairCount);

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
        date,
        top: ` #${puzzleNumber} ${start} ${end}`,
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

const isFilledWord = (word) => /^[a-z]{5}$/.test(word);
const toWord = (word) => Array.isArray(word) ? word.join('') : typeof word === 'string' ? word : '';

// v2 games store only the words between start and end; v1 games stored the whole board
const getPastBoard = (game) => {
    const pair = Array.isArray(game?.pair) ? game.pair.map(toWord) : [];
    const words = (Array.isArray(game?.words) ? game.words : []).map(toWord);
    const isVersion2 = game?.version === GAME_VERSION;
    const middle = (isVersion2 ? words : words.slice(1, -1)).filter(isFilledWord);
    const start = pair[0] ?? (isVersion2 ? '' : words[0] ?? '');
    const end = pair[1] ?? (isVersion2 ? '' : words.at(-1) ?? '');

    return [start, ...middle, end].map((w) => w.length === 5 ? w.split('') : emptyRow());
};

const getPastPair = (game, board) => [board[0].join(''), board.at(-1).join('')];

const isVersion2Game = (game) => isPlainObject(game) && game.version === GAME_VERSION;

const isVersion1Game = (game) => isPlainObject(game) && game.version === undefined && Array.isArray(game.pair);

// v1 games stored the full board (start and end included) and only saved words once finished
const upgradeVersion1Game = (date, game) => {
    const board = getPastBoard(game);

    return {
        version: GAME_VERSION,
        pair: getPastPair(game, board),
        puzzleNumber: getSavedPuzzleNumber(date, game),
        state: game.finished ? STATES.FINISHED : STATES.PLAYING,
        numSeconds: Number.isFinite(game.numSeconds) ? game.numSeconds : 0,
        words: board.slice(1, -1).map((row) => row.join('')),
        mistakes: 0
    };
};

const loadGame = () => {
    if (state.isPractice) {
        const game = readStorageJSON('practice');
        return isVersion2Game(game) ? game : null;
    }

    if (!state.dailyKey) {
        return undefined;
    }

    const game = getHistory()[state.dailyKey];

    if (isVersion1Game(game)) {
        return upgradeVersion1Game(state.dailyKey, game);
    }

    return isVersion2Game(game) ? game : null;
};

const newGame = (data) => ({
    version: GAME_VERSION, pair:data.pair, puzzleNumber:data.puzzleNumber,
    state:STATES.PLAYING, numSeconds:0, words:[], mistakes:0
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

const startGame = async (isPractice, dailyKey = key()) => {
    if (!isDataLoaded || startingGame || checkingGuess) return;
    startingGame = true;
    state.tutorial = null;
    stopClock();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    state.isPractice = isPractice;
    state.dailyKey = isPractice ? null : dailyKey;
    let game = loadGame();
    if (isPractice && game?.state === STATES.FINISHED) game = null;
    if (game?.state === STATES.FINISHED) {
        hydrateGameState(game,isPractice);
        startingGame=false;
        return;
    }
    renderMessage('Opening puzzle…');
    try {
        const id = game?.apiId && game.apiHardMode === state.hardMode ? game.apiId : crypto.randomUUID();
        const input={id,mode:isPractice?'practice':'daily',date:state.dailyKey,hard:state.hardMode,savedPair:game?.pair,resumed:!!game,attribution:attribution()};
        let data;
        try {data=await api('/api/start',input);}catch(error){
            if(error.status!==403)throw error;
            data=await api('/api/start',{...input,id:crypto.randomUUID()});
        }
        game = game ?? newGame(data);
        game.apiId = data.id;
        game.apiHardMode = state.hardMode;
        game.pair = data.pair;
        if(data.puzzleNumber !== null) game.puzzleNumber=data.puzzleNumber;
        saveGame(game);
        hydrateGameState(game,isPractice);
        get('#message').classList.remove('show');
    } catch(error) {
        renderMessage(error.message || 'Unable to open puzzle. Please try again.');
    } finally { startingGame=false; }
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
    if (state.tutorial) return;
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

const resetBoard = (pair, rowCount = 6) => {
    const board = emptyBoard(pair[0].length, rowCount);
    board[0] = pair[0].split('');
    board[rowCount - 1] = pair[1].split('');
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
const getHardModeEndLetterCount = (word) => compareWords(word, state.pair[1]);
const isValidHardModeProgression = (word, rowIndex) => getHardModeEndLetterCount(word) === rowIndex;
const getHardModeProgressMessage = (word, rowIndex) => {
    const endLetters = rowIndex;
    const startLetters = word.length - endLetters;
    const orangeLabel = endLetters === 1 ? 'orange letter' : 'orange letters';
    const blueLabel = startLetters === 1 ? 'blue letter' : 'blue letters';

    return `${word.join('')} must have ${startLetters} ${blueLabel} and ${endLetters} ${orangeLabel}`;
};

const colorKeyboard = () => {
    get('.key').forEach((el) => {
        const key = el.dataset.key;
        el.disabled = false;

        if (key === 'Backspace' || key === 'Enter') {
            el.classList.add('special');
            return;
        }

        if (!state.tutorial && state.hardMode && !isHardModeAllowedLetter(key)) {
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

let tileDrag;
const canInteract = () => [STATES.PLAYING, STATES.TUTORIAL].includes(state.state) && state.position !== null && !checkingGuess && !startingGame;
const activeBoard = () => document.querySelector('.board.interactive');
const cellAt = (y, x) => activeBoard()?.querySelector(`[data-y="${y}"][data-x="${x}"]`);
const keyElement = key => [...document.querySelectorAll('.key')].find(element => element.dataset.key === key);

const updateInputView = () => {
    const board = activeBoard();
    if (board) updateBoardCells(board, state.board, state.pair, state.position, true);
    document.querySelector('#enter')?.classList.toggle('ready', rowComplete(state.board, state.position));
};

const inputLetter = (letter, source, x = state.position?.x, from = null, origin) => {
    if (!canInteract() || (!state.tutorial && state.hardMode && !isHardModeAllowedLetter(letter))) return;
    const {y} = state.position;
    const displaced = from !== null ? state.board[y][x] : null;
    const displacedOrigin = from !== null ? cellAt(y, x).getBoundingClientRect() : null;
    if (!placeLetter(state.board, state.position, letter, x, from)) return;
    updateInputView();
    fly(source, cellAt(y, x), letter, origin);
    if (displaced !== null) fly(cellAt(y, x), cellAt(y, from), displaced, displacedOrigin);
};

const handleKey = async (key, source) => {
    const normalizedKey = key.length === 1 ? key.toLowerCase() : key;
    if (!canInteract()) return;
    tileDrag?.cancel();
    const button = keyElement(normalizedKey);
    if (button && !button.disabled) press(button);

    if (normalizedKey === 'Backspace') {
        clearFlights();
        const {y} = state.position;
        const x = eraseLetter(state.board, state.position);
        updateInputView();
        animate(cellAt(y, x), [{transform: 'scale(.92)'}, {transform: 'scale(1)'}], {duration: 160});
        return;
    } else if (normalizedKey === 'ArrowLeft' || normalizedKey === 'ArrowRight') {
        state.position.x = Math.max(0, Math.min(state.board[0].length - 1, state.position.x + (normalizedKey === 'ArrowLeft' ? -1 : 1)));
        updateInputView();
        return;
    } else if (isLetter(normalizedKey)) {
        inputLetter(normalizedKey, source || button);
        return;
    } else if (normalizedKey === 'Enter' && rowComplete(state.board, state.position)) {
        const { y } = state.position;
        clearFlights();
        if (state.tutorial) {
            submitTutorialWord();
            return;
        }
        checkingGuess = true;
        let verdict;
        try {
            verdict = await api('/api/guess',{id:loadGame()?.apiId,words:state.board.slice(1,y+1).map(row=>row.join(''))});
        } catch(error) {
            renderMessage(error.message || 'Unable to check word. Press Enter to retry.');
            rowFeedback(activeBoard(), y, true);
            return;
        } finally { checkingGuess = false; }
        if (!verdict.valid) {
            renderMessage(verdict.message);
            state.mistakes += 1;
            state.board.splice(state.position.y, 1, emptyRow());
            state.position.x = 0;
        } else if (y === state.board.length - 2 && compareWords(state.board[y], state.board[y + 1]) === 4) {
            state.position = null;
            state.state = STATES.FINISHED;
        } else if (state.hardMode && y === state.board.length - 2) {
            renderMessage(getHardModeProgressMessage(state.board[y], y));
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
        render();
        rowFeedback(document.querySelector('main .board'), y, state.position?.y === y);
        return;
    }
    if (normalizedKey === 'Enter') {
        if (state.tutorial) {
            state.tutorial.feedback = `Fill all ${state.board[0].length} letters, then press Enter.`;
            render();
        }
        rowFeedback(activeBoard(), state.position.y, true);
    }
};

const deleteLastCompletedWord = () => {
    if (checkingGuess || startingGame) return;
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
    tileDrag = setupTileDrag(get('main'), {
        canInteract, position: () => state.position,
        onDrop: ({letter, source, x, from, origin}) => inputLetter(letter, source, x, from, origin)
    });
    get('footer').addEventListener('click', event => {
        const button = event.target.closest('.key');
        if (button && !button.disabled) handleKey(button.dataset.key, button);
    });
    get('main').addEventListener('click', event => {
        const cell = event.target.closest('.board.interactive .cell');
        if (!cell || cell.disabled || !canInteract() || tileDrag.suppressClick()) return;
        press(cell);
        if (Number(cell.dataset.y) === state.position.y) {
            state.position.x = Number(cell.dataset.x);
            updateInputView();
        } else inputLetter(cell.textContent, cell);
    });
    document.addEventListener('keydown', event => {
        if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
        if (event.target instanceof Element && event.target.closest('input,select,textarea,[contenteditable]')) return;
        if (event.key === 'Enter' && event.target instanceof HTMLButtonElement && !event.target.matches('.key, .cell')) return;
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        if (canInteract() && (['Enter', 'Backspace', 'ArrowLeft', 'ArrowRight'].includes(key) || isLetter(key))) {
            event.preventDefault();
            handleKey(key);
        }
    });
};

const renderKeyboard = () => {
    const footer = get('footer');
    footer.innerHTML = '';

    if (![STATES.PLAYING, STATES.TUTORIAL].includes(state.state) || state.position === null) {
        return;
    }

    const template = get('#keyboard-template');
    footer.appendChild(template.content.cloneNode(true));
    footer.classList.add('visible');

    colorKeyboard();

    get('#back').style.display = 'inline-grid';
};

const killKeyboard = () => {
    get('footer').innerHTML = '';
    get('footer').classList.remove('visible');
};

const renderWelcome = (app) => {
    stopClock();
    killKeyboard();

    const template = welcomeTemplate;
    app.innerHTML = '';
    app.appendChild(template.content.cloneNode(true));
    get('#play').disabled = !isDataLoaded;
    get('#practice').disabled = !isDataLoaded;
    get('#hard-mode').checked = state.hardMode;
    get('#tutorial').addEventListener('click', startTutorial);

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

const syncResult = async (game, isPractice, dateKey) => {
    const status = document.querySelector('#result-status');
    if(!game.apiId) { if(status)status.textContent='Saved on this device.';return; }
    if(game.apiResultSaved) {if(status)status.textContent='Result saved.';return;}
    if(status)status.textContent='Saving result…';
    try {
        const result=await api('/api/complete',{id:game.apiId,words:game.words,seconds:game.numSeconds,mistakes:game.mistakes});
        if(!result.valid)throw new Error(result.message);
        const saved=isPractice?readStorageJSON('practice'):getHistory()[dateKey];
        if(saved?.apiId===game.apiId) {
            saved.apiResultSaved=true;
            if(isPractice)localStorage.setItem('practice',JSON.stringify(saved));
            else {const history=getHistory();history[dateKey]=saved;putHistory(history);}
        }
        if(status?.isConnected)status.textContent='Result saved.';
    }catch(error) {
        if(status?.isConnected) {
            status.textContent='Saved on this device. ';
            const retry=document.createElement('button');retry.textContent='Retry syncing';retry.onclick=()=>syncResult(game,isPractice,dateKey);status.appendChild(retry);
        }
    }
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
    syncResult(loadGame(),state.isPractice,state.dailyKey);

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

const getSortedHistoryKeys = (history) => Object.keys(history).sort((a, b) => b.localeCompare(a));

// date keys are local YYYY-MM-DD strings; do the arithmetic in UTC so DST can't skip or repeat a day
const addDays = (dateKey, n) => {
    const d = new Date(`${dateKey}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

// every day from today back to v2 launch (or an older saved game), newest first
const getHistoryDays = (history) => {
    const today = key();
    const oldestSaved = getSortedHistoryKeys(history).at(-1) ?? FIRST_PUZZLE_DATE;
    const oldest = oldestSaved < FIRST_PUZZLE_DATE ? oldestSaved : FIRST_PUZZLE_DATE;
    const days = [];

    for (let d = today; d >= oldest; d = addDays(d, -1)) {
        days.push(d);
    }

    return days;
};

const showPastGame = (date) => {
    state.state = STATES.PAST_GAME;
    state.pastGameKey = date;
    render();
};

const renderPastGameLink = (date) => {
    const link = set('a.history-date', { href: '#' }, date);

    link.addEventListener('click', (e) => {
        e.preventDefault();
        showPastGame(date);
    });

    return link;
};

const renderPastGame = async (app) => {
    stopClock();
    killKeyboard();

    const template = get('#past-game-template');
    app.innerHTML = '';
    app.appendChild(template.content.cloneNode(true));

    const history = getHistory();
    const date = state.pastGameKey;
    const game = history[date];
    const days = getHistoryDays(history);
    const older = date > days.at(-1) ? addDays(date, -1) : undefined;
    const newer = date < days[0] ? addDays(date, 1) : undefined;

    get('#past-date').textContent = date;

    get('#past-prev').disabled = !older;
    get('#past-next').disabled = !newer;
    get('#past-prev').addEventListener('click', () => older && showPastGame(older));
    get('#past-next').addEventListener('click', () => newer && showPastGame(newer));
    get('#history').addEventListener('click', () => {
        state.state = STATES.HISTORY;
        render();
    });

    const play = get('#past-play');

    if (!game) {
        if (!isDataLoaded) {
            get('#board-container').textContent = 'Loading...';
            return;
        }

        let pair, puzzleNumber;
        try {
            ({pair,puzzleNumber}=await api('/api/puzzle?date='+encodeURIComponent(date)));
            if(state.state!==STATES.PAST_GAME || state.pastGameKey!==date)return;
        } catch(error) {
            if(state.state===STATES.PAST_GAME && state.pastGameKey===date) {
                get('#board-container').textContent='Unable to load puzzle.';
                play.textContent='Retry';play.hidden=false;play.onclick=()=>render();
            }
            return;
        }

        get('#puzzle-number').textContent = `#${puzzleNumber} ${pair[0].toUpperCase()} ${pair[1].toUpperCase()}`;
        get('#past-details').textContent = 'Not played';
        get('#board-container').appendChild(renderBoard(resetBoard(pair), pair, null));

        play.textContent = 'Play';
        play.hidden = false;
        play.addEventListener('click', () => startGame(false, date));
        return;
    }

    const board = getPastBoard(game);
    const { top, bottom } = formatHistoryEntry(date, game);
    const isFinished = game.state === STATES.FINISHED || game.finished;

    get('#puzzle-number').textContent = top.trim();
    get('#past-details').textContent = isFinished ? bottom : `${bottom} (unfinished)`;

    if (!isFinished && (isVersion2Game(game) || isVersion1Game(game))) {
        play.hidden = false;
        play.disabled = !isDataLoaded;
        play.addEventListener('click', () => startGame(false, date));
    }

    get('#board-container').appendChild(renderBoard(board, getPastPair(game, board), null));
};

const renderHistory = (app) => {
    stopClock();
    killKeyboard();

    const template = get('#history-template');
    app.innerHTML = '';
    app.appendChild(template.content.cloneNode(true));

    const history = getHistory();
    const list = get('#history-list');

    getHistoryDays(history).forEach((date) => {
        if (!history[date]) {
            list.appendChild(
                set('div.history-entry.missed', {}, set('span.history-top', {}, renderPastGameLink(date), ' not played'))
            );
            return;
        }

        const entry = formatHistoryEntry(date, history[date]);

        list.appendChild(
            set(
                'div.history-entry',
                {},
                set('span.history-top', {}, renderPastGameLink(date), entry.top),
                set('span.history-bottom', {}, entry.bottom)
            )
        );
    });
};

// Tutorial events are separate from game sessions and never affect player results.
let pendingTutorialEvents = [];
let flushingTutorialEvents = false;
const flushTutorialEvents = async () => {
    if (!isDataLoaded || flushingTutorialEvents) return;
    flushingTutorialEvents = true;
    try {
        while (pendingTutorialEvents.length) {
            await api('/api/tutorial', pendingTutorialEvents[0]);
            pendingTutorialEvents.shift();
        }
    } catch {
        // Keep the failed event first; retry on the next event or reconnection.
    } finally { flushingTutorialEvents = false; }
};
window.addEventListener('online', flushTutorialEvents);
const recordTutorialEvent = (action) => {
    const t=state.tutorial;
    pendingTutorialEvents.push({id:t.id, action, lesson:t.lessonIndex+1,
        ...(t.experiment ? {experiment:t.experiment, variant:t.variant} : {}), attribution:attribution()});
    flushTutorialEvents();
};

const startTutorial = () => {
    if (startingGame || checkingGuess) return;
    stopClock();
    // Freeze the choice for the whole attempt, including offline/connection retry.
    state.tutorial = {id:crypto.randomUUID(), lessonIndex:0, feedback:null, ...tutorialAssignment};
    state.isPractice = false;
    state.dailyKey = null;
    recordTutorialEvent('start');
    openTutorialLesson(0);
};

const openTutorialLesson = (lessonIndex) => {
    const lesson = tutorialLessons(state.tutorial.variant)[lessonIndex];
    state.tutorial.lessonIndex = lessonIndex;
    recordTutorialEvent('lesson_start');
    state.tutorial.feedback = null;
    state.tutorial.showHint = false;
    state.state = STATES.TUTORIAL;
    state.pair = [lesson.path[0], lesson.path.at(-1)];
    state.board = resetBoard(state.pair, lesson.path.length);
    state.position = {x:0, y:1};
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    renderKeyboard();
    render();
    get('main').scrollTo(0,0);
};

const submitTutorialWord = () => {
    const t = state.tutorial;
    const {y} = state.position;
    const word = state.board[y].join('');
    const error = checkTutorialWord(t.lessonIndex, y - 1, word, t.variant);
    if (error) {
        t.feedback = error;
        state.board[y] = emptyRow(state.pair[0].length);
        state.position.x = 0;
    } else if (y === state.board.length - 2) {
        state.position = null;
        t.feedback = null;
        killKeyboard();
        recordTutorialEvent('lesson_complete');
        if (t.lessonIndex === tutorialLessons(t.variant).length - 1) {
            localStorage.setItem('anagramish-tutorial-completed', 'true');
            recordTutorialEvent('complete');
        }
    } else {
        state.position = {x:0, y:y+1};
        t.feedback = null;
        t.showHint = false;
    }
    render();
    rowFeedback(document.querySelector('main .board'), y, !!error);
};

const exitTutorial = () => {
    if (state.tutorial && !(state.position===null && state.tutorial.lessonIndex===tutorialLessons(state.tutorial.variant).length-1)) recordTutorialEvent('exit');
    state.tutorial = null;
    state.state = STATES.WELCOME;
    render();
};

const renderTutorial = (app) => {
    const t = state.tutorial;
    const lessons = tutorialLessons(t.variant);
    const lesson = lessons[t.lessonIndex];
    const done = state.position === null;
    const last = t.lessonIndex === lessons.length - 1;
    app.innerHTML = '';
    const section = set('section.tutorial-screen');
    section.append(
        set('p.tutorial-progress', {}, `Lesson ${t.lessonIndex+1} of ${lessons.length} · ${lesson.path[0].length} letters · No timer`),
        set('h2', {}, done && last ? 'Ready for today’s puzzle' : lesson.title),
        set('p', {}, lesson.description),
        renderBoard(state.board)
    );
    const coach = set('p#tutorial-feedback.tutorial-coach', {}, done ? lesson.success : t.feedback ?? (t.showHint ? lesson.hints[state.position.y-1] : lesson.prompts[state.position.y-1]));
    coach.setAttribute('role', 'status');
    coach.setAttribute('aria-live', 'polite');
    section.append(coach);
    const actions = set('div.tutorial-actions');
    if (done) {
        const next = set('button.tutorial-button.primary', {type:'button'}, last ? 'Play today’s puzzle' : 'Next lesson');
        next.disabled = last && !isDataLoaded;
        next.addEventListener('click', () => last ? startGame(false) : openTutorialLesson(t.lessonIndex+1));
        actions.append(next);
        if (last) {
            const replay = set('button.tutorial-button', {type:'button'}, 'Replay tutorial');
            replay.addEventListener('click', startTutorial);
            actions.append(replay);
            if (!isDataLoaded) {
                section.append(set('p.tutorial-help', {}, 'Reconnect to play the daily puzzle.'));
                const retry=set('button.tutorial-button',{type:'button'},'Retry connection');
                retry.addEventListener('click',loadWordData);actions.append(retry);
            }
        }
    } else {
        const hint = set('button.tutorial-button', {type:'button'}, t.showHint ? 'Show clue' : 'Show hint');
        hint.addEventListener('click', () => {t.showHint=!t.showHint;t.feedback=null;render();});
        actions.append(hint);
    }
    const exit = set('button.tutorial-button', {type:'button'}, done && last ? 'Home' : 'Skip tutorial');
    exit.addEventListener('click', exitTutorial);
    actions.append(exit);
    section.append(actions);
    if (!done) section.append(set('p.tutorial-help', {}, 'Use your keyboard or tap the letters below. Enter checks your word.'));
    app.append(section);
};

const getCharClass = (pair, char) => char === null ? 'normal' : pair[0].includes(char) ? 'start' : pair[1].includes(char) ? 'end' : 'misc';

const updateBoardCells = (element, board, pair, position, interactive) => {
    const cells = element.querySelectorAll('.cell');
    board.forEach((row, y) => row.forEach((char, x) => {
        const cell = cells[y * row.length + x];
        cell.className = `cell ${getCharClass(pair, char)}`;
        cell.classList.toggle('current', position?.y === y && position?.x === x);
        cell.classList.toggle('active-row', position?.y === y);
        cell.querySelector('.glyph').textContent = char ?? '';
        if (interactive) {
            cell.disabled = position?.y !== y && char === null;
            cell.classList.toggle('source', char !== null);
            cell.setAttribute('aria-current', position?.y === y && position?.x === x ? 'true' : 'false');
            cell.setAttribute('aria-label', `${y === 0 ? 'Start word' : y === board.length - 1 ? 'Goal word' : `Row ${y}`}, square ${x + 1}, ${char?.toUpperCase() ?? 'empty'}`);
        }
    }));
};

const renderBoard = (board, pair = state.pair, position = state.position) => {
    const interactive = board === state.board && position !== null && [STATES.PLAYING, STATES.TUTORIAL].includes(state.state);
    const element = set(`div.board${interactive ? '.interactive' : ''}`, {style: `--word-length: ${board[0].length}`});
    board.forEach((row, y) => row.forEach((char, x) => {
        const cell = set(`${interactive ? 'button' : 'div'}.cell`, interactive ? {type: 'button'} : {}, set('span.glyph', {}, char));
        cell.dataset.x = x;
        cell.dataset.y = y;
        element.append(cell);
    }));
    updateBoardCells(element, board, pair, position, interactive);
    return element;
};

const renderHeaderButtons = () => {
    get('#back').style.display = state.state === STATES.WELCOME ? 'none' : 'inline-grid';
    get('#reset').style.display = state.isPractice && state.state === STATES.PLAYING ? 'inline-grid' : 'none';
};

const render = () => {
    tileDrag?.cancel();
    clearFlights();
    const app = get('main');
    renderHeaderButtons();
    document.querySelector('#enter')?.classList.toggle('ready', rowComplete(state.board, state.position));

    if (state.state === STATES.WELCOME) {
        renderWelcome(app);
        return;
    } else if (state.state === STATES.TUTORIAL) {
        renderTutorial(app);
        return;
    } else if (state.state === STATES.FINISHED) {
        renderFinish(app);
        return;
    } else if (state.state === STATES.HISTORY) {
        renderHistory(app);
        return;
    } else if (state.state === STATES.PAST_GAME) {
        renderPastGame(app);
        return;
    }

    app.innerHTML = '';

    const boardEl = renderBoard(state.board);
    const boardContainer = set('div.board-container', {}, boardEl);

    if (state.hardMode && state.position !== null && state.position.y > 1) {
        const deleteWordButton = set(
            'button.delete-word',
            { type: 'button', style: `grid-row: ${state.position.y} / ${state.position.y + 1}`, ariaLabel: 'Delete previous word', title: 'Delete previous word', innerHTML: TRASH_ICON_SVG }
        );
        deleteWordButton.addEventListener('click', deleteLastCompletedWord);
        boardEl.appendChild(deleteWordButton);
    }

    app.appendChild(boardContainer);

    app.scrollTo(0, app.scrollHeight);
};

get('#back').addEventListener('click', () => {
    if (checkingGuess || startingGame) return;
    if (state.tutorial) {exitTutorial();return;}
    stopClock();
    state.tutorial = null;
    state.state = STATES.WELCOME;
    render();
});

get('#reset').addEventListener('click', () => {
    if (checkingGuess || startingGame) return;
    if (!state.isPractice) {
        return;
    }

    localStorage.removeItem('practice');
    startGame(true);
});

setupHandlers();
window.addEventListener('online', () => isDataLoaded ? flushTutorialEvents() : loadWordData());

render();
loadWordData();
