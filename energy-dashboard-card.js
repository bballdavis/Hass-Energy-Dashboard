const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

// Merged info/metadata
const info = {
  name: "Energy Dashboard Card",
  version: "2.0.0",
  description: "A single Lovelace card that can display either Entity or Chart mode.",
  documentationURL: "https://github.com/yourusername/hass-energy-dashboard"
};

console.info(
  `%c ${info.name} %c ${info.version} `,
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);

class EnergyDashboardCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      selectedPowerEntities: { type: Array },
      selectedEnergyEntities: { type: Array },
      chartConfig: { type: Object },
      lastUpdated: { type: Number },
      powerEntities: { type: Array },
      energyEntities: { type: Array },
      entityToggleStates: { type: Object },
      energyEntityToggleStates: { type: Object }
    };
  }

  static get styles() {
    return css`
      :host {
        --card-padding: 16px;
        --entity-height: 12px;
        --entity-width: 240px;
        --button-height: 32px;
        --entity-font-size: 0.95em;
        --section-title-font-size: 0.9975em;
      }
      .card-header {
        padding: var(--card-padding);
        font-family: var(--paper-font-headline_-_font-family);
        -webkit-font-smoothing: var(--paper-font-headline_-_-webkit-font-smoothing);
        font-size: var(--paper-font-headline_-_font-size);
        font-weight: var(--paper-font-headline_-_font-weight);
        letter-spacing: var(--paper-font-headline_-_letter-spacing);
        line-height: var(--paper-font-headline_-_line-height);
        color: var(--ha-card-header-color, --primary-text-color);
      }
      .control-buttons {
        padding: 0 var(--card-padding) 8px;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }
      .control-button {
        background-color: var(--secondary-background-color);
        border: none;
        border-radius: 8px;
        padding: 6px 12px;
        color: var(--primary-text-color);
        font-size: 0.9em;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s ease;
        flex: 1;
        margin: 0 4px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        height: var(--button-height);
        min-height: var(--button-height);
        box-sizing: border-box;
      }
      .control-button:first-child {
        margin-left: 0;
      }
      .control-button:last-child {
        margin-right: 0;
      }
      .control-button:hover {
        background-color: var(--primary-color);
        color: var(--text-primary-color);
      }
      .control-button ha-icon {
        margin-right: 4px;
        --mdc-icon-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .section-title {
        padding: 6px var(--card-padding);
        font-size: var(--section-title-font-size);
        font-weight: 500;
        color: var(--primary-text-color);
        display: flex;
        align-items: center;
      }
      .entities-container {
        padding: 0 var(--card-padding) var(--card-padding);
        display: flex;
        flex-direction: column;
        gap: 8px;
        justify-content: flex-start;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--scrollbar-thumb-color) transparent;
        width: calc(100% - (var(--card-padding) * 2));
        box-sizing: border-box;
        min-width: 100%;
      }
      .entities-container::-webkit-scrollbar {
        width: 6px;
      }
      .entities-container::-webkit-scrollbar-track {
        background: transparent;
      }
      .entities-container::-webkit-scrollbar-thumb {
        background-color: var(--scrollbar-thumb-color, var(--divider-color, #e0e0e0));
        border-radius: 3px;
      }
      .entity-item {
        background-color: var(--ha-card-background, var(--card-background-color, white));
        border-radius: 12px;
        padding: 8px 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        height: auto;
        min-height: var(--entity-height);
        width: 100%;
        box-sizing: border-box;
        flex-grow: 1;
        flex-shrink: 0;
        min-width: 100%;
        max-width: 100%;
        margin-bottom: 2px;
      }
      .entity-item:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-1px);
      }
      .entity-item.on {
        background-color: var(--primary-color);
        color: var(--text-primary-color);
      }
      .entity-left {
        display: flex;
        flex-direction: column;
        justify-content: center;
        flex: 3;
        min-width: 0;
        margin-top: -1px;
        margin-bottom: -1px;
      }
      .entity-name {
        font-weight: bold;
        font-size: 0.95em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        flex: 1;
        margin-right: 16px;
      }
      .entity-state {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        min-width: 85px;
        max-width: 85px;
        white-space: nowrap;
        flex: 0 0 auto;
        font-size: 0.95em;
      }
      .power-value {
        font-weight: 500;
      }
      .empty-message {
        padding: var(--card-padding);
        text-align: center;
        color: var(--secondary-text-color);
      }
      .section-separator {
        height: 1px;
        background-color: var(--divider-color, #e0e0e0);
        margin: 12px var(--card-padding) 8px;
        opacity: 0.6;
      }
      .chart-container {
        width: 100%;
        height: 100%;
        min-height: 300px;
      }
      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        text-align: center;
        color: var(--secondary-text-color);
      }
      .loading ha-circular-progress {
        margin-bottom: 16px;
      }
      .chart-section {
        margin-top: 12px;
      }
      .chart-section-title {
        padding: 0 var(--card-padding) 8px;
        font-size: 16px;
        font-weight: 500;
        color: var(--primary-text-color);
        display: flex;
        align-items: center;
      }
    `;
  }

  constructor() {
    super();
    this.selectedPowerEntities = [];
    this.selectedEnergyEntities = [];
    this.chartConfig = null;
    this.lastUpdated = Date.now();
    this.powerEntities = [];
    this.energyEntities = [];
    this.entityToggleStates = {};
    this.energyEntityToggleStates = {};
    this._initialized = false;
    this._energyInitialized = false;
    this._checkEntitySelectionsInterval = null;
  }

  setConfig(config) {
    this.config = {
      card_type: "entity",
      title: 'Energy Dashboard',
      show_header: true,
      show_state: true,
      show_toggle: true,
      auto_select_count: 6,
      max_height: 400,
      show_energy_section: true,
      energy_auto_select_count: 6,
      chart_type: 'line',
      chart_height: '300px',
      refresh_interval: 30,
      span: {
        start: "hour",
        offset: -1
      },
      show_power_chart: true,
      show_energy_chart: true,
      power_chart_type: 'line',
      energy_chart_type: 'bar',
      ...config
    };
    this._apexChartsAvailable = typeof customElements.get('apexcharts-card') !== 'undefined';
    if (!this._apexChartsAvailable) {
      console.warn("ApexCharts Card not found. The chart will show an error message.");
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._initializeEntityMonitoring();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._checkEntitySelectionsInterval) {
      clearInterval(this._checkEntitySelectionsInterval);
    }
  }

  _initializeEntityMonitoring() {
    this._checkEntitySelectionsInterval = setInterval(() => {
      this._updateSelectedEntities();
    }, 5000);
    this._updateSelectedEntities();
  }

  _updateSelectedEntities() {
    try {
      const powerToggleStates = this._loadToggleStates('energy-dashboard-power-toggle-states');
      const energyToggleStates = this._loadToggleStates('energy-dashboard-energy-toggle-states');
      if (!this.hass) return;
      let powerEntitiesChanged = false;
      let energyEntitiesChanged = false;
      const newSelectedPowerEntities = Object.keys(powerToggleStates || {})
        .filter(entityId => powerToggleStates[entityId] && this.hass.states[entityId])
        .map(entityId => ({
          entityId,
          name: this.hass.states[entityId].attributes.friendly_name || entityId,
          unit: this.hass.states[entityId].attributes.unit_of_measurement || 'W'
        }));
      const newSelectedEnergyEntities = Object.keys(energyToggleStates || {})
        .filter(entityId => energyToggleStates[entityId] && this.hass.states[entityId])
        .map(entityId => ({
          entityId,
          name: this.hass.states[entityId].attributes.friendly_name || entityId,
          unit: this.hass.states[entityId].attributes.unit_of_measurement || 'kWh'
        }));
      if (JSON.stringify(newSelectedPowerEntities) !== JSON.stringify(this.selectedPowerEntities)) {
        this.selectedPowerEntities = newSelectedPowerEntities;
        powerEntitiesChanged = true;
      }
      if (JSON.stringify(newSelectedEnergyEntities) !== JSON.stringify(this.selectedEnergyEntities)) {
        this.selectedEnergyEntities = newSelectedEnergyEntities;
        energyEntitiesChanged = true;
      }
      const currentTime = Date.now();
      if (powerEntitiesChanged || energyEntitiesChanged || 
          (currentTime - this.lastUpdated) > (this.config.refresh_interval * 1000)) {
        this._updateChartConfig();
        this.lastUpdated = currentTime;
      }
    } catch (e) {
      console.error('Error updating selected entities:', e);
    }
  }

  _loadToggleStates(key) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error(`Failed to load toggle states for ${key}:`, e);
      return {};
    }
  }

  _updateChartConfig() {
    if (!this.hass) return;
    let charts = [];
    if (this.config.show_power_chart && this.selectedPowerEntities.length > 0) {
      charts.push(this._createPowerChartConfig());
    }
    if (this.config.show_energy_chart && this.selectedEnergyEntities.length > 0) {
      charts.push(this._createEnergyChartConfig());
    }
    this.chartConfig = {
      key: `energy-dashboard-chart-${Date.now()}`,
      charts: charts
    };
    this.requestUpdate();
  }

  _createPowerChartConfig() {
    return {
      type: this.config.power_chart_type || 'line',
      header: {
        show: true,
        title: 'Power Consumption',
        show_states: true,
        colorize_states: true
      },
      span: this.config.span,
      apex_config: {
        chart: {
          height: this.config.chart_height,
          zoom: {
            enabled: true
          }
        },
        yaxis: {
          decimalsInFloat: 1,
          labels: {
            formatter: (val) => `${Math.round(val)} W`
          },
          title: {
            text: 'Power (W)'
          }
        }
      },
      series: this.selectedPowerEntities.map(entity => ({
        entity: entity.entityId,
        name: entity.name
      }))
    };
  }

  _createEnergyChartConfig() {
    return {
      type: this.config.energy_chart_type || 'bar',
      header: {
        show: true,
        title: 'Energy Consumption',
        show_states: true,
        colorize_states: true
      },
      span: this.config.span,
      apex_config: {
        chart: {
          height: this.config.chart_height,
          zoom: {
            enabled: true
          }
        },
        yaxis: {
          decimalsInFloat: 2,
          labels: {
            formatter: (val) => `${val.toFixed(2)} ${this.selectedEnergyEntities.length > 0 ? this.selectedEnergyEntities[0].unit : 'kWh'}`
          },
          title: {
            text: 'Energy (kWh/Wh)'
          }
        }
      },
      series: this.selectedEnergyEntities.map(entity => ({
        entity: entity.entityId,
        name: entity.name
      }))
    };
  }

  updated(changedProps) {
    if (changedProps.has('hass')) {
      this._updateSelectedEntities();
    }
  }

  _updateEntities() {
    if (!this.hass) return;
    try {
      this._updatePowerEntities();
      if (this.config.show_energy_section) {
        this._updateEnergyEntities();
      }
    } catch (e) {
      console.error("Error updating entities:", e);
    }
  }

  _updatePowerEntities() {
    const newPowerEntities = Object.keys(this.hass.states)
      .filter(entityId => {
        const stateObj = this.hass.states[entityId];
        return stateObj && stateObj.attributes && 
              (stateObj.attributes.unit_of_measurement === 'W' || 
               stateObj.attributes.unit_of_measurement === 'kW');
      })
      .map(entityId => {
        const stateObj = this.hass.states[entityId];
        const domain = entityId.split('.')[0];
        const isToggleable = ['switch', 'light', 'input_boolean', 'fan', 'automation'].includes(domain);
        let powerValue = 0;
        try {
          if (stateObj.attributes.unit_of_measurement === 'kW') {
            powerValue = parseFloat(stateObj.state) * 1000;
          } else {
            powerValue = parseFloat(stateObj.state) || 0;
          }
        } catch (e) {
          console.warn(`Error parsing power value for ${entityId}:`, e);
          powerValue = 0;
        }
        return {
          entityId,
          name: stateObj.attributes.friendly_name || entityId,
          state: stateObj.state,
          unit: stateObj.attributes.unit_of_measurement,
          powerValue,
          isToggleable
        };
      })
      .sort((a, b) => b.powerValue - a.powerValue);
    if (!this._initialized || Object.keys(this.entityToggleStates).length === 0) {
      this._initializePowerToggleStates(newPowerEntities);
      this._initialized = true;
    }
    this.powerEntities = newPowerEntities.map(entity => ({
      ...entity,
      isOn: this.entityToggleStates[entity.entityId] || false
    }));
    this._savePowerToggleStates();
  }

  _updateEnergyEntities() {
    const newEnergyEntities = Object.keys(this.hass.states)
      .filter(entityId => {
        const stateObj = this.hass.states[entityId];
        return stateObj && stateObj.attributes && 
              (stateObj.attributes.unit_of_measurement === 'Wh' || 
               stateObj.attributes.unit_of_measurement === 'kWh');
      })
      .map(entityId => {
        const stateObj = this.hass.states[entityId];
        const domain = entityId.split('.')[0];
        const isToggleable = ['switch', 'light', 'input_boolean', 'fan', 'automation'].includes(domain);
        let energyValue = 0;
        try {
          if (stateObj.attributes.unit_of_measurement === 'Wh') {
            energyValue = parseFloat(stateObj.state) / 1000;
          } else {
            energyValue = parseFloat(stateObj.state) || 0;
          }
        } catch (e) {
          console.warn(`Error parsing energy value for ${entityId}:`, e);
          energyValue = 0;
        }
        return {
          entityId,
          name: stateObj.attributes.friendly_name || entityId,
          state: stateObj.state,
          unit: stateObj.attributes.unit_of_measurement,
          energyValue,
          isToggleable
        };
      })
      .sort((a, b) => b.energyValue - a.energyValue);
    if (!this._energyInitialized || Object.keys(this.energyEntityToggleStates).length === 0) {
      this._initializeEnergyToggleStates(newEnergyEntities);
      this._energyInitialized = true;
    }
    this.energyEntities = newEnergyEntities.map(entity => ({
      ...entity,
      isOn: this.energyEntityToggleStates[entity.entityId] || false
    }));
    this._saveEnergyToggleStates();
  }

  _initializePowerToggleStates(entities) {
    const savedStates = this._loadToggleStates('energy-dashboard-power-toggle-states');
    if (savedStates && Object.keys(savedStates).length > 0) {
      this.entityToggleStates = savedStates;
    } else {
      const toggleStates = {};
      entities.slice(0, this.config.auto_select_count).forEach(entity => {
        toggleStates[entity.entityId] = true;
      });
      this.entityToggleStates = toggleStates;
    }
  }

  _initializeEnergyToggleStates(entities) {
    const savedStates = this._loadToggleStates('energy-dashboard-energy-toggle-states');
    if (savedStates && Object.keys(savedStates).length > 0) {
      this.energyEntityToggleStates = savedStates;
    } else {
      const toggleStates = {};
      entities.slice(0, this.config.energy_auto_select_count).forEach(entity => {
        toggleStates[entity.entityId] = true;
      });
      this.energyEntityToggleStates = toggleStates;
    }
  }

  _savePowerToggleStates() {
    this._saveToggleStates(this.entityToggleStates, 'energy-dashboard-power-toggle-states');
  }

  _saveEnergyToggleStates() {
    this._saveToggleStates(this.energyEntityToggleStates, 'energy-dashboard-energy-toggle-states');
  }

  _saveToggleStates(states, key) {
    try {
      localStorage.setItem(key, JSON.stringify(states));
    } catch (e) {
      console.error(`Failed to save toggle states for ${key}:`, e);
      try {
        const reducedStates = {};
        Object.keys(states).forEach(key => {
          if (states[key]) {
            reducedStates[key] = true;
          }
        });
        localStorage.setItem(key, JSON.stringify(reducedStates));
      } catch (e2) {
        console.error(`Failed to save reduced toggle states for ${key}:`, e2);
      }
    }
  }

  _togglePowerEntity(ev) {
    const entityId = ev.currentTarget.dataset.entity;
    if (!entityId || !this.config.show_toggle) return;
    this.entityToggleStates[entityId] = !this.entityToggleStates[entityId];
    this.powerEntities = this.powerEntities.map(entity => 
      entity.entityId === entityId 
        ? { ...entity, isOn: this.entityToggleStates[entity.entityId] } 
        : entity
    );
    this._savePowerToggleStates();
    this.requestUpdate();
    this._controlEntity(entityId, this.entityToggleStates[entityId]);
  }

  _toggleEnergyEntity(ev) {
    const entityId = ev.currentTarget.dataset.entity;
    if (!entityId || !this.config.show_toggle) return;
    this.energyEntityToggleStates[entityId] = !this.energyEntityToggleStates[entityId];
    this.energyEntities = this.energyEntities.map(entity => 
      entity.entityId === entityId 
        ? { ...entity, isOn: this.energyEntityToggleStates[entity.entityId] } 
        : entity
    );
    this._saveEnergyToggleStates();
    this.requestUpdate();
    this._controlEntity(entityId, this.energyEntityToggleStates[entityId]);
  }

  _controlEntity(entityId, isOn) {
    const domain = entityId.split('.')[0];
    if (['switch', 'light', 'input_boolean', 'fan', 'automation'].includes(domain)) {
      const service = isOn ? 'turn_on' : 'turn_off';
      this.hass.callService(domain, service, { entity_id: entityId });
    }
  }

  _resetToPowerDefaultEntities() {
    if (!this.powerEntities || this.powerEntities.length === 0) return;
    const newToggleStates = {};
    this.powerEntities
      .slice(0, this.config.auto_select_count)
      .forEach(entity => {
        newToggleStates[entity.entityId] = true;
      });
    this.entityToggleStates = newToggleStates;
    this._updatePowerEntityStates();
    this._savePowerToggleStates();
  }

  _resetToEnergyDefaultEntities() {
    if (!this.energyEntities || this.energyEntities.length === 0) return;
    const newToggleStates = {};
    this.energyEntities
      .slice(0, this.config.energy_auto_select_count)
      .forEach(entity => {
        newToggleStates[entity.entityId] = true;
      });
    this.energyEntityToggleStates = newToggleStates;
    this._updateEnergyEntityStates();
    this._saveEnergyToggleStates();
  }

  _clearAllPowerEntities() {
    const newToggleStates = {};
    this.powerEntities.forEach(entity => {
      newToggleStates[entity.entityId] = false;
    });
    this.entityToggleStates = newToggleStates;
    this._updatePowerEntityStates();
    this._savePowerToggleStates();
  }

  _clearAllEnergyEntities() {
    const newToggleStates = {};
    this.energyEntities.forEach(entity => {
      newToggleStates[entity.entityId] = false;
    });
    this.energyEntityToggleStates = newToggleStates;
    this._updateEnergyEntityStates();
    this._saveEnergyToggleStates();
  }

  _selectAllPowerEntities() {
    const newToggleStates = {};
    this.powerEntities.forEach(entity => {
      newToggleStates[entity.entityId] = true;
    });
    this.entityToggleStates = newToggleStates;
    this._updatePowerEntityStates();
    this._savePowerToggleStates();
  }

  _selectAllEnergyEntities() {
    const newToggleStates = {};
    this.energyEntities.forEach(entity => {
      newToggleStates[entity.entityId] = true;
    });
    this.energyEntityToggleStates = newToggleStates;
    this._updateEnergyEntityStates();
    this._saveEnergyToggleStates();
  }

  _updatePowerEntityStates() {
    this.powerEntities = this.powerEntities.map(entity => ({
      ...entity,
      isOn: this.entityToggleStates[entity.entityId] || false
    }));
    this.requestUpdate();
    this.powerEntities.forEach(entity => {
      if (entity.isToggleable && entity.isOn !== undefined) {
        this._controlEntity(entity.entityId, entity.isOn);
      }
    });
  }

  _updateEnergyEntityStates() {
    this.energyEntities = this.energyEntities.map(entity => ({
      ...entity,
      isOn: this.energyEntityToggleStates[entity.entityId] || false
    }));
    this.requestUpdate();
    this.energyEntities.forEach(entity => {
      if (entity.isToggleable && entity.isOn !== undefined) {
        this._controlEntity(entity.entityId, entity.isOn);
      }
    });
  }

  render() {
    if (!this.hass || !this.config) {
      return html`<ha-card><div class="empty-message">Card not configured</div></ha-card>`;
    }
    if (this.config.card_type === "entity") {
      return this._renderEntityLayout();
    } else if (this.config.card_type === "chart") {
      return this._renderChartLayout();
    }
    return html`<ha-card>Unknown card_type</ha-card>`;
  }

  _renderEntityLayout() {
    const containerStyle = this.config.max_height > 0 ? 
      `max-height: ${Math.min(this.config.max_height, 400)}px; overflow-y: auto;` : '';
    return html`
      <ha-card>
        ${this.config.show_header ? html`
          <div class="card-header">${this.config.title}</div>
        ` : ''}
        ${this.powerEntities.length > 0 ? html`
          <div class="control-buttons">
            <button class="control-button" @click="${this._resetToPowerDefaultEntities}">
              <ha-icon icon="mdi:refresh"></ha-icon>
              <span>Reset</span>
            </button>
            <button class="control-button" @click="${this._clearAllPowerEntities}">
              <ha-icon icon="mdi:close-circle-outline"></ha-icon>
              <span>Clear</span>
            </button>
            <button class="control-button" @click="${this._selectAllPowerEntities}">
              <ha-icon icon="mdi:check-circle-outline"></ha-icon>
              <span>Select All</span>
            </button>
          </div>
          <div class="section-title">Power Entities</div>
          <div style="width: 100%; box-sizing: border-box;">
            <div class="entities-container" style="${containerStyle}">
              ${this.powerEntities.map(entity => html`
                <div 
                  class="entity-item ${entity.isOn ? 'on' : 'off'}"
                  data-entity="${entity.entityId}"
                  @click="${this._togglePowerEntity}"
                  style="gap: 4px;"
                >
                  <div class="entity-left">
                    <div class="entity-name" title="${entity.name}">${entity.name}</div>
                  </div>
                  <div class="entity-state">
                    <div class="status-indicator">${entity.isToggleable ? (entity.isOn ? 'ON' : 'OFF') : ''}</div>
                    <div class="power-value">${this.config.show_state ? 
                      `${entity.unit === 'kW' ? entity.state : Math.round(entity.powerValue)} ${entity.unit || 'W'}` : 
                      ''}
                    </div>
                  </div>
                </div>
              `)}
            </div>
          </div>
        ` : html`
          <div class="empty-message">
            No power entities found. Make sure you have entities with unit set to W or kW.
          </div>
        `}
        ${this.config.show_energy_section && this.energyEntities.length > 0 ? html`
          <div class="section-separator"></div>
          <div class="control-buttons">
            <button class="control-button" @click="${this._resetToEnergyDefaultEntities}">
              <ha-icon icon="mdi:refresh"></ha-icon>
              <span>Reset</span>
            </button>
            <button class="control-button" @click="${this._clearAllEnergyEntities}">
              <ha-icon icon="mdi:close-circle-outline"></ha-icon>
              <span>Clear</span>
            </button>
            <button class="control-button" @click="${this._selectAllEnergyEntities}">
              <ha-icon icon="mdi:check-circle-outline"></ha-icon>
              <span>Select All</span>
            </button>
          </div>
          <div class="section-title">Energy Entities</div>
          <div style="width: 100%; box-sizing: border-box;">
            <div class="entities-container" style="${containerStyle}">
              ${this.energyEntities.map(entity => html`
                <div 
                  class="entity-item ${entity.isOn ? 'on' : 'off'}"
                  data-entity="${entity.entityId}"
                  @click="${this._toggleEnergyEntity}"
                  style="gap: 4px;"
                >
                  <div class="entity-left">
                    <div class="entity-name" title="${entity.name}">${entity.name}</div>
                  </div>
                  <div class="entity-state">
                    <div class="status-indicator">${entity.isToggleable ? (entity.isOn ? 'ON' : 'OFF') : ''}</div>
                    <div class="power-value">${this.config.show_state ? 
                      `${entity.state} ${entity.unit}` : 
                      ''}
                    </div>
                  </div>
                </div>
              `)}
            </div>
          </div>
        ` : this.config.show_energy_section ? html`
          <div class="section-separator"></div>
          <div class="section-title">Energy Entities</div>
          <div class="empty-message">
            No energy entities found. Make sure you have entities with unit set to Wh or kWh.
          </div>
        ` : ''}
      </ha-card>
    `;
  }

  _renderChartLayout() {
    return html`
      <ha-card>
        ${this.config.show_header ? html`
          <div class="card-header">${this.config.title}</div>
        ` : ''}
        ${this.selectedPowerEntities.length === 0 && this.selectedEnergyEntities.length === 0 ? html`
          <div class="empty-message">
            No entities selected. Please select entities in the Energy Dashboard Entity Card.
          </div>
        ` : this.chartConfig ? html`
          ${this.config.show_power_chart && this.selectedPowerEntities.length > 0 ? html`
            <div class="chart-section">
              <div class="chart-section-title">Power Consumption</div>
              <apexcharts-card
                .hass=${this.hass}
                .config=${this.chartConfig.charts.find(c => c.header.title === 'Power Consumption')}
              ></apexcharts-card>
            </div>
          ` : ''}
          ${this.config.show_energy_chart && this.selectedEnergyEntities.length > 0 ? html`
            ${this.config.show_power_chart && this.selectedPowerEntities.length > 0 ? html`
              <div class="section-separator"></div>
            ` : ''}
            <div class="chart-section">
              <div class="chart-section-title">Energy Consumption</div>
              <apexcharts-card
                .hass=${this.hass}
                .config=${this.chartConfig.charts.find(c => c.header.title === 'Energy Consumption')}
              ></apexcharts-card>
            </div>
          ` : ''}
        ` : html`
          <div class="loading">
            <ha-circular-progress indeterminate></ha-circular-progress>
            <div>Loading charts...</div>
          </div>
        `}
      </ha-card>
    `;
  }
}

class EnergyDashboardCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }

  static get styles() {
    return css`
      .form {
        display: flex;
        flex-direction: column;
      }
      .row {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 8px 16px;
      }
      .title {
        padding-left: 16px;
        margin-top: 8px;
        font-weight: 500;
      }
      .value {
        width: 100%;
      }
      ha-switch {
        margin-right: 16px;
      }
    `;
  }

  setConfig(config) {
    this.config = {
      card_type: "entity",
      title: 'Energy Dashboard',
      show_header: true,
      show_state: true,
      show_toggle: true,
      auto_select_count: 6,
      max_height: 400,
      show_energy_section: true,
      energy_auto_select_count: 6,
      chart_type: 'line',
      chart_height: '300px',
      refresh_interval: 30,
      span: {
        start: "hour",
        offset: -1
      },
      show_power_chart: true,
      show_energy_chart: true,
      power_chart_type: 'line',
      energy_chart_type: 'bar',
      ...config
    };
  }

  valueChanged(ev) {
    if (!this.config) return;
    const target = ev.target;
    if (this.config === undefined) {
      return;
    }
    if (target.configValue) {
      let newValue;
      if (target.checked !== undefined) {
        newValue = target.checked;
      } else if (target.value) {
        if (target.type === 'number') {
          newValue = Number(target.value);
        } else {
          newValue = target.value;
        }
      }
      if (this.config[target.configValue] === newValue) {
        return;
      }
      const newConfig = {
        ...this.config,
        [target.configValue]: newValue
      };
      const event = new CustomEvent('config-changed', {
        detail: { config: newConfig },
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(event);
    }
  }

  render() {
    if (!this.config) return html``;
    return html`
      <div class="form">
        <div class="title">Card Settings</div>
        <div class="row">
          <ha-select
            label="Card Type"
            .value=${this.config.card_type}
            .configValue=${"card_type"}
            @selected=${this.valueChanged}
            class="value"
          >
            <mwc-list-item value="entity">Entity</mwc-list-item>
            <mwc-list-item value="chart">Chart</mwc-list-item>
          </ha-select>
        </div>
        <div class="row">
          <ha-textfield
            label="Title"
            .value="${this.config.title || ''}"
            .configValue=${"title"}
            @change="${this.valueChanged}"
            class="value"
          ></ha-textfield>
        </div>
        <div class="row">
          <ha-switch
            .checked=${this.config.show_header !== false}
            .configValue=${"show_header"}
            @change=${this.valueChanged}
          ></ha-switch>
          <div>Show Header</div>
        </div>
        ${this.config.card_type === "entity" ? html`
          <div class="row">
            <ha-switch
              .checked=${this.config.show_state !== false}
              .configValue=${"show_state"}
              @change=${this.valueChanged}
            ></ha-switch>
            <div>Show State</div>
          </div>
          <div class="row">
            <ha-switch
              .checked=${this.config.show_toggle !== false}
              .configValue=${"show_toggle"}
              @change=${this.valueChanged}
            ></ha-switch>
            <div>Allow Toggling</div>
          </div>
          <div class="row">
            <ha-textfield
              label="Auto-select Count"
              type="number"
              min="0"
              max="50"
              .value="${String(this.config.auto_select_count || 6)}"
              .configValue=${"auto_select_count"}
              @change="${this.valueChanged}"
              class="value"
            ></ha-textfield>
          </div>
          <div class="row">
            <ha-textfield
              label="Energy Auto-select Count"
              type="number"
              min="0"
              max="50"
              .value="${String(this.config.energy_auto_select_count || 6)}"
              .configValue=${"energy_auto_select_count"}
              @change="${this.valueChanged}"
              class="value"
            ></ha-textfield>
          </div>
          <div class="row">
            <ha-switch
              .checked=${this.config.show_energy_section !== false}
              .configValue=${"show_energy_section"}
              @change=${this.valueChanged}
            ></ha-switch>
            <div>Show Energy Section</div>
          </div>
          <div class="row">
            <ha-textfield
              label="Max Height (0 for no limit)"
              type="number"
              min="0"
              max="1000"
              .value="${String(this.config.max_height || 0)}"
              .configValue=${"max_height"}
              @change="${this.valueChanged}"
              class="value"
              helper-persistent
              helper-text="Set maximum height in pixels (0 = no limit)"
            ></ha-textfield>
          </div>
        ` : html`
          <div class="row">
            <ha-select
              label="Power Chart Type"
              .value=${this.config.power_chart_type || 'line'}
              .configValue=${"power_chart_type"}
              @selected=${this.valueChanged}
              class="value"
            >
              <mwc-list-item value="line">Line</mwc-list-item>
              <mwc-list-item value="area">Area</mwc-list-item>
              <mwc-list-item value="bar">Bar</mwc-list-item>
            </ha-select>
          </div>
          <div class="row">
            <ha-select
              label="Energy Chart Type"
              .value=${this.config.energy_chart_type || 'bar'}
              .configValue=${"energy_chart_type"}
              @selected=${this.valueChanged}
              class="value"
            >
              <mwc-list-item value="bar">Bar</mwc-list-item>
              <mwc-list-item value="line">Line</mwc-list-item>
              <mwc-list-item value="area">Area</mwc-list-item>
            </ha-select>
          </div>
          <div class="row">
            <ha-textfield
              label="Chart Height (e.g. 300px)"
              .value="${this.config.chart_height || '300px'}"
              .configValue=${"chart_height"}
              @change="${this.valueChanged}"
              class="value"
            ></ha-textfield>
          </div>
          <div class="row">
            <ha-textfield
              label="Refresh Interval (seconds)"
              type="number"
              min="5"
              max="3600"
              .value="${String(this.config.refresh_interval || 30)}"
              .configValue=${"refresh_interval"}
              @change="${this.valueChanged}"
              class="value"
            ></ha-textfield>
          </div>
          <div class="title">Time Range Settings</div>
          <div class="row">
            <ha-select
              label="Start From"
              .value=${this.config.span?.start || 'hour'}
              .configValue=${"span_start"}
              @selected=${this.valueChanged}
              class="value"
            >
              <mwc-list-item value="minute">Minute</mwc-list-item>
              <mwc-list-item value="hour">Hour</mwc-list-item>
              <mwc-list-item value="day">Day</mwc-list-item>
              <mwc-list-item value="week">Week</mwc-list-item>
              <mwc-list-item value="month">Month</mwc-list-item>
              <mwc-list-item value="year">Year</mwc-list-item>
            </ha-select>
          </div>
          <div class="row">
            <ha-textfield
              label="Offset (negative = past, positive = future)"
              type="number"
              .value="${String(this.config.span?.offset || -1)}"
              .configValue=${"span_offset"}
              @change="${this.valueChanged}"
              class="value"
            ></ha-textfield>
          </div>
        `}
      </div>
    `;
  }
}

EnergyDashboardCard.getConfigElement = () => document.createElement("energy-dashboard-card-editor");
EnergyDashboardCard.getStubConfig = () => ({ card_type: "entity" });
EnergyDashboardCard.info = info;

try {
  customElements.define("energy-dashboard-card", EnergyDashboardCard);
  customElements.define("energy-dashboard-card-editor", EnergyDashboardCardEditor);
  console.info(
    `%c ${info.name} %c Registered successfully `,
    "color: orange; font-weight: bold; background: black",
    "color: green; font-weight: bold; background: dimgray"
  );
} catch (e) {
  console.error(`Failed to register ${info.name}:`, e);
}