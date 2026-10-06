import { get, set } from './html.mjs';
import { compareWords, emptyBoard, emptyRow } from './utils.js';

const STATES = {
    WELCOME: 'welcome',
    PLAYING: 'playing',
    FINISHED: 'finished',
    HISTORY: 'history',
    PAST_GAME: 'past-game'
};
const GAME_VERSION = 2;
const FIRST_PUZZLE_DATE = '2026-03-02'; // v2 launch
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
    numSeconds: 0,
    pastGameKey: null
};

let pairCount = 0;
let isDataLoaded = false;
let startingGame = false;
let checkingGuess = false;
const attribution = () => {
    const params = new URLSearchParams(location.search);
    return {source:params.get('utm_source'),medium:params.get('utm_medium'),campaign:params.get('utm_campaign'),referrer:document.referrer,landing:location.pathname};
};
const api = async (path, data) => {
    const response = await fetch(path, data === undefined ? {signal:AbortSignal.timeout(15000)} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(15000)});
    if (!response.ok) {
        const error = await response.json().catch(()=>({}));
        const failure=new Error(error.error || 'Connection interrupted. Please try again.');failure.status=response.status;throw failure;
    }
    return response.json();
};
const loadWordData = async () => {
    try {
        const config = await api('/api/config');
        pairCount = config.pairCount;
        isDataLoaded = true;
        render();
        let visitId = sessionStorage.getItem('anagramish-visit');
        if (!visitId) {visitId=crypto.randomUUID();sessionStorage.setItem('anagramish-visit',visitId);}
        api('/api/visit',{id:visitId,attribution:attribution()}).catch(()=>{});
    } catch {
        renderMessage('Unable to connect. Reload to try again.');
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

const handleKey = async (key) => {
    const normalizedKey = key.length === 1 ? key.toLowerCase() : key;

    if (state.state !== STATES.PLAYING || state.position === null || checkingGuess || startingGame) {
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

        checkingGuess = true;
        let verdict;
        try {
            verdict = await api('/api/guess',{id:loadGame()?.apiId,words:state.board.slice(1,y+1).map(row=>row.join(''))});
        } catch(error) {
            renderMessage(error.message || 'Unable to check word. Press Enter to retry.');
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
    }

    render();
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

const getPositionClass = (position, y, x) => position?.x === x && position?.y === y ? 'current' : '';
const getCharClass = (pair, char) => char === null ? 'normal' : pair[0].includes(char) ? 'start' : pair[1].includes(char) ? 'end' : 'misc';

const renderCell = (char, y, x, pair, position) => set(`div.${[getPositionClass(position, y, x), getCharClass(pair, char), 'cell'].join('.')}`, {}, char);
const renderRow = (chars, y, pair, position) => chars.map((c, x) => renderCell(c, y, x, pair, position));
const renderBoard = (board, pair = state.pair, position = state.position) => set('div.board', {}, ...board.flatMap((row, y) => renderRow(row, y, pair, position)));

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
    } else if (state.state === STATES.PAST_GAME) {
        renderPastGame(app);
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
    if (checkingGuess || startingGame) return;
    stopClock();
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

render();
loadWordData();
