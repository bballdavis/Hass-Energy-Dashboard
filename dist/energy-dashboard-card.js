class EnergyDashboardCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.selectedEntities = [];
    }

    setConfig(config) {
        if (!config) {
            throw new Error("Invalid configuration");
        }
        this.config = config;
        this.render();
    }

    set hass(hass) {
        this._hass = hass;
        this.render();
    }

    render() {
        if (!this._hass || !this.config) return;

        // Clear the shadow DOM
        this.shadowRoot.innerHTML = "";

        // Create the card container
        const card = document.createElement("ha-card");
        card.style.width = "100%";
        card.style.padding = "16px";

        // Add the chart
        const chartContainer = document.createElement("div");
        chartContainer.style.width = "100%";
        chartContainer.style.height = "300px";
        chartContainer.style.marginBottom = "16px";

        const chartConfig = {
            type: "custom:apexcharts-card",
            series: this.selectedEntities.map((entity) => ({
                entity: entity,
                name: this._hass.states[entity].attributes.friendly_name || entity,
                type: "line",
            })),
            graph_span: "24h",
            update_interval: 60,
        };

        const chart = document.createElement("hui-element");
        chart.setConfig(chartConfig);
        chart.hass = this._hass;
        chartContainer.appendChild(chart);
        card.appendChild(chartContainer);

        // Add the entity list
        const entityList = document.createElement("div");
        entityList.style.display = "flex";
        entityList.style.flexDirection = "column";

        const entities = Object.keys(this._hass.states).filter((entityId) => {
            const stateObj = this._hass.states[entityId];
            const unit = stateObj.attributes.unit_of_measurement;
            return unit === "W" || unit === "Wh";
        });

        entities.forEach((entity) => {
            const entityRow = document.createElement("div");
            entityRow.style.display = "flex";
            entityRow.style.justifyContent = "space-between";
            entityRow.style.alignItems = "center";
            entityRow.style.marginBottom = "8px";

            const entityName = document.createElement("span");
            entityName.textContent =
                this._hass.states[entity].attributes.friendly_name || entity;

            const toggle = document.createElement("ha-switch");
            toggle.checked = this.selectedEntities.includes(entity);
            toggle.addEventListener("change", () => {
                if (toggle.checked) {
                    this.selectedEntities.push(entity);
                } else {
                    this.selectedEntities = this.selectedEntities.filter(
                        (e) => e !== entity
                    );
                }
                this.render();
            });

            entityRow.appendChild(entityName);
            entityRow.appendChild(toggle);
            entityList.appendChild(entityRow);
        });

        card.appendChild(entityList);

        // Append the card to the shadow DOM
        this.shadowRoot.appendChild(card);
    }

    getCardSize() {
        return 5;
    }
}

customElements.define("energy-dashboard-card", EnergyDashboardCard);