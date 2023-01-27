export class VirtualKeyboard extends HTMLElement {
    constructor(keys) {
        super();

        const shadowRoot = this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');

        style.textContent = `
            :host { 
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                cursor: pointer;
            }

            :host > div {
                display: flex;
                gap: 5px;
                height: 48px;
            }

            .key {
                display: flex;
                align-items: center;
                justify-content: center;
                border: solid 1px var(--key-border-color);
                border-radius: var(--letter-border-radius);
                background-color: var(--key-background-color);
                color: var(--key-color);
                height: 40px;
                width: 40px;
                font-size: 24px;
                text-transform: uppercase;
                box-sizing: border-box;
            }

            .control {
                width: 90px;
            }

            .disabled {
                opacity: 0.1;
            }
        `;
        shadowRoot.append(style);

        for (let row of keys) {
            const rowDiv = document.createElement('div');

            for (let key of row) {
                const keyDiv = document.createElement('div');

                keyDiv.className = `key${key.disabled ? ' disabled' : ''}${key.control ? ' control' : ''}`;
                keyDiv.textContent = key.value;
                if (!key.disabled) keyDiv.addEventListener('click', () => this.keyPress(key.value));
                rowDiv.append(keyDiv);
            }

            shadowRoot.append(rowDiv);
        }
    }

    keyPress(key) {
        this.dispatchEvent(new CustomEvent('keypress', { detail: { key } }));
    }
}

customElements.define('virtual-keyboard', VirtualKeyboard);
