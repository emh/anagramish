import { SummaryChart } from "./summary-chart.mjs";
import { HistoryChart } from "./history-chart.mjs";
import { key, numStars } from "./utils.mjs";

export class PopupStats extends HTMLElement {
    constructor(history) {
        console.log(history);
        super();

        const shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.append(template.content.cloneNode(true));
        shadowRoot.addEventListener('click', (e) => this.handleClick(e));

        const summaryStats = [
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0]
        ];

        const historyStats = [];
        let level = 0;
        const keys = Object.keys(history);

        keys.sort().forEach((k) => {
            const game = history[k];

            if (k === key()) return;

            const stars = game.finished ? numStars(game.numSeconds) : 0;

            historyStats.push({ date: k, level, stars });
            summaryStats[level][stars]++;

            if (stars <= 1 && level > 0) {
                level--;
            } else if (stars >= 4 && level < 4) {
                level++;
            }
        });

        console.log(summaryStats, historyStats);

        const summaryDiv = shadowRoot.getElementById('summary');
        summaryDiv.append(new SummaryChart(summaryStats));

        const historyDiv = shadowRoot.getElementById('history');
        historyDiv.append(new HistoryChart(historyStats));
    }

    handleClick(event) {
        if (event.target.nodeName === 'BUTTON') {
            this.dispatchEvent(new CustomEvent('buttonClick', { detail: { name: event.target.textContent } }));
        }
    }
}

customElements.define('popup-stats', PopupStats);

const template = document.createElement('template');

template.innerHTML = `
    <style>
        :host {
            position: fixed;
            top: var(--popup-top);
            left: 50%;
            transform: translate(-50%, 0);
            width: 400px;
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

        .scroll {
            border: solid 1px var(--popup-border-color);
            border-radius: var(--popup-border-radius);
            height: 400px;
            overflow-y: scroll;
            text-align: center;
        }

        .footer {
            font-size: 30px;
            text-align: center;
        }

        button {
            font-size: 20px;
        }

        #history {
                            padding-left: 40px;

        }
    </style>
    <div>
        <h1>ANAGRAMISH: Stats</h1>

        <div class="scroll">
            <h1>Summary</h1>
            <div id="summary"></div>
            <h1>History</h1>
            <div id="history"></div>
        </div>
        <div class="footer">
            <button>Game on!</button>
        </div>
    </div>
`;
