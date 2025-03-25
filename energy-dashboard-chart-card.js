const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

// Add version and info metadata
const info = {
  name: "Energy Dashboard Chart Card",
  version: "1.0.0",
  description: "Chart card that automatically displays entities selected in the Energy Dashboard Entity Card",
  documentationURL: "https://github.com/yourusername/hass-energy-dashboard"
};

console.info(
  `%c ${info.name} %c ${info.version} `,
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);

class EnergyDashboardChartCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      selectedPowerEntities: { type: Array },
      selectedEnergyEntities: { type: Array },
      chartConfig: { type: Object },
      lastUpdated: { type: Number }
    };
  }

  static get styles() {
    return css`
      :host {
        --card-padding: 16px;
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
      .chart-container {
        width: 100%;
        height: 100%;
        min-height: 300px;
      }
      .empty-message {
        padding: var(--card-padding);
        text-align: center;
        color: var(--secondary-text-color);
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
      .section-separator {
        height: 1px;
        background-color: var(--divider-color, #e0e0e0);
        margin: 8px var(--card-padding);
        opacity: 0.6;
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
    
    // Set up an interval to check for entity selections
    this._checkEntitySelectionsInterval = null;
  }

  setConfig(config) {
    // Check if ApexCharts card is available but defer the error to render time
    this._apexChartsAvailable = typeof customElements.get('apexcharts-card') !== 'undefined';
    if (!this._apexChartsAvailable) {
      console.warn("ApexCharts Card not found. The chart will show an error message.");
    }
    
    this.config = {
      title: 'Energy Dashboard Charts',
      show_header: true,
      chart_type: 'line',
      chart_height: '300px',
      refresh_interval: 30, // seconds
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

  connectedCallback() {
    super.connectedCallback();
    this._initializeEntityMonitoring();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Clear interval when card is removed
    if (this._checkEntitySelectionsInterval) {
      clearInterval(this._checkEntitySelectionsInterval);
    }
  }

  _initializeEntityMonitoring() {
    // Check for entity toggle changes every 5 seconds
    this._checkEntitySelectionsInterval = setInterval(() => {
      this._updateSelectedEntities();
    }, 5000);
    
    // Initial check
    this._updateSelectedEntities();
  }

  _updateSelectedEntities() {
    try {
      // Load selected power entities from localStorage
      const powerToggleStates = this._loadToggleStates('energy-dashboard-power-toggle-states');
      
      // Load selected energy entities from localStorage
      const energyToggleStates = this._loadToggleStates('energy-dashboard-energy-toggle-states');

      if (!this.hass) return;

      let powerEntitiesChanged = false;
      let energyEntitiesChanged = false;
      
      // Get selected power entities
      const newSelectedPowerEntities = Object.keys(powerToggleStates || {})
        .filter(entityId => powerToggleStates[entityId] && this.hass.states[entityId])
        .map(entityId => ({
          entityId,
          name: this.hass.states[entityId].attributes.friendly_name || entityId,
          unit: this.hass.states[entityId].attributes.unit_of_measurement || 'W'
        }));
      
      // Get selected energy entities
      const newSelectedEnergyEntities = Object.keys(energyToggleStates || {})
        .filter(entityId => energyToggleStates[entityId] && this.hass.states[entityId])
        .map(entityId => ({
          entityId,
          name: this.hass.states[entityId].attributes.friendly_name || entityId,
          unit: this.hass.states[entityId].attributes.unit_of_measurement || 'kWh'
        }));
      
      // Compare selected power entities with previous selections
      if (JSON.stringify(newSelectedPowerEntities) !== JSON.stringify(this.selectedPowerEntities)) {
        this.selectedPowerEntities = newSelectedPowerEntities;
        powerEntitiesChanged = true;
      }
      
      // Compare selected energy entities with previous selections
      if (JSON.stringify(newSelectedEnergyEntities) !== JSON.stringify(this.selectedEnergyEntities)) {
        this.selectedEnergyEntities = newSelectedEnergyEntities;
        energyEntitiesChanged = true;
      }
      
      // Update chart if any entities changed or if it's time to refresh
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
    
    // Add power chart if enabled and entities are selected
    if (this.config.show_power_chart && this.selectedPowerEntities.length > 0) {
      charts.push(this._createPowerChartConfig());
    }
    
    // Add energy chart if enabled and entities are selected
    if (this.config.show_energy_chart && this.selectedEnergyEntities.length > 0) {
      charts.push(this._createEnergyChartConfig());
    }
    
    // Generate the combined apex charts configuration
    this.chartConfig = {
      // This prevents full re-renders of the chart
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
      // Update only if hass changes to avoid unnecessary redraws
      this._updateSelectedEntities();
    }
  }

  render() {
    if (!this.hass || !this.config) {
      return html`<ha-card><div class="empty-message">Card not configured</div></ha-card>`;
    }

    // More friendly error for missing ApexCharts
    if (!customElements.get('apexcharts-card')) {
      return html`
        <ha-card>
          <div class="card-header">${this.config.title || 'Energy Dashboard Chart'}</div>
          <div class="empty-message">
            <p><strong>ApexCharts Card is required</strong></p>
            <p>Please install it from HACS:</p>
            <p>1. Go to HACS → Frontend</p>
            <p>2. Click "+" and search for "ApexCharts Card"</p>
            <p>3. Install and restart Home Assistant</p>
          </div>
        </ha-card>
      `;
    }

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

// Define the card editor
class EnergyDashboardChartCardEditor extends LitElement {
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
      title: 'Energy Dashboard Charts',
      show_header: true,
      chart_type: 'line',
      chart_height: '300px',
      refresh_interval: 30, // seconds
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
      
      // Special handling for span settings
      if (target.configValue === 'span_start') {
        newConfig.span = {
          ...newConfig.span,
          start: newValue
        };
      } else if (target.configValue === 'span_offset') {
        newConfig.span = {
          ...newConfig.span,
          offset: newValue
        };
      }
      
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
        <div class="title">Chart Settings</div>
        
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
        
        <div class="row">
          <ha-switch
            .checked=${this.config.show_power_chart !== false}
            .configValue=${"show_power_chart"}
            @change=${this.valueChanged}
          ></ha-switch>
          <div>Show Power Chart</div>
        </div>
        
        <div class="row">
          <ha-switch
            .checked=${this.config.show_energy_chart !== false}
            .configValue=${"show_energy_chart"}
            @change=${this.valueChanged}
          ></ha-switch>
          <div>Show Energy Chart</div>
        </div>
        
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
      </div>
    `;
  }
}

// Register the editor
customElements.define('energy-dashboard-chart-card-editor', EnergyDashboardChartCardEditor);

// Set card editor
EnergyDashboardChartCard.getConfigElement = function() {
  return document.createElement('energy-dashboard-chart-card-editor');
};

EnergyDashboardChartCard.getStubConfig = function() {
  return {
    title: 'Energy Dashboard Charts',
    show_header: true,
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
    energy_chart_type: 'bar'
  };
};

EnergyDashboardChartCard.info = info;

// Register the chart card
if (!customElements.get('energy-dashboard-chart-card')) {
  customElements.define('energy-dashboard-chart-card', EnergyDashboardChartCard);
  console.info(`%c ${info.name} %c Registered successfully `, 
    "color: orange; font-weight: bold; background: black",
    "color: green; font-weight: bold; background: dimgray");
}
