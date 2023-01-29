import { GameBoard } from "./game-board.mjs";
import { GameStars } from "./game-stars.mjs";

const state = {
    words: [
        'chart'.split(''),
        '     '.split(''),
        '     '.split(''),
        '     '.split(''),
        '     '.split(''),
        'spiel'.split('')
    ],
    position: { x: 0, y: 1 }
};

export class PopupHelp extends HTMLElement {
    constructor(type) {
        super();

        const shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.append(template.content.cloneNode(true));
        shadowRoot.addEventListener('click', (e) => this.handleClick(e));

        const game0 = shadowRoot.getElementById('game-0');
        game0.append(new GameBoard({
            words: [
                'chart'.split(''),
                '     '.split(''),
                '     '.split(''),
                '     '.split(''),
                '     '.split(''),
                'spiel'.split('')
            ],
            position: { x: 0, y: 1 }
        }, false));

        const game1 = shadowRoot.getElementById('game-1');
        game1.append(new GameBoard({
            ...state,
            words: [
                'chart'.split(''),
                'trash'.split(''),
                '     '.split(''),
                '     '.split(''),
                '     '.split(''),
                'spiel'.split('')
            ],
            position: { x: 0, y: 2 }
        }, false));

        const game2 = shadowRoot.getElementById('game-2');
        game2.append(new GameBoard({
            ...state,
            words: [
                'chart'.split(''),
                'trash'.split(''),
                'stare'.split(''),
                '     '.split(''),
                '     '.split(''),
                'spiel'.split('')
            ],
            position: { x: 0, y: 3 }
        }, false));

        const game3 = shadowRoot.getElementById('game-3');
        game3.append(new GameBoard({
            ...state,
            words: [
                'chart'.split(''),
                'trash'.split(''),
                'stare'.split(''),
                '     '.split(''),
                '     '.split(''),
                'spiel'.split('')
            ],
            position: { x: 0, y: 4 },
            flipped: true
        }, false));

        const game4 = shadowRoot.getElementById('game-4');
        game4.append(new GameBoard({
            ...state,
            words: [
                'chart'.split(''),
                'trash'.split(''),
                'stare'.split(''),
                '     '.split(''),
                'lapse'.split(''),
                'spiel'.split('')
            ],
            position: { x: 0, y: 3 },
            flipped: true
        }, false));

        const game5 = shadowRoot.getElementById('game-5');
        game5.append(new GameBoard({
            ...state,
            words: [
                'chart'.split(''),
                'trash'.split(''),
                'stare'.split(''),
                'spear'.split(''),
                'lapse'.split(''),
                'spiel'.split('')
            ],
            finished: true,
            position: { x: 0, y: 3 },
            flipped: true
        }, false));

        const stars = shadowRoot.getElementById('stars');
        stars.append(new GameStars(0));
    }

    handleClick(event) {
        if (event.target.nodeName === 'BUTTON') {
            this.dispatchEvent(new CustomEvent('buttonClick', { detail: { name: event.target.textContent } }));
        }
    }
}

customElements.define('popup-help', PopupHelp);

const template = document.createElement('template');

template.innerHTML = `
    <style>
        :host {
            position: fixed;
            top: var(--popup-top);
            left: 50%;
            transform: translate(-50%, 0);
            width: 350px;
            height: 600px;
            overflow-y: scroll;
            font-size: 20px;
            border: solid 1px var(--popup-border-color);
            border-radius: var(--popup-border-radius);
            background-color: var(--popup-background-color);
            box-shadow: 1px 1px 10px rgba(0, 0, 0, 0.25);
        }

        h1 {
            text-align: center;
            margin: 0;
            font-size: 30px;
        }

        div {
            padding: 10px;
            color: var(--popup-color);
        }

        .center { text-align: center; }

        .footer {
            font-size: 30px;
            text-align: center;
        }

        button {
            font-size: 20px;
        }

        #stars {
            margin-left: 20px;
        }
    </style>
    <div>
        <h1>ANAGRAMISH</h1>
        <p class="center">by <a target="_blank" href="http://twitter.com/emh">emh</a></p>
        <h1>How to Play</h1>

        <p>The game board has a start word and an end word.</p>
        <div id="game-0"></div>
        <p>Your goal is to find words that use 4 letters from the word above and 1 letter from the word at the bottom. In any order - like an anagram!</p>
        <div id="game-1"></div>
        <p>Repeat this until you've filled in all 4 words.</p>
        <div id="game-2"></div>
        <p>If you're stuck on a word you can try working the puzzle in the other direction by clicking the Flip button.</p>
        <div id="game-3"></div>
        <p>Now, same as before, find a word that uses 4 letters from the word above and 1 letter from the word at the bottom.</p>
        <div id="game-4"></div>
        <p>You win the game when you fill in the last word.</p>
        <div id="game-5"></div>
        <p>Your score is the number of stars still showing -- you lose a star for every minute you're working on the puzzle.</p>
        <div class="footer">
            <div id="stars"></div>
            <p>Ready?</p>
            <button>Game on!</button>
        </div>
    </div>
`;
