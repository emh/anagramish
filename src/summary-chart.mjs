export class SummaryChart extends HTMLElement {
    constructor(stats) {
        super();

        const shadowRoot = this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');

        style.textContent = `
            :host {
                display: flex;
                align-items: center;
                flex-direction: column;
            }

            #chart > div {
                display: flex;
            }

            #chart > div > div {
                width: 25px;
                height: 25px;
                font-size: 10px;
            }
        `;

        shadowRoot.append(style);

        const div = document.createElement('div');
        div.id = "chart";

        div.innerHTML = `
            <div>
                <div>⬛</div><div>⬛</div><div>⬛</div><div>⬛</div><div>🟨</div>
                <div>${stats[0][0]}</div><div>${stats[0][1]}</div><div>${stats[0][2]}</div><div>${stats[0][3]}</div><div>${stats[0][4]}</div>
            </div>

            <div>
                <div>⬛</div><div>⬛</div><div>⬛</div><div>🟨</div><div>🟨</div>
                <div>${stats[1][0]}</div><div>${stats[1][1]}</div><div>${stats[1][2]}</div><div>${stats[1][3]}</div><div>${stats[1][4]}</div>
            </div>

            <div>
                <div>⬛</div><div>⬛</div><div>🟨</div><div>🟨</div><div>🟨</div>
                <div>${stats[2][0]}</div><div>${stats[2][1]}</div><div>${stats[2][2]}</div><div>${stats[2][3]}</div><div>${stats[2][4]}</div>
            </div>

            <div>
                <div>⬛</div><div>🟨</div><div>🟨</div><div>🟨</div><div>🟨</div>
                <div>${stats[3][0]}</div><div>${stats[3][1]}</div><div>${stats[3][2]}</div><div>${stats[3][3]}</div><div>${stats[3][4]}</div>
            </div>

            <div>
                <div>🟨</div><div>🟨</div><div>🟨</div><div>🟨</div><div>🟨</div>
                <div>${stats[4][0]}</div><div>${stats[4][1]}</div><div>${stats[4][2]}</div><div>${stats[4][3]}</div><div>${stats[4][4]}</div>
            </div>

            <div>
                <div></div><div></div><div></div><div></div><div></div>
                <div>⭐</div><div>⭐</div><div>⭐</div><div>⭐</div><div>⭐</div>
            </div>

            <div>
                <div></div><div></div><div></div><div></div><div></div>
                <div></div><div>⭐</div><div>⭐</div><div>⭐</div><div>⭐</div>
            </div>

            <div>
                <div></div><div></div><div></div><div></div><div></div>
                <div></div><div></div><div>⭐</div><div>⭐</div><div>⭐</div>
            </div>

            <div>
                <div></div><div></div><div></div><div></div><div></div>
                <div></div><div></div><div></div><div>⭐</div><div>⭐</div>
            </div>

            <div>
                <div></div><div></div><div></div><div></div><div></div>
                <div></div><div></div><div></div><div></div><div>⭐</div>
            </div>
        `;

        shadowRoot.append(div);
    }
}

customElements.define('summary-chart', SummaryChart);

