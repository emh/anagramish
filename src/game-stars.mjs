import { numStars } from './utils.mjs';

export class GameStars extends HTMLElement {
    constructor(seconds) {
        super();

        const n = numStars(seconds);

        const shadowRoot = this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');

        style.textContent = `
            :host {
                display: flex;
                gap: 10px;
                font-size: 40px;
            }
        `;

        shadowRoot.append(style);

        for (let i = 0; i < n; i++) {
            const star = document.createElement('div');
            star.textContent = '⭐';

            if (i === n - 1) {
                star.style.opacity = 1 - (seconds % 60) / 60;
            }

            shadowRoot.append(star);
        }
    }
}

customElements.define('game-stars', GameStars);

