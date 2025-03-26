import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './EntityCardStyles';
import './EntityCard';
import './ChartCard';

@customElement('energy-dashboard-card')
export class EnergyDashboardCard extends LitElement {
  @property({ type: Object }) hass: any;
  @property({ type: Object }) config: any;
  @property({ type: Array }) selectedPowerEntities: any[] = [];
  @property({ type: Array }) selectedEnergyEntities: any[] = [];
  @property({ type: Object }) chartConfig: any = null;
  @property({ type: Number }) lastUpdated: number = Date.now();
  @property({ type: Array }) powerEntities: any[] = [];
  @property({ type: Array }) energyEntities: any[] = [];
  @property({ type: Object }) entityToggleStates: any = {};
  @property({ type: Object }) energyEntityToggleStates: any = {};
  private _initialized: boolean = false;
  private _energyInitialized: boolean = false;
  private _checkEntitySelectionsInterval: any = null;
  private _apexChartsAvailable: boolean = false;

  static get styles() {
    return css`
      // ...any shared or global card styles if needed...
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
      return html`
        <entity-card
          .powerEntities=${this.powerEntities}
          .energyEntities=${this.energyEntities}
          .showEnergySection=${this.config.show_energy_section}
          .maxHeight=${this.config.max_height}
        ></entity-card>
      `;
    } else if (this.config.card_type === "chart") {
      return html`
        <chart-card
          .selectedPowerEntities=${this.selectedPowerEntities}
          .selectedEnergyEntities=${this.selectedEnergyEntities}
          .showPowerChart=${this.config.show_power_chart}
          .showEnergyChart=${this.config.show_energy_chart}
          .chartConfig=${this.chartConfig}
        ></chart-card>
      `;
    }
    return html`<ha-card>Unknown card_type</ha-card>`;
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

try {
  customElements.define("energy-dashboard-card", EnergyDashboardCard);
  customElements.define("energy-dashboard-card-editor", EnergyDashboardCardEditor);
  console.info(
    `%c Energy Dashboard Card %c Registered successfully `,
    "color: orange; font-weight: bold; background: black",
    "color: green; font-weight: bold; background: dimgray"
  );
} catch (e) {
  console.error(`Failed to register Energy Dashboard Card:`, e);
}