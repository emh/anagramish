export class PopupMessage extends HTMLElement {
    constructor(type) {
        super();

        const shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.append(template.content.cloneNode(true));
        shadowRoot.addEventListener('click', (e) => this.handleClick(e));
    }

    handleClick(event) {
        if (event.target.nodeName === 'BUTTON') {
            this.dispatchEvent(new CustomEvent('buttonClick', { detail: { name: event.target.textContent } }));
        }
    }
}

customElements.define('popup-message', PopupMessage);

const template = document.createElement('template');

template.innerHTML = `
    <style>
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
        </style>
    <div class="popup">
        <slot name="content"></slot>
    </div>
`;
