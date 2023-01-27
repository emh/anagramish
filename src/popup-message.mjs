export class PopupMessage extends HTMLElement {
    constructor(type) {
        super();

        const shadowRoot = this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        const div = document.createElement('div');
        const slot = document.createElement('slot');

        style.textContent = `
            :host {
                position: fixed;
                top: var(--popup-top);
                left: 50%;
                transform: translate(-50%, 0);
                width: 300px;
                font-size: 20px;
                border: solid 1px var(--popup-border-color);
                border-radius: var(--popup-border-radius);
                background-color: var(--popup-background-color);
                text-align: center;
                box-shadow: 1px 1px 10px rgba(0, 0, 0, 0.25);
            }

            div {
                padding: 10px;
                color: var(--popup-color);
            }

            .error {
                color: red;
            }

            .success {
                color: green;
            }
        `;

        shadowRoot.append(style);
        div.classList.add('popup');
        div.classList.add(type);
        slot.setAttribute('name', 'content');
        div.addEventListener('click', (e) => this.handleClick(e));
        div.append(slot);
        shadowRoot.append(div);
    }

    handleClick(event) {
        if (event.target.nodeName === 'BUTTON') {
            this.dispatchEvent(new CustomEvent('buttonClick', { detail: { name: event.target.textContent } }));
        }
    }
}

customElements.define('popup-message', PopupMessage);
