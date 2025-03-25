const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

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
    if (!customElements.get('apexcharts-card')) {defer the error to render time
      throw new Error("ApexCharts Card is required for this card to work. Please install it from HACS.");
    }f (!this._apexChartsAvailable) {
      console.warn("ApexCharts Card not found. The chart will show an error message.");
    this.config = {
      title: 'Energy Dashboard Charts',
      show_header: true,
      chart_type: 'line',board Charts',
      chart_height: '300px',
      refresh_interval: 30, // seconds
      span: {eight: '300px',
        start: "hour",: 30, // seconds
        offset: -1
      },start: "hour",
      show_power_chart: true,
      show_energy_chart: true,
      power_chart_type: 'line',
      energy_chart_type: 'bar',
      ...configrt_type: 'line',
    };energy_chart_type: 'bar',
  }   ...config
    };
  connectedCallback() {
    super.connectedCallback();
    this._initializeEntityMonitoring();
  } super.connectedCallback();
    this._initializeEntityMonitoring();
  disconnectedCallback() {
    super.disconnectedCallback();
    // Clear interval when card is removed
    if (this._checkEntitySelectionsInterval) {
      clearInterval(this._checkEntitySelectionsInterval);
    }f (this._checkEntitySelectionsInterval) {
  }   clearInterval(this._checkEntitySelectionsInterval);
    }
  _initializeEntityMonitoring() {
    // Check for entity toggle changes every 5 seconds
    this._checkEntitySelectionsInterval = setInterval(() => {
      this._updateSelectedEntities();s every 5 seconds
    }, 5000);ckEntitySelectionsInterval = setInterval(() => {
      this._updateSelectedEntities();
    // Initial check
    this._updateSelectedEntities();
  } // Initial check
    this._updateSelectedEntities();
  _updateSelectedEntities() {
    try {
      // Load selected power entities from localStorage
      const powerToggleStates = this._loadToggleStates('energy-dashboard-power-toggle-states');
      // Load selected power entities from localStorage
      // Load selected energy entities from localStorageenergy-dashboard-power-toggle-states');
      const energyToggleStates = this._loadToggleStates('energy-dashboard-energy-toggle-states');
      // Load selected energy entities from localStorage
      if (!this.hass) return;s = this._loadToggleStates('energy-dashboard-energy-toggle-states');

      let powerEntitiesChanged = false;
      let energyEntitiesChanged = false;
      let powerEntitiesChanged = false;
      // Get selected power entitieslse;
      const newSelectedPowerEntities = Object.keys(powerToggleStates || {})
        .filter(entityId => powerToggleStates[entityId] && this.hass.states[entityId])
        .map(entityId => ({rEntities = Object.keys(powerToggleStates || {})
          entityId,ityId => powerToggleStates[entityId] && this.hass.states[entityId])
          name: this.hass.states[entityId].attributes.friendly_name || entityId,
          unit: this.hass.states[entityId].attributes.unit_of_measurement || 'W'
        }));me: this.hass.states[entityId].attributes.friendly_name || entityId,
          unit: this.hass.states[entityId].attributes.unit_of_measurement || 'W'
      // Get selected energy entities
      const newSelectedEnergyEntities = Object.keys(energyToggleStates || {})
        .filter(entityId => energyToggleStates[entityId] && this.hass.states[entityId])
        .map(entityId => ({gyEntities = Object.keys(energyToggleStates || {})
          entityId,ityId => energyToggleStates[entityId] && this.hass.states[entityId])
          name: this.hass.states[entityId].attributes.friendly_name || entityId,
          unit: this.hass.states[entityId].attributes.unit_of_measurement || 'kWh'
        }));me: this.hass.states[entityId].attributes.friendly_name || entityId,
          unit: this.hass.states[entityId].attributes.unit_of_measurement || 'kWh'
      // Compare selected power entities with previous selections
      if (JSON.stringify(newSelectedPowerEntities) !== JSON.stringify(this.selectedPowerEntities)) {
        this.selectedPowerEntities = newSelectedPowerEntities;ons
        powerEntitiesChanged = true;PowerEntities) !== JSON.stringify(this.selectedPowerEntities)) {
      } this.selectedPowerEntities = newSelectedPowerEntities;
        powerEntitiesChanged = true;
      // Compare selected energy entities with previous selections
      if (JSON.stringify(newSelectedEnergyEntities) !== JSON.stringify(this.selectedEnergyEntities)) {
        this.selectedEnergyEntities = newSelectedEnergyEntities;ns
        energyEntitiesChanged = true;nergyEntities) !== JSON.stringify(this.selectedEnergyEntities)) {
      } this.selectedEnergyEntities = newSelectedEnergyEntities;
        energyEntitiesChanged = true;
      // Update chart if any entities changed or if it's time to refresh
      const currentTime = Date.now();
      if (powerEntitiesChanged || energyEntitiesChanged || me to refresh
          (currentTime - this.lastUpdated) > (this.config.refresh_interval * 1000)) {
        this._updateChartConfig();energyEntitiesChanged || 
        this.lastUpdated = currentTime;ed) > (this.config.refresh_interval * 1000)) {
      } this._updateChartConfig();
    } catch (e) {Updated = currentTime;
      console.error('Error updating selected entities:', e);
    } catch (e) {
  }   console.error('Error updating selected entities:', e);
    }
  _loadToggleStates(key) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {d = localStorage.getItem(key);
      console.error(`Failed to load toggle states for ${key}:`, e);
      return {};{
    } console.error(`Failed to load toggle states for ${key}:`, e);
  }   return {};
    }
  _updateChartConfig() {
    if (!this.hass) return;
    pdateChartConfig() {
    let charts = [];return;
    
    // Add power chart if enabled and entities are selected
    if (this.config.show_power_chart && this.selectedPowerEntities.length > 0) {
      charts.push(this._createPowerChartConfig()); selected
    }f (this.config.show_power_chart && this.selectedPowerEntities.length > 0) {
      charts.push(this._createPowerChartConfig());
    // Add energy chart if enabled and entities are selected
    if (this.config.show_energy_chart && this.selectedEnergyEntities.length > 0) {
      charts.push(this._createEnergyChartConfig()); selected
    }f (this.config.show_energy_chart && this.selectedEnergyEntities.length > 0) {
      charts.push(this._createEnergyChartConfig());
    // Generate the combined apex charts configuration
    this.chartConfig = {
      // This prevents full re-renders of the chartion
      key: `energy-dashboard-chart-${Date.now()}`,
      charts: chartsts full re-renders of the chart
    };key: `energy-dashboard-chart-${Date.now()}`,
      charts: charts
    this.requestUpdate();
  } 
    this.requestUpdate();
  _createPowerChartConfig() {
    return {
      type: this.config.power_chart_type || 'line',
      header: {
        show: true,nfig.power_chart_type || 'line',
        title: 'Power Consumption',
        show_states: true,
        colorize_states: truetion',
      },show_states: true,
      span: this.config.span,
      apex_config: {
        chart: {.config.span,
          height: this.config.chart_height,
          zoom: {
            enabled: truenfig.chart_height,
          }oom: {
        },  enabled: true
        yaxis: {
          decimalsInFloat: 1,
          labels: {
            formatter: (val) => `${Math.round(val)} W`
          },bels: {
          title: {ter: (val) => `${Math.round(val)} W`
            text: 'Power (W)'
          }itle: {
        }   text: 'Power (W)'
      },  }
      series: this.selectedPowerEntities.map(entity => ({
        entity: entity.entityId,
        name: entity.nameedPowerEntities.map(entity => ({
      }))ntity: entity.entityId,
    };  name: entity.name
  }   }))
    };
  _createEnergyChartConfig() {
    return {
      type: this.config.energy_chart_type || 'bar',
      header: {
        show: true,nfig.energy_chart_type || 'bar',
        title: 'Energy Consumption',
        show_states: true,
        colorize_states: trueption',
      },show_states: true,
      span: this.config.span,
      apex_config: {
        chart: {.config.span,
          height: this.config.chart_height,
          zoom: {
            enabled: truenfig.chart_height,
          }oom: {
        },  enabled: true
        yaxis: {
          decimalsInFloat: 2,
          labels: {
            formatter: (val) => `${val.toFixed(2)} ${this.selectedEnergyEntities.length > 0 ? this.selectedEnergyEntities[0].unit : 'kWh'}`
          },bels: {
          title: {ter: (val) => `${val.toFixed(2)} ${this.selectedEnergyEntities.length > 0 ? this.selectedEnergyEntities[0].unit : 'kWh'}`
            text: 'Energy (kWh/Wh)'
          }itle: {
        }   text: 'Energy (kWh/Wh)'
      },  }
      series: this.selectedEnergyEntities.map(entity => ({
        entity: entity.entityId,
        name: entity.nameedEnergyEntities.map(entity => ({
      }))ntity: entity.entityId,
    };  name: entity.name
  }   }))
    };
  updated(changedProps) {
    if (changedProps.has('hass')) {
      // Update only if hass changes to avoid unnecessary redraws
      this._updateSelectedEntities();
    } // Update only if hass changes to avoid unnecessary redraws
  }   this._updateSelectedEntities();
    }
  render() {
    if (!this.hass || !this.config) {
      return html`<ha-card><div class="empty-message">Card not configured</div></ha-card>`;
    }f (!this.hass || !this.config) {
      return html`<ha-card><div class="empty-message">Card not configured</div></ha-card>`;
    if (!customElements.get('apexcharts-card')) {
      return html`
        <ha-card>dly error for missing ApexCharts
          <div class="card-header">Error</div>
          <div class="empty-message">
            ApexCharts Card is required for this card to work. Please install it from HACS.
          </div>lass="card-header">${this.config.title || 'Energy Dashboard Chart'}</div>
        </ha-card>ss="empty-message">
      `;    <p><strong>ApexCharts Card is required</strong></p>
    }       <p>Please install it from HACS:</p>
            <p>1. Go to HACS → Frontend</p>
    return html`. Click "+" and search for "ApexCharts Card"</p>
      <ha-card>3. Install and restart Home Assistant</p>
        ${this.config.show_header ? html`
          <div class="card-header">${this.config.title}</div>
        ` : ''}
        
        ${this.selectedPowerEntities.length === 0 && this.selectedEnergyEntities.length === 0 ? html`
          <div class="empty-message">
            No entities selected. Please select entities in the Energy Dashboard Entity Card.
          </div>onfig.show_header ? html`
        ` : this.chartConfig ? html`{this.config.title}</div>
          ${this.config.show_power_chart && this.selectedPowerEntities.length > 0 ? html`
            <div class="chart-section">
              <div class="chart-section-title">Power Consumption</div>gyEntities.length === 0 ? html`
              <apexcharts-cardssage">
                .hass=${this.hass}Please select entities in the Energy Dashboard Entity Card.
                .config=${this.chartConfig.charts.find(c => c.header.title === 'Power Consumption')}
              ></apexcharts-card>ml`
            </div>onfig.show_power_chart && this.selectedPowerEntities.length > 0 ? html`
          ` : ''}class="chart-section">
              <div class="chart-section-title">Power Consumption</div>
          ${this.config.show_energy_chart && this.selectedEnergyEntities.length > 0 ? html`
            ${this.config.show_power_chart && this.selectedPowerEntities.length > 0 ? html`
              <div class="section-separator"></div>ind(c => c.header.title === 'Power Consumption')}
            ` : ''}excharts-card>
            <div class="chart-section">
              <div class="chart-section-title">Energy Consumption</div>
              <apexcharts-card
                .hass=${this.hass}y_chart && this.selectedEnergyEntities.length > 0 ? html`
                .config=${this.chartConfig.charts.find(c => c.header.title === 'Energy Consumption')}
              ></apexcharts-card>-separator"></div>
            </div>}
          ` : ''}class="chart-section">
        ` : html`v class="chart-section-title">Energy Consumption</div>
          <div class="loading">
            <ha-circular-progress indeterminate></ha-circular-progress>
            <div>Loading charts...</div>ig.charts.find(c => c.header.title === 'Energy Consumption')}
          </div>/apexcharts-card>
        `}  </div>
      </ha-card>}
    `;  ` : html`
  }       <div class="loading">
}           <ha-circular-progress indeterminate></ha-circular-progress>
            <div>Loading charts...</div>
// Define the card editor
class EnergyDashboardChartCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }Define the card editor
class EnergyDashboardChartCardEditor extends LitElement {
  static get styles() {() {
    return css`
      .form { type: Object },
        display: flex;Object }
        flex-direction: column;
      }
      .row {
        display: flex;{
        flex-direction: row;
        align-items: center;
        padding: 8px 16px;
      } flex-direction: column;
      .title {
        padding-left: 16px;
        margin-top: 8px;
        font-weight: 500;ow;
      } align-items: center;
      .value {g: 8px 16px;
        width: 100%;
      }title {
      ha-switch {eft: 16px;
        margin-right: 16px;
      } font-weight: 500;
    `;}
  }   .value {
        width: 100%;
  setConfig(config) {
    this.config = {
      title: 'Energy Dashboard Charts',
      show_header: true,
      chart_type: 'line',
      chart_height: '300px',
      refresh_interval: 30, // seconds
      span: {onfig) {
        start: "hour",
        offset: -1gy Dashboard Charts',
      },ow_header: true,
      show_power_chart: true,
      show_energy_chart: true,
      power_chart_type: 'line',seconds
      energy_chart_type: 'bar',
      ...config"hour",
    };  offset: -1
  }   },
      show_power_chart: true,
  valueChanged(ev) {art: true,
    if (!this.config) return;',
      energy_chart_type: 'bar',
    const target = ev.target;
    };
    if (this.config === undefined) {
      return;
    }ueChanged(ev) {
    if (!this.config) return;
    if (target.configValue) {
      let newValue;ev.target;
      
      if (target.checked !== undefined) {
        newValue = target.checked;
      } else if (target.value) {
        if (target.type === 'number') {
          newValue = Number(target.value);
        } else {ue;
          newValue = target.value;
        }(target.checked !== undefined) {
      } newValue = target.checked;
      } else if (target.value) {
      if (this.config[target.configValue] === newValue) {
        return;lue = Number(target.value);
      } } else {
          newValue = target.value;
      const newConfig = {
        ...this.config,
        [target.configValue]: newValue
      }; (this.config[target.configValue] === newValue) {
        return;
      // Special handling for span settings
      if (target.configValue === 'span_start') {
        newConfig.span = {
          ...newConfig.span,
          start: newValueue]: newValue
        };
      } else if (target.configValue === 'span_offset') {
        newConfig.span = {for span settings
          ...newConfig.span, === 'span_start') {
          offset: newValue
        };...newConfig.span,
      }   start: newValue
        };
      const event = new CustomEvent('config-changed', {{
        detail: { config: newConfig },
        bubbles: true,.span,
        composed: truealue
      });;
      this.dispatchEvent(event);
    } 
  }   const event = new CustomEvent('config-changed', {
        detail: { config: newConfig },
  render() {les: true,
    if (!this.config) return html``;
      });
    return html`tchEvent(event);
      <div class="form">
        <div class="title">Chart Settings</div>
        
        <div class="row">
          <ha-textfieldeturn html``;
            label="Title"
            .value="${this.config.title || ''}"
            .configValue=${"title"}
            @change="${this.valueChanged}"/div>
            class="value"
          ></ha-textfield>
        </div>textfield
            label="Title"
        <div class="row">s.config.title || ''}"
          <ha-switchalue=${"title"}
            .checked=${this.config.show_header !== false}
            .configValue=${"show_header"}
            @change=${this.valueChanged}
          ></ha-switch>
          <div>Show Header</div>
        </div>lass="row">
          <ha-switch
        <div class="row">is.config.show_header !== false}
          <ha-switchalue=${"show_header"}
            .checked=${this.config.show_power_chart !== false}
            .configValue=${"show_power_chart"}
            @change=${this.valueChanged}
          ></ha-switch>
          <div>Show Power Chart</div>
        </div>lass="row">
          <ha-switch
        <div class="row">is.config.show_power_chart !== false}
          <ha-switchalue=${"show_power_chart"}
            .checked=${this.config.show_energy_chart !== false}
            .configValue=${"show_energy_chart"}
            @change=${this.valueChanged}
          ></ha-switch>
          <div>Show Energy Chart</div>
        </div>lass="row">
          <ha-switch
        <div class="row">is.config.show_energy_chart !== false}
          <ha-selectalue=${"show_energy_chart"}
            label="Power Chart Type"ged}
            .value=${this.config.power_chart_type || 'line'}
            .configValue=${"power_chart_type"}
            @selected=${this.valueChanged}
            class="value"
          >v class="row">
            <mwc-list-item value="line">Line</mwc-list-item>
            <mwc-list-item value="area">Area</mwc-list-item>
            <mwc-list-item value="bar">Bar</mwc-list-item>'}
          </ha-select>ue=${"power_chart_type"}
        </div>elected=${this.valueChanged}
            class="value"
        <div class="row">
          <ha-selectt-item value="line">Line</mwc-list-item>
            label="Energy Chart Type"a">Area</mwc-list-item>
            .value=${this.config.energy_chart_type || 'bar'}
            .configValue=${"energy_chart_type"}
            @selected=${this.valueChanged}
            class="value"
          >v class="row">
            <mwc-list-item value="bar">Bar</mwc-list-item>
            <mwc-list-item value="line">Line</mwc-list-item>
            <mwc-list-item value="area">Area</mwc-list-item>
          </ha-select>ue=${"energy_chart_type"}
        </div>elected=${this.valueChanged}
            class="value"
        <div class="row">
          <ha-textfieldtem value="bar">Bar</mwc-list-item>
            label="Chart Height (e.g. 300px)"/mwc-list-item>
            .value="${this.config.chart_height || '300px'}">
            .configValue=${"chart_height"}
            @change="${this.valueChanged}"
            class="value"
          ></ha-textfield>
        </div>textfield
            label="Chart Height (e.g. 300px)"
        <div class="row">s.config.chart_height || '300px'}"
          <ha-textfielde=${"chart_height"}
            label="Refresh Interval (seconds)"
            type="number"
            min="5"tfield>
            max="3600"
            .value="${String(this.config.refresh_interval || 30)}"
            .configValue=${"refresh_interval"}
            @change="${this.valueChanged}"
            class="value"h Interval (seconds)"
          ></ha-textfield>
        </div>n="5"
            max="3600"
        <div class="title">Time Range Settings</div>erval || 30)}"
            .configValue=${"refresh_interval"}
        <div class="row">is.valueChanged}"
          <ha-selectalue"
            label="Start From"
            .value=${this.config.span?.start || 'hour'}
            .configValue=${"span_start"}
            @selected=${this.valueChanged}ings</div>
            class="value"
          >v class="row">
            <mwc-list-item value="minute">Minute</mwc-list-item>
            <mwc-list-item value="hour">Hour</mwc-list-item>
            <mwc-list-item value="day">Day</mwc-list-item>
            <mwc-list-item value="week">Week</mwc-list-item>
            <mwc-list-item value="month">Month</mwc-list-item>
            <mwc-list-item value="year">Year</mwc-list-item>
          </ha-select>
        </div>wc-list-item value="minute">Minute</mwc-list-item>
            <mwc-list-item value="hour">Hour</mwc-list-item>
        <div class="row">m value="day">Day</mwc-list-item>
          <ha-textfieldtem value="week">Week</mwc-list-item>
            label="Offset (negative = past, positive = future)"
            type="number"m value="year">Year</mwc-list-item>
            .value="${String(this.config.span?.offset || -1)}"
            .configValue=${"span_offset"}
            @change="${this.valueChanged}"
            class="value"
          ></ha-textfield>
        </div>bel="Offset (negative = past, positive = future)"
      </div>type="number"
    `;      .value="${String(this.config.span?.offset || -1)}"
  }         .configValue=${"span_offset"}
}           @change="${this.valueChanged}"
            class="value"
// Register the editoreld>
customElements.define('energy-dashboard-chart-card-editor', EnergyDashboardChartCardEditor);
      </div>
// Set card editor
EnergyDashboardChartCard.getConfigElement = function() {
  return document.createElement('energy-dashboard-chart-card-editor');
};
// Register the editor
EnergyDashboardChartCard.getStubConfig = function() {itor', EnergyDashboardChartCardEditor);
  return {
    title: 'Energy Dashboard Charts',
    show_header: true,rd.getConfigElement = function() {
    chart_type: 'line',eElement('energy-dashboard-chart-card-editor');
    chart_height: '300px',
    refresh_interval: 30,
    span: {oardChartCard.getStubConfig = function() {
      start: "hour",
      offset: -1gy Dashboard Charts',
    },ow_header: true,
    show_power_chart: true,
    show_energy_chart: true,
    power_chart_type: 'line',
    energy_chart_type: 'bar'
  };  start: "hour",
};    offset: -1
    },
// Add version and info metadata
const info = {y_chart: true,
  name: "Energy Dashboard Chart Card",
  version: "1.0.0",pe: 'bar'
  description: "Chart card that automatically displays entities selected in the Energy Dashboard Entity Card",
  documentationURL: "https://github.com/yourusername/hass-energy-dashboard"
};
// Add version and info metadata
console.info({
  `%c ${info.name} %c ${info.version} `,
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"ntities selected in the Energy Dashboard Entity Card",
);documentationURL: "https://github.com/yourusername/hass-energy-dashboard"
};
EnergyDashboardChartCard.info = info;
console.info(
if (!customElements.get('energy-dashboard-chart-card')) { ${info.name} %c ${info.version} `,
  customElements.define('energy-dashboard-chart-card', EnergyDashboardChartCard);
  console.info(`%c ${info.name} %c Registered successfully `, 
    "color: orange; font-weight: bold; background: black",
    "color: green; font-weight: bold; background: dimgray");
} = info;
      documentationURL: info.documentationURL
    });
  }
} catch (error) {
  console.error("Error defining Energy Dashboard Chart Card:", error);
}
