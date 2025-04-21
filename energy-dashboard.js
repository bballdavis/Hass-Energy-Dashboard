import { LitElement, css, html } from 'lit';

function getPowerEntities(hass) {
    return Object.keys(hass.states)
        .filter(entityId => {
        const stateObj = hass.states[entityId];
        return stateObj && stateObj.attributes &&
            (stateObj.attributes.unit_of_measurement === 'W' ||
                stateObj.attributes.unit_of_measurement === 'kW');
    })
        .map(entityId => {
        const stateObj = hass.states[entityId];
        const domain = entityId.split('.')[0];
        const isToggleable = ['switch', 'light', 'input_boolean', 'fan', 'automation'].includes(domain);
        let powerValue = 0;
        try {
            if (stateObj.attributes.unit_of_measurement === 'kW') {
                powerValue = parseFloat(stateObj.state) * 1000;
            }
            else {
                powerValue = parseFloat(stateObj.state) || 0;
            }
        }
        catch {
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
}
function getEnergyEntities(hass) {
    return Object.keys(hass.states)
        .filter(entityId => {
        const stateObj = hass.states[entityId];
        return stateObj && stateObj.attributes &&
            (stateObj.attributes.unit_of_measurement === 'Wh' ||
                stateObj.attributes.unit_of_measurement === 'kWh');
    })
        .map(entityId => {
        const stateObj = hass.states[entityId];
        const domain = entityId.split('.')[0];
        const isToggleable = ['switch', 'light', 'input_boolean', 'fan', 'automation'].includes(domain);
        let energyValue = 0;
        try {
            if (stateObj.attributes.unit_of_measurement === 'Wh') {
                energyValue = parseFloat(stateObj.state) / 1000;
            }
            else {
                energyValue = parseFloat(stateObj.state) || 0;
            }
        }
        catch {
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
}
function loadToggleStates(key) {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    }
    catch {
        return null;
    }
}
function saveToggleStates(states, key) {
    try {
        localStorage.setItem(key, JSON.stringify(states));
    }
    catch {
        try {
            const reducedStates = {};
            Object.keys(states).forEach(k => {
                if (states[k])
                    reducedStates[k] = true;
            });
            localStorage.setItem(key, JSON.stringify(reducedStates));
        }
        catch { }
    }
}

class EnergyDashboardEntityCard extends LitElement {
    static get properties() {
        return {
            hass: { type: Object },
            config: { type: Object },
            powerEntities: { type: Array },
            energyEntities: { type: Array },
            entityToggleStates: { type: Object },
            energyEntityToggleStates: { type: Object }
        };
    }
    static get styles() {
        return css `
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
    `;
    }
    constructor() {
        super();
        this.powerEntities = [];
        this.energyEntities = [];
        this.entityToggleStates = {};
        this.energyEntityToggleStates = {};
        this._initialized = false;
        this._energyInitialized = false;
        this.powerEntities = [];
        this.energyEntities = [];
        this.entityToggleStates = {};
        this.energyEntityToggleStates = {};
        this._initialized = false;
        this._energyInitialized = false;
    }
    setConfig(config) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (!config) {
            throw new Error("Invalid configuration");
        }
        // Create a merged config object correctly by spreading config first
        this.config = {
            ...config,
            // Then set defaults only for missing properties
            title: (_a = config.title) !== null && _a !== void 0 ? _a : 'Energy Dashboard',
            show_header: (_b = config.show_header) !== null && _b !== void 0 ? _b : true,
            show_state: (_c = config.show_state) !== null && _c !== void 0 ? _c : true,
            show_toggle: (_d = config.show_toggle) !== null && _d !== void 0 ? _d : true,
            auto_select_count: (_e = config.auto_select_count) !== null && _e !== void 0 ? _e : 6,
            max_height: (_f = config.max_height) !== null && _f !== void 0 ? _f : 400,
            show_energy_section: (_g = config.show_energy_section) !== null && _g !== void 0 ? _g : true,
            energy_auto_select_count: (_h = config.energy_auto_select_count) !== null && _h !== void 0 ? _h : 6,
        };
    }
    static getConfigElement() {
        return document.createElement('energy-dashboard-entity-card-editor');
    }
    static getStubConfig() {
        return {
            title: 'Energy Dashboard',
            show_header: true,
            show_state: true,
            show_toggle: true,
            auto_select_count: 6,
            max_height: 400,
            show_energy_section: true,
            energy_auto_select_count: 6
        };
    }
    getCardSize() {
        var _a;
        let rows = 0;
        if (this.powerEntities && this.powerEntities.length > 0) {
            rows += this.powerEntities.length * 0.7;
            rows += 2;
        }
        if (((_a = this.config) === null || _a === void 0 ? void 0 : _a.show_energy_section) && this.energyEntities && this.energyEntities.length > 0) {
            rows += this.energyEntities.length * 0.7;
            rows += 2;
        }
        return rows > 0 ? rows : 1;
    }
    updated(changedProps) {
        if (changedProps.has('hass')) {
            this._updateEntities();
        }
    }
    _updateEntities() {
        var _a;
        if (!this.hass)
            return;
        try {
            this._updatePowerEntities();
            if ((_a = this.config) === null || _a === void 0 ? void 0 : _a.show_energy_section) {
                this._updateEnergyEntities();
            }
        }
        catch (e) {
            console.error("Error updating entities:", e);
        }
    }
    _updatePowerEntities() {
        const newPowerEntities = getPowerEntities(this.hass);
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
        const newEnergyEntities = getEnergyEntities(this.hass);
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
        var _a, _b;
        const savedStates = loadToggleStates('energy-dashboard-power-toggle-states');
        if (savedStates && Object.keys(savedStates).length > 0) {
            this.entityToggleStates = savedStates;
        }
        else {
            const toggleStates = {};
            // Safely handle potentially undefined config or auto_select_count
            const count = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.auto_select_count) !== null && _b !== void 0 ? _b : 6;
            entities.slice(0, count).forEach(entity => {
                toggleStates[entity.entityId] = true;
            });
            this.entityToggleStates = toggleStates;
        }
    }
    _initializeEnergyToggleStates(entities) {
        var _a, _b;
        const savedStates = loadToggleStates('energy-dashboard-energy-toggle-states');
        if (savedStates && Object.keys(savedStates).length > 0) {
            this.energyEntityToggleStates = savedStates;
        }
        else {
            const toggleStates = {};
            // Safely handle potentially undefined config or energy_auto_select_count
            const count = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.energy_auto_select_count) !== null && _b !== void 0 ? _b : 6;
            entities.slice(0, count).forEach(entity => {
                toggleStates[entity.entityId] = true;
            });
            this.energyEntityToggleStates = toggleStates;
        }
    }
    _savePowerToggleStates() {
        saveToggleStates(this.entityToggleStates, 'energy-dashboard-power-toggle-states');
    }
    _saveEnergyToggleStates() {
        saveToggleStates(this.energyEntityToggleStates, 'energy-dashboard-energy-toggle-states');
    }
    _resetToPowerDefaultEntities() {
        // reset power entities to default selection
        this._initializePowerToggleStates(getPowerEntities(this.hass));
        this._updatePowerEntities();
    }
    _clearAllPowerEntities() {
        // clear power entity selection
        this.entityToggleStates = {};
        this._updatePowerEntities();
    }
    _selectAllPowerEntities() {
        // select all power entities
        const entities = getPowerEntities(this.hass);
        entities.forEach(entity => {
            this.entityToggleStates[entity.entityId] = true;
        });
        this._updatePowerEntities();
    }
    _togglePowerEntity(e) {
        const target = e.currentTarget;
        const entityId = target.dataset.entity;
        if (entityId) {
            this.entityToggleStates[entityId] = !this.entityToggleStates[entityId];
            this._updatePowerEntities();
        }
    }
    _resetToEnergyDefaultEntities() {
        // reset energy entities to default selection
        this._initializeEnergyToggleStates(getEnergyEntities(this.hass));
        this._updateEnergyEntities();
    }
    _clearAllEnergyEntities() {
        // clear energy entity selection
        this.energyEntityToggleStates = {};
        this._updateEnergyEntities();
    }
    _selectAllEnergyEntities() {
        // select all energy entities
        const entities = getEnergyEntities(this.hass);
        entities.forEach(entity => {
            this.energyEntityToggleStates[entity.entityId] = true;
        });
        this._updateEnergyEntities();
    }
    _toggleEnergyEntity(e) {
        const target = e.currentTarget;
        const entityId = target.dataset.entity;
        if (entityId) {
            this.energyEntityToggleStates[entityId] = !this.energyEntityToggleStates[entityId];
            this._updateEnergyEntities();
        }
    }
    render() {
        var _a, _b;
        if (!this.hass || !this.config) {
            return html `<ha-card><div class="empty-message">Card not configured</div></ha-card>`;
        }
        const containerStyle = this.config.max_height > 0 ?
            `max-height: ${Math.min(this.config.max_height, 400)}px; overflow-y: auto;` : '';
        return html `
      <ha-card>
        ${this.config.show_header ? html `
          <div class="card-header">${this.config.title}</div>
        ` : ''}
        
        ${this.powerEntities.length > 0 ? html `
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
              ${this.powerEntities.map(entity => {
            var _a;
            return html `
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
                    <div class="power-value">${((_a = this.config) === null || _a === void 0 ? void 0 : _a.show_state) ?
                `${entity.unit === 'kW' ? entity.state : Math.round(entity.powerValue || 0)} ${entity.unit || 'W'}` :
                ''}
                    </div>
                  </div>
                </div>
              `;
        })}
            </div>
          </div>
        ` : html `
          <div class="empty-message">
            No power entities found. Make sure you have entities with unit set to W or kW.
          </div>
        `}

        ${((_a = this.config) === null || _a === void 0 ? void 0 : _a.show_energy_section) && this.energyEntities.length > 0 ? html `
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
              ${this.energyEntities.map(entity => {
            var _a;
            return html `
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
                    <div class="power-value">${((_a = this.config) === null || _a === void 0 ? void 0 : _a.show_state) ?
                `${entity.state} ${entity.unit}` :
                ''}
                    </div>
                  </div>
                </div>
              `;
        })}
            </div>
          </div>
        ` : ((_b = this.config) === null || _b === void 0 ? void 0 : _b.show_energy_section) ? html `
          <div class="section-separator"></div>
          <div class="section-title">Energy Entities</div>
          <div class="empty-message">
            No energy entities found. Make sure you have entities with unit set to Wh or kWh.
          </div>
        ` : ''}
      </ha-card>
    `;
    }
}
// Register the card with the custom elements registry
customElements.define('energy-dashboard-entity-card', EnergyDashboardEntityCard);

class EnergyDashboardEntityCardEditor extends LitElement {
    static get properties() {
        return {
            hass: { type: Object },
            config: { type: Object }
        };
    }
    constructor() {
        super();
        this.hass = undefined;
        this.config = undefined;
    }
    static get styles() {
        return css `
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
            // First spread the provided config
            ...config,
            // Then apply defaults for any missing properties
            show_header: config.show_header !== undefined ? config.show_header : true,
            show_state: config.show_state !== undefined ? config.show_state : true,
            show_toggle: config.show_toggle !== undefined ? config.show_toggle : true,
            auto_select_count: config.auto_select_count !== undefined ? config.auto_select_count : 6,
            max_height: config.max_height !== undefined ? config.max_height : 400, // Default to ~15 entities
            show_energy_section: config.show_energy_section !== undefined ? config.show_energy_section : true,
            energy_auto_select_count: config.energy_auto_select_count !== undefined ? config.energy_auto_select_count : 6,
            title: config.title !== undefined ? config.title : 'Energy Dashboard',
        };
    }
    valueChanged(ev) {
        if (!this.config)
            return;
        const target = ev.target;
        const configValue = target.configValue;
        if (!configValue)
            return;
        let newValue;
        if (typeof target.checked === 'boolean') {
            newValue = target.checked;
        }
        else if (target.value !== undefined) {
            if (target.type === 'number') {
                newValue = Number(target.value);
            }
            else {
                newValue = target.value;
            }
        }
        if (this.config[configValue] === newValue)
            return;
        const newConfig = {
            ...this.config,
            [configValue]: newValue
        };
        this.dispatchEvent(new CustomEvent('config-changed', {
            detail: { config: newConfig },
            bubbles: true,
            composed: true
        }));
    }
    render() {
        if (!this.config)
            return html ``;
        return html `
      <div class="form">
        <div class="title">Card Settings</div>

        <div class="row">
          <ha-textfield
            label="Title"
            .value="${this.config.title || ''}"
            .configValue="title"
            @change="${this.valueChanged}"
            class="value"
          ></ha-textfield>
        </div>

        <div class="row">
          <ha-switch
            .checked=${this.config.show_header !== false}
            .configValue="show_header"
            @change="${this.valueChanged}"
          ></ha-switch>
          <div>Show Header</div>
        </div>

        <div class="row">
          <ha-switch
            .checked=${this.config.show_state !== false}
            .configValue="show_state"
            @change="${this.valueChanged}"
          ></ha-switch>
          <div>Show State</div>
        </div>

        <div class="row">
          <ha-switch
            .checked=${this.config.show_toggle !== false}
            .configValue="show_toggle"
            @change="${this.valueChanged}"
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
            .configValue="auto_select_count"
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
            .configValue="energy_auto_select_count"
            @change="${this.valueChanged}"
            class="value"
          ></ha-textfield>
        </div>

        <div class="row">
          <ha-switch
            .checked=${this.config.show_energy_section !== false}
            .configValue="show_energy_section"
            @change="${this.valueChanged}"
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
            .configValue="max_height"
            @change="${this.valueChanged}"
            class="value"
            helper-persistent
            helper-text="Set maximum height in pixels (0 = no limit)"
          ></ha-textfield>
        </div>
      </div>
    `;
    }
}
customElements.define('energy-dashboard-entity-card-editor', EnergyDashboardEntityCardEditor);

// Import the components and their implementations
window.customCards = window.customCards || [];
// Register the Energy Dashboard Entity Card
window.customCards.push({
    type: "energy-dashboard-entity-card",
    name: "Energy Dashboard: Entity Card",
    description: "Card that displays power (W/kW) and energy (Wh/kWh) measurement entities",
    preview: false,
    documentationURL: "https://github.com/bballdavis/Hass-Energy-Dashboard"
});
// Additional cards can be registered here as they're developed

export { EnergyDashboardEntityCard, EnergyDashboardEntityCardEditor };
//# sourceMappingURL=energy-dashboard.js.map
