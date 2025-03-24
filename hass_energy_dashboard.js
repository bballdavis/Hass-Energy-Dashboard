class HassEnergyDashboard extends HTMLElement {
  constructor() {
    super();
    // ...existing code...
    this.attachShadow({ mode: 'open' });
    this._entities = { power: [], energy: [] };
    this._selectedPower = [];
    this._selectedEnergy = [];
  }

  setConfig(config) {
    // ...existing code...
    // The config would define which entities are W or Wh by default
    this._entities.power = config.power_entities || [];
    this._entities.energy = config.energy_entities || [];
    this.render();
  }

  render() {
    // ...existing code...
    this.shadowRoot.innerHTML = `
      <style>
        .container { display: flex; }
        .section1 { width: 200px; }
        .section2 { flex: 1; margin-left: 20px; }
      </style>
      <div class="container">
        <div class="section1">
          <h2>Power (W)</h2>
          ${this._entities.power.map(e => `
            <label>
              <input type="checkbox" data-type="power" data-entity="${e}" checked>
              ${e}
            </label><br/>
          `).join('')}
          <h2>Energy (Wh)</h2>
          ${this._entities.energy.map(e => `
            <label>
              <input type="checkbox" data-type="energy" data-entity="${e}" checked>
              ${e}
            </label><br/>
          `).join('')}
        </div>
        <div class="section2" id="chartContainer">
          <!-- apexcharts-card will go here -->
          <hui-card-preview>
            <apexcharts-card id="energyChart"
              series='[]'
              chart_type="line"
              hours_to_show="24">
            </apexcharts-card>
          </hui-card-preview>
        </div>
      </div>
    `;
    this.shadowRoot.querySelectorAll('input[type="checkbox"]')
      .forEach(box => box.addEventListener('change', () => this._toggleEntity(box)));
    this._updateChart();
  }

  _toggleEntity(box) {
    const entity = box.dataset.entity;
    const type = box.dataset.type;
    if (box.checked) {
      if (type === 'power') this._selectedPower.push(entity);
      else this._selectedEnergy.push(entity);
    } else {
      if (type === 'power') {
        this._selectedPower = this._selectedPower.filter(e => e !== entity);
      } else {
        this._selectedEnergy = this._selectedEnergy.filter(e => e !== entity);
      }
    }
    this._updateChart();
  }

  _updateChart() {
    // ...existing code...
    // This method would dynamically set apexcharts-card's entities property
    const chartElement = this.shadowRoot.querySelector('#energyChart');
    if (!chartElement) return;
    const mergedEntities = [...this._selectedPower, ...this._selectedEnergy];
    chartElement.setAttribute('series', JSON.stringify(
      mergedEntities.map(e => ({ entity: e }))
    ));
  }

  getCardSize() {
    return 3;
  }
}

customElements.define('hass-energy-dashboard', HassEnergyDashboard);
