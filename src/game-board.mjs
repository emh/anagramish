export class GameBoard extends HTMLElement {
    constructor(state) {
        super();

        const shadowRoot = this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');

        style.textContent = `
            :host { 
                display: grid;
                grid-template-rows: repeat(6, 1fr);
                gap: 5px;
                margin-left: 110px;
            }

            .row {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 5px;
            }

            .cell, .key {
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: var(--letter-border-radius);
                height: 50px;
                width: 50px;
                font-size: 40px;
                text-transform: uppercase;
                box-sizing: border-box;
                cursor: pointer;
                box-shadow: var(--letter-box-shadow);
            }

            .cell {
                background-color: var(--letter-background-color);
                border: solid 1px var(--border-color);
                color: var(--letter-color);
            }

            .key {
                background-color: var(--action-background-color);
                border: solid 1px var(--action-border-color);
                color: var(--action-color);
            }

            .start {
                background-color: var(--letter-background-color-start);
                border-color: var(--letter-border-color-start);
                color: var(--letter-color-start);
                box-shadow: var(--letter-box-shadow-start);
            }

            .end {
                background-color: var(--letter-background-color-end);
                border-color: var(--letter-border-color-end);
                color: var(--letter-color-end);
                box-shadow: var(--letter-box-shadow-end);
            }

            .active {
                border: solid 2px var(--letter-border-color-active);
                background-color: var(--letter-background-color-active);
            }

            .trash {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 50px;
                width: 50px;
                font-size: 30px;
                cursor: pointer;
            }
        `;

        shadowRoot.append(style);

        const startWord = state.words[0];
        const endWord = state.words[5];
        const words = state.flipped ? [...state.words].reverse() : state.words;

        words.forEach((w, y) => {
            const actualY = state.flipped ? 5 - y : y;
            const row = document.createElement('div');
            row.className = 'row';

            w.forEach((l, x) => {
                const cell = document.createElement('div');

                cell.classList.add('cell');
                if (startWord.indexOf(l) !== -1) cell.classList.add('start');
                if (endWord.indexOf(l) !== -1) cell.classList.add('end'); 
                if (!state.finished && x === state.position.x && actualY === state.position.y && actualY < 5) cell.classList.add('active');
                cell.textContent = l;
                if (l !== ' ') cell.addEventListener('click', () => this.letterPress(l))

                row.append(cell);
            });

            if (!state.finished) {
                if (y === (state.flipped ? 5 - state.position.y : state.position.y)) {
                    if (state.position.x > 0) {
                        const key = document.createElement('div');
    
                        key.textContent = '⌫';
                        key.className = 'key';
                        key.addEventListener('click', () => this.backspacePress())
                        row.append(key);
                    }

                    if (state.position.x === 5) {
                        const key = document.createElement('div');
    
                        key.textContent = '⏎';
                        key.className = 'key';
                        key.addEventListener('click', () => this.enterPress())
                        row.append(key);
                    }
                } else if (
                    (!state.flipped && state.position.y > 1 && y === state.position.y - 1) ||
                    (state.flipped && state.position.y < 4 && y === 5 - state.position.y - 1)
                ) {
                    const key = document.createElement('div');

                    key.textContent = '🗑️';
                    key.className = 'trash';
                    key.addEventListener('click', () => this.trashPress())
                    row.append(key);
                }
            }

            shadowRoot.append(row);
        });
    }

    letterPress(letter) {
        this.dispatchEvent(new CustomEvent('letterPress', { detail: { letter } }));
    }

    enterPress() {
        this.dispatchEvent(new CustomEvent('enterPress'));
    }

    backspacePress() {
        this.dispatchEvent(new CustomEvent('backspacePress'));
    }

    trashPress() {
        this.dispatchEvent(new CustomEvent('trashPress'));
    }
}

customElements.define('game-board', GameBoard);
