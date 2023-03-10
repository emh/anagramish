export class HistoryChart extends HTMLElement {
    constructor(stats) {
        super();

        const shadowRoot = this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');

        style.textContent = `
            :host {
                text-align: left;
                font-size: 16px;
            }
        `;

        shadowRoot.append(style);

        const div = document.createElement('div');
        div.id = "chart";

        console.log(stats);

        div.innerHTML = stats.map((entry) => {
            return `<div>
                ${'⬛'.repeat(4 - entry.level)}${'🟨'.repeat(entry.level + 1)}
                ${entry.date}
                ${'⭐'.repeat(entry.stars)}
            </div>`;
        }).join('');

        shadowRoot.append(div);
    }
}

customElements.define('history-chart', HistoryChart);

