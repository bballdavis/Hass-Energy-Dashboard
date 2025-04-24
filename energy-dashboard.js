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

function createStyles(cssText) {
    const style = document.createElement('style');
    style.textContent = cssText;
    return style;
}
const cardStyles = `
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
  
  /* Loading and error states */
  .loading-container {
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: var(--loading-height, 300px);
    border-radius: 8px;
    animation: fadeIn 0.3s ease-in-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }
  
  .loading-container .loading-text {
    margin-top: 16px;
    color: var(--secondary-text-color);
    animation: pulse 1.5s infinite;
  }
  
  .error-container {
    border: 1px dashed var(--error-color, red);
    border-radius: 8px;
    padding: 16px;
    margin: 8px 16px;
    transition: all 0.3s ease;
  }
  
  .error-container:hover {
    background-color: rgba(var(--error-color-rgb, 244, 67, 54), 0.05);
  }
  
  .error-container ul {
    margin-top: 8px;
    margin-bottom: 4px;
  }
  
  .chart-container {
    transition: opacity 0.3s ease-in-out;
  }
`;
const editorStyles = `
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

class EnergyDashboardEntityCard extends HTMLElement {
    // Define card name and icon for card picker
    static get cardType() {
        return 'energy-dashboard-entity-card';
    }
    static get displayName() {
        return 'Energy Dashboard Entity Card';
    }
    static get description() {
        return 'Card that displays power and energy consumption entities';
    }
    static get icon() {
        return 'mdi:lightning-bolt';
    }
    constructor() {
        super();
        this.powerEntities = [];
        this.energyEntities = [];
        this.entityToggleStates = {};
        this.energyEntityToggleStates = {};
        this._initialized = false;
        this._energyInitialized = false;
        this._resetToPowerDefaultEntities = () => {
            this._initializePowerToggleStates(getPowerEntities(this._hass));
            this._updatePowerEntities();
            this._updateContent();
        };
        this._clearAllPowerEntities = () => {
            this.entityToggleStates = {};
            this._updatePowerEntities();
            this._updateContent();
        };
        this._selectAllPowerEntities = () => {
            const entities = getPowerEntities(this._hass);
            entities.forEach(entity => {
                this.entityToggleStates[entity.entityId] = true;
            });
            this._updatePowerEntities();
            this._updateContent();
        };
        this._togglePowerEntity = (e) => {
            const target = e.currentTarget;
            const entityId = target.dataset.entity;
            if (entityId) {
                this.entityToggleStates[entityId] = !this.entityToggleStates[entityId];
                this._updatePowerEntities();
                this._updateContent();
            }
        };
        this._resetToEnergyDefaultEntities = () => {
            this._initializeEnergyToggleStates(getEnergyEntities(this._hass));
            this._updateEnergyEntities();
            this._updateContent();
        };
        this._clearAllEnergyEntities = () => {
            this.energyEntityToggleStates = {};
            this._updateEnergyEntities();
            this._updateContent();
        };
        this._selectAllEnergyEntities = () => {
            const entities = getEnergyEntities(this._hass);
            entities.forEach(entity => {
                this.energyEntityToggleStates[entity.entityId] = true;
            });
            this._updateEnergyEntities();
            this._updateContent();
        };
        this._toggleEnergyEntity = (e) => {
            const target = e.currentTarget;
            const entityId = target.dataset.entity;
            if (entityId) {
                this.energyEntityToggleStates[entityId] = !this.energyEntityToggleStates[entityId];
                this._updateEnergyEntities();
                this._updateContent();
            }
        };
        this._root = this.attachShadow({ mode: 'open' });
        this._root.appendChild(createStyles(cardStyles));
        // Initialize properties
        this._hass = undefined;
        this.powerEntities = [];
        this.energyEntities = [];
        this.entityToggleStates = {};
        this.energyEntityToggleStates = {};
        this._initialized = false;
        this._energyInitialized = false;
        // Create the card element
        const card = document.createElement('ha-card');
        this._root.appendChild(card);
    }
    // Called when the element is added to the DOM
    connectedCallback() {
        this._updateContent();
    }
    // Home Assistant specific method to set config
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
        this._updateContent();
    }
    // Home Assistant specific methods
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
    // Called when Home Assistant updates
    set hass(hass) {
        this._hass = hass;
        this._updateEntities();
        this._updateContent();
    }
    get hass() {
        return this._hass;
    }
    _updateEntities() {
        var _a;
        if (!this._hass)
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
        const newPowerEntities = getPowerEntities(this._hass);
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
        const newEnergyEntities = getEnergyEntities(this._hass);
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
    _renderPowerSection() {
        var _a;
        const section = document.createElement('div');
        if (this.powerEntities.length > 0) {
            // Control buttons
            const controlButtons = document.createElement('div');
            controlButtons.className = 'control-buttons';
            const resetButton = document.createElement('button');
            resetButton.className = 'control-button';
            resetButton.innerHTML = '<ha-icon icon="mdi:refresh"></ha-icon><span>Reset</span>';
            resetButton.addEventListener('click', this._resetToPowerDefaultEntities);
            const clearButton = document.createElement('button');
            clearButton.className = 'control-button';
            clearButton.innerHTML = '<ha-icon icon="mdi:close-circle-outline"></ha-icon><span>Clear</span>';
            clearButton.addEventListener('click', this._clearAllPowerEntities);
            const selectAllButton = document.createElement('button');
            selectAllButton.className = 'control-button';
            selectAllButton.innerHTML = '<ha-icon icon="mdi:check-circle-outline"></ha-icon><span>Select All</span>';
            selectAllButton.addEventListener('click', this._selectAllPowerEntities);
            controlButtons.appendChild(resetButton);
            controlButtons.appendChild(clearButton);
            controlButtons.appendChild(selectAllButton);
            section.appendChild(controlButtons);
            // Section title
            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'section-title';
            sectionTitle.textContent = 'Power Entities';
            section.appendChild(sectionTitle);
            // Container
            const containerWrapper = document.createElement('div');
            containerWrapper.style.width = '100%';
            containerWrapper.style.boxSizing = 'border-box';
            const entitiesContainer = document.createElement('div');
            entitiesContainer.className = 'entities-container';
            if (((_a = this.config) === null || _a === void 0 ? void 0 : _a.max_height) && this.config.max_height > 0) {
                entitiesContainer.style.maxHeight = `${Math.min(this.config.max_height, 400)}px`;
                entitiesContainer.style.overflowY = 'auto';
            }
            // Add entities
            this.powerEntities.forEach(entity => {
                var _a;
                const entityItem = document.createElement('div');
                entityItem.className = `entity-item ${entity.isOn ? 'on' : 'off'}`;
                entityItem.dataset.entity = entity.entityId;
                entityItem.style.gap = '4px';
                entityItem.addEventListener('click', this._togglePowerEntity);
                const entityLeft = document.createElement('div');
                entityLeft.className = 'entity-left';
                const entityName = document.createElement('div');
                entityName.className = 'entity-name';
                entityName.title = entity.name;
                entityName.textContent = entity.name;
                entityLeft.appendChild(entityName);
                entityItem.appendChild(entityLeft);
                const entityState = document.createElement('div');
                entityState.className = 'entity-state';
                const statusIndicator = document.createElement('div');
                statusIndicator.className = 'status-indicator';
                statusIndicator.textContent = entity.isToggleable ? (entity.isOn ? 'ON' : 'OFF') : '';
                const powerValue = document.createElement('div');
                powerValue.className = 'power-value';
                if ((_a = this.config) === null || _a === void 0 ? void 0 : _a.show_state) {
                    powerValue.textContent = `${entity.unit === 'kW' ? entity.state : Math.round(entity.powerValue || 0)} ${entity.unit || 'W'}`;
                }
                entityState.appendChild(statusIndicator);
                entityState.appendChild(powerValue);
                entityItem.appendChild(entityState);
                entitiesContainer.appendChild(entityItem);
            });
            containerWrapper.appendChild(entitiesContainer);
            section.appendChild(containerWrapper);
        }
        else {
            // Empty message
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No power entities found. Make sure you have entities with unit set to W or kW.';
            section.appendChild(emptyMessage);
        }
        return section;
    }
    _renderEnergySection() {
        var _a, _b;
        const section = document.createElement('div');
        // Only render if energy section is enabled
        if (!((_a = this.config) === null || _a === void 0 ? void 0 : _a.show_energy_section)) {
            return section;
        }
        const separator = document.createElement('div');
        separator.className = 'section-separator';
        section.appendChild(separator);
        if (this.energyEntities.length > 0) {
            // Control buttons for energy section
            const controlButtons = document.createElement('div');
            controlButtons.className = 'control-buttons';
            const resetButton = document.createElement('button');
            resetButton.className = 'control-button';
            resetButton.innerHTML = '<ha-icon icon="mdi:refresh"></ha-icon><span>Reset</span>';
            resetButton.addEventListener('click', this._resetToEnergyDefaultEntities);
            const clearButton = document.createElement('button');
            clearButton.className = 'control-button';
            clearButton.innerHTML = '<ha-icon icon="mdi:close-circle-outline"></ha-icon><span>Clear</span>';
            clearButton.addEventListener('click', this._clearAllEnergyEntities);
            const selectAllButton = document.createElement('button');
            selectAllButton.className = 'control-button';
            selectAllButton.innerHTML = '<ha-icon icon="mdi:check-circle-outline"></ha-icon><span>Select All</span>';
            selectAllButton.addEventListener('click', this._selectAllEnergyEntities);
            controlButtons.appendChild(resetButton);
            controlButtons.appendChild(clearButton);
            controlButtons.appendChild(selectAllButton);
            section.appendChild(controlButtons);
            // Section title
            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'section-title';
            sectionTitle.textContent = 'Energy Entities';
            section.appendChild(sectionTitle);
            // Container
            const containerWrapper = document.createElement('div');
            containerWrapper.style.width = '100%';
            containerWrapper.style.boxSizing = 'border-box';
            const entitiesContainer = document.createElement('div');
            entitiesContainer.className = 'entities-container';
            if (((_b = this.config) === null || _b === void 0 ? void 0 : _b.max_height) && this.config.max_height > 0) {
                entitiesContainer.style.maxHeight = `${Math.min(this.config.max_height, 400)}px`;
                entitiesContainer.style.overflowY = 'auto';
            }
            // Add entities
            this.energyEntities.forEach(entity => {
                var _a;
                const entityItem = document.createElement('div');
                entityItem.className = `entity-item ${entity.isOn ? 'on' : 'off'}`;
                entityItem.dataset.entity = entity.entityId;
                entityItem.style.gap = '4px';
                entityItem.addEventListener('click', this._toggleEnergyEntity);
                const entityLeft = document.createElement('div');
                entityLeft.className = 'entity-left';
                const entityName = document.createElement('div');
                entityName.className = 'entity-name';
                entityName.title = entity.name;
                entityName.textContent = entity.name;
                entityLeft.appendChild(entityName);
                entityItem.appendChild(entityLeft);
                const entityState = document.createElement('div');
                entityState.className = 'entity-state';
                const statusIndicator = document.createElement('div');
                statusIndicator.className = 'status-indicator';
                statusIndicator.textContent = entity.isToggleable ? (entity.isOn ? 'ON' : 'OFF') : '';
                const powerValue = document.createElement('div');
                powerValue.className = 'power-value';
                if ((_a = this.config) === null || _a === void 0 ? void 0 : _a.show_state) {
                    powerValue.textContent = `${entity.state} ${entity.unit}`;
                }
                entityState.appendChild(statusIndicator);
                entityState.appendChild(powerValue);
                entityItem.appendChild(entityState);
                entitiesContainer.appendChild(entityItem);
            });
            containerWrapper.appendChild(entitiesContainer);
            section.appendChild(containerWrapper);
        }
        else {
            // Section title
            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'section-title';
            sectionTitle.textContent = 'Energy Entities';
            section.appendChild(sectionTitle);
            // Empty message
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No energy entities found. Make sure you have entities with unit set to Wh or kWh.';
            section.appendChild(emptyMessage);
        }
        return section;
    }
    _updateContent() {
        if (!this.config) {
            const card = this._root.querySelector('ha-card');
            if (card) {
                card.innerHTML = '<div class="empty-message">Card not configured</div>';
            }
            return;
        }
        // Get the ha-card element
        const card = this._root.querySelector('ha-card');
        if (!card)
            return;
        // Clear previous content
        card.innerHTML = '';
        // Header
        if (this.config.show_header) {
            const header = document.createElement('div');
            header.className = 'card-header';
            header.textContent = this.config.title;
            card.appendChild(header);
        }
        // Power section
        const powerSection = this._renderPowerSection();
        card.appendChild(powerSection);
        // Energy section (if enabled)
        if (this.config.show_energy_section) {
            const energySection = this._renderEnergySection();
            card.appendChild(energySection);
        }
    }
}
// Register the card with the custom elements registry
customElements.define('energy-dashboard-entity-card', EnergyDashboardEntityCard);

class EnergyDashboardEntityCardEditor extends HTMLElement {
    constructor() {
        super();
        this.valueChanged = (ev) => {
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
        };
        this._root = this.attachShadow({ mode: 'open' });
        this._root.appendChild(createStyles(editorStyles));
        // Initialize properties
        this.hass = undefined;
        this.config = undefined;
        // Create the form container
        const form = document.createElement('div');
        form.className = 'form';
        this._root.appendChild(form);
    }
    // Called when the element is added to the DOM
    connectedCallback() {
        this._updateForm();
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
        this._updateForm();
    }
    _updateForm() {
        if (!this.config)
            return;
        // Get or create the form element
        let form = this._root.querySelector('.form');
        if (!form) {
            form = document.createElement('div');
            form.className = 'form';
            this._root.appendChild(form);
        }
        form.innerHTML = '';
        // Create title
        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = 'Card Settings';
        form.appendChild(title);
        // Title field
        const titleRow = this._createRow();
        const titleField = document.createElement('ha-textfield');
        titleField.className = 'value';
        titleField.label = 'Title';
        titleField.value = this.config.title || '';
        titleField.configValue = 'title';
        titleField.addEventListener('change', this.valueChanged);
        titleRow.appendChild(titleField);
        form.appendChild(titleRow);
        // Show Header toggle
        const headerRow = this._createRow();
        const headerSwitch = document.createElement('ha-switch');
        headerSwitch.checked = this.config.show_header !== false;
        headerSwitch.configValue = 'show_header';
        headerSwitch.addEventListener('change', this.valueChanged);
        const headerLabel = document.createElement('div');
        headerLabel.textContent = 'Show Header';
        headerRow.appendChild(headerSwitch);
        headerRow.appendChild(headerLabel);
        form.appendChild(headerRow);
        // Show State toggle
        const stateRow = this._createRow();
        const stateSwitch = document.createElement('ha-switch');
        stateSwitch.checked = this.config.show_state !== false;
        stateSwitch.configValue = 'show_state';
        stateSwitch.addEventListener('change', this.valueChanged);
        const stateLabel = document.createElement('div');
        stateLabel.textContent = 'Show State';
        stateRow.appendChild(stateSwitch);
        stateRow.appendChild(stateLabel);
        form.appendChild(stateRow);
        // Allow Toggling toggle
        const toggleRow = this._createRow();
        const toggleSwitch = document.createElement('ha-switch');
        toggleSwitch.checked = this.config.show_toggle !== false;
        toggleSwitch.configValue = 'show_toggle';
        toggleSwitch.addEventListener('change', this.valueChanged);
        const toggleLabel = document.createElement('div');
        toggleLabel.textContent = 'Allow Toggling';
        toggleRow.appendChild(toggleSwitch);
        toggleRow.appendChild(toggleLabel);
        form.appendChild(toggleRow);
        // Auto-select Count field
        const autoSelectRow = this._createRow();
        const autoSelectField = document.createElement('ha-textfield');
        autoSelectField.className = 'value';
        autoSelectField.label = 'Auto-select Count';
        autoSelectField.type = 'number';
        autoSelectField.min = '0';
        autoSelectField.max = '50';
        autoSelectField.value = String(this.config.auto_select_count || 6);
        autoSelectField.configValue = 'auto_select_count';
        autoSelectField.addEventListener('change', this.valueChanged);
        autoSelectRow.appendChild(autoSelectField);
        form.appendChild(autoSelectRow);
        // Energy Auto-select Count field
        const energyAutoSelectRow = this._createRow();
        const energyAutoSelectField = document.createElement('ha-textfield');
        energyAutoSelectField.className = 'value';
        energyAutoSelectField.label = 'Energy Auto-select Count';
        energyAutoSelectField.type = 'number';
        energyAutoSelectField.min = '0';
        energyAutoSelectField.max = '50';
        energyAutoSelectField.value = String(this.config.energy_auto_select_count || 6);
        energyAutoSelectField.configValue = 'energy_auto_select_count';
        energyAutoSelectField.addEventListener('change', this.valueChanged);
        energyAutoSelectRow.appendChild(energyAutoSelectField);
        form.appendChild(energyAutoSelectRow);
        // Show Energy Section toggle
        const energySectionRow = this._createRow();
        const energySectionSwitch = document.createElement('ha-switch');
        energySectionSwitch.checked = this.config.show_energy_section !== false;
        energySectionSwitch.configValue = 'show_energy_section';
        energySectionSwitch.addEventListener('change', this.valueChanged);
        const energySectionLabel = document.createElement('div');
        energySectionLabel.textContent = 'Show Energy Section';
        energySectionRow.appendChild(energySectionSwitch);
        energySectionRow.appendChild(energySectionLabel);
        form.appendChild(energySectionRow);
        // Max Height field
        const maxHeightRow = this._createRow();
        const maxHeightField = document.createElement('ha-textfield');
        maxHeightField.className = 'value';
        maxHeightField.label = 'Max Height (0 for no limit)';
        maxHeightField.type = 'number';
        maxHeightField.min = '0';
        maxHeightField.max = '1000';
        maxHeightField.value = String(this.config.max_height || 0);
        maxHeightField.configValue = 'max_height';
        maxHeightField.addEventListener('change', this.valueChanged);
        maxHeightField.helperText = 'Set maximum height in pixels (0 = no limit)';
        maxHeightField.helperPersistent = true;
        maxHeightRow.appendChild(maxHeightField);
        form.appendChild(maxHeightRow);
    }
    _createRow() {
        const row = document.createElement('div');
        row.className = 'row';
        return row;
    }
}
// Register the editor with the custom elements registry
customElements.define('energy-dashboard-entity-card-editor', EnergyDashboardEntityCardEditor);

function getDefaultChartConfig() {
    return {
        chart_type: 'line',
        chart_height: 300,
        show_points: false,
        smooth_curve: true,
        update_interval: 0, // Set default to 0 (disabled) - our UI controls will handle refresh
        hours_to_show: 24,
        aggregate_func: 'avg',
        power_chart_options: {
            y_axis: {
                min: 0,
                decimals: 1,
                title: 'Power',
                unit: 'W'
            }
        },
        energy_chart_options: {
            y_axis: {
                min: 0,
                decimals: 2,
                title: 'Energy',
                unit: 'kWh'
            }
        },
        use_custom_colors: false,
        show_legend: true
    };
}

class EnergyDashboardChartCard extends HTMLElement {
    // Define card name and icon for card picker
    static get cardType() {
        return 'energy-dashboard-chart-card';
    }
    static get displayName() {
        return 'Energy Dashboard Chart';
    }
    static get description() {
        return 'Chart companion for the Energy Dashboard Entity Card';
    }
    static get icon() {
        return 'mdi:chart-line';
    }
    constructor() {
        super();
        this._powerChartEl = null;
        this._energyChartEl = null;
        this._updateTimer = null;
        this._powerEntities = [];
        this._energyEntities = [];
        this._isLoading = true;
        this._apexChartCardRegistered = null;
        this._currentRefreshInterval = 30; // Default to 30 seconds
        this._root = this.attachShadow({ mode: 'open' });
        this._root.appendChild(createStyles(cardStyles));
        // Create the card element
        const card = document.createElement('ha-card');
        this._root.appendChild(card);
    }
    // Called when the element is added to the DOM
    connectedCallback() {
        this._loadSelectedEntities();
        this._checkApexChartsRegistration();
        // First update the content without starting the timer
        this._updateContent();
        // Cancel and reset any existing timers and configuration
        this._stopUpdateInterval();
        // Wait until the content is fully loaded before starting timers
        // This ensures all chart elements have properly initialized
        setTimeout(() => {
            // Apply our refresh setting and disable any automatic updates from ApexCharts card itself
            this._disableApexChartsAutoUpdate();
            // Only start the update timer if explicitly set
            if (this._currentRefreshInterval > 0) {
                this._startUpdateInterval();
            }
        }, 1000); // Longer timeout to ensure everything is properly loaded
    }
    disconnectedCallback() {
        this._stopUpdateInterval();
    }
    // Home Assistant specific method to set config
    setConfig(config) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        if (!config) {
            throw new Error("Invalid configuration");
        }
        // Apply default chart config values 
        const defaultConfig = getDefaultChartConfig();
        // Create a merged config object
        this.config = {
            ...defaultConfig,
            ...config,
            // Handle nested objects properly
            power_chart_options: {
                ...defaultConfig.power_chart_options,
                ...(config.power_chart_options || {}),
                y_axis: {
                    ...(_a = defaultConfig.power_chart_options) === null || _a === void 0 ? void 0 : _a.y_axis,
                    ...(((_b = config.power_chart_options) === null || _b === void 0 ? void 0 : _b.y_axis) || {})
                }
            },
            energy_chart_options: {
                ...defaultConfig.energy_chart_options,
                ...(config.energy_chart_options || {}),
                y_axis: {
                    ...(_c = defaultConfig.energy_chart_options) === null || _c === void 0 ? void 0 : _c.y_axis,
                    ...(((_d = config.energy_chart_options) === null || _d === void 0 ? void 0 : _d.y_axis) || {})
                }
            },
            // Add base EnergyDashboardConfig properties
            title: (_e = config.title) !== null && _e !== void 0 ? _e : 'Energy Dashboard Chart',
            show_header: (_f = config.show_header) !== null && _f !== void 0 ? _f : true,
            show_state: (_g = config.show_state) !== null && _g !== void 0 ? _g : true,
            show_toggle: (_h = config.show_toggle) !== null && _h !== void 0 ? _h : true,
            auto_select_count: (_j = config.auto_select_count) !== null && _j !== void 0 ? _j : 6,
            max_height: (_k = config.max_height) !== null && _k !== void 0 ? _k : 400,
            show_energy_section: (_l = config.show_energy_section) !== null && _l !== void 0 ? _l : true,
            energy_auto_select_count: (_m = config.energy_auto_select_count) !== null && _m !== void 0 ? _m : 6,
        };
        // Set the current refresh interval from config
        if (this.config.update_interval) {
            this._currentRefreshInterval = this.config.update_interval;
        }
        this._loadSelectedEntities();
        this._isLoading = true;
        this._checkApexChartsRegistration();
        this._updateContent();
    }
    // Home Assistant specific methods
    static getConfigElement() {
        return document.createElement('energy-dashboard-chart-card-editor');
    }
    static getStubConfig() {
        return {
            ...getDefaultChartConfig(),
            title: 'Energy Dashboard Chart',
            show_header: true,
            show_energy_section: true,
        };
    }
    getCardSize() {
        var _a;
        return ((_a = this.config) === null || _a === void 0 ? void 0 : _a.chart_height) ? Math.ceil(this.config.chart_height / 50) : 6;
    }
    // Called when Home Assistant updates
    set hass(hass) {
        const firstUpdate = !this._hass;
        this._hass = hass;
        if (firstUpdate) {
            // When we get hass for the first time, end the loading state
            this._isLoading = false;
            this._updateContent();
        }
        // Remove automatic update on every hass change - let the refresh controls handle updates
    }
    get hass() {
        return this._hass;
    }
    _loadSelectedEntities() {
        // Load the toggle states from localStorage to get the entities selected in the entity card
        const powerToggleStates = loadToggleStates('energy-dashboard-power-toggle-states');
        const energyToggleStates = loadToggleStates('energy-dashboard-energy-toggle-states');
        if (powerToggleStates) {
            this._powerEntities = Object.keys(powerToggleStates).filter(entityId => powerToggleStates[entityId]);
        }
        if (energyToggleStates) {
            this._energyEntities = Object.keys(energyToggleStates).filter(entityId => energyToggleStates[entityId]);
        }
    }
    _startUpdateInterval() {
        var _a;
        if (this._updateTimer !== null) {
            window.clearInterval(this._updateTimer);
        }
        // Set the current refresh interval from config
        if ((_a = this.config) === null || _a === void 0 ? void 0 : _a.update_interval) {
            this._currentRefreshInterval = this.config.update_interval;
        }
        // Start the timer with the current refresh interval
        if (this._currentRefreshInterval > 0) {
            this._updateTimer = window.setInterval(() => this._updateCharts(), this._currentRefreshInterval * 1000);
        }
    }
    _stopUpdateInterval() {
        if (this._updateTimer !== null) {
            window.clearInterval(this._updateTimer);
            this._updateTimer = null;
        }
    }
    _generateApexchartsConfig(entities, isEnergy) {
        var _a, _b, _c, _d;
        if (!this.config || !entities.length || !this._hass)
            return null;
        // Reinstate options to get y-axis config
        const options = isEnergy
            ? this.config.energy_chart_options
            : this.config.power_chart_options;
        const chartType = this.config.chart_type || 'line';
        const hoursToShow = this.config.hours_to_show || 24;
        const showPoints = this.config.show_points || false;
        const aggregateFunc = this.config.aggregate_func || 'avg'; // Keep aggregate func
        const showLegend = this.config.show_legend !== false;
        const smoothCurve = this.config.smooth_curve !== false;
        // Set update_interval to 0 to disable ApexCharts auto-refresh
        // Our refresh controls will handle updates instead
        const updateInterval = "0";
        // Build series configuration for apexcharts-card
        const series = entities.map(entityId => {
            var _a;
            const entityState = this._hass.states[entityId];
            const name = ((_a = entityState === null || entityState === void 0 ? void 0 : entityState.attributes) === null || _a === void 0 ? void 0 : _a.friendly_name) || entityId;
            return {
                entity: entityId,
                name: name,
                type: chartType,
                stroke_width: 2,
                group_by: {
                    func: aggregateFunc,
                    duration: '1h' // Adjust duration as needed
                }
            };
        });
        // Create the configuration format for apexcharts-card
        const apexChartCardConfig = {
            // --- Top-level apexcharts-card specific config ---
            type: 'custom:apexcharts-card',
            header: {
                show: false,
            },
            graph_span: `${hoursToShow}h`, // Use graph_span
            chart_type: chartType,
            cache: true,
            stacked: false, // Set based on config if needed
            update_interval: updateInterval, // Set to 0 to disable auto-refresh
            // --- Top-level yaxis configuration ---
            yaxis: [
                {
                    min: (_a = options === null || options === void 0 ? void 0 : options.y_axis) === null || _a === void 0 ? void 0 : _a.min,
                    max: (_b = options === null || options === void 0 ? void 0 : options.y_axis) === null || _b === void 0 ? void 0 : _b.max,
                    decimals: (_d = (_c = options === null || options === void 0 ? void 0 : options.y_axis) === null || _c === void 0 ? void 0 : _c.decimals) !== null && _d !== void 0 ? _d : (isEnergy ? 2 : 1),
                }
            ],
            // --- Standard ApexCharts options nested under apex_config ---
            apex_config: {
                chart: {
                    height: this.config.chart_height || 300,
                    toolbar: {
                        show: true,
                        tools: {
                            download: true, selection: true, zoom: true,
                            zoomin: true, zoomout: true, pan: true, reset: true
                        }
                    },
                    animations: {
                        enabled: false // Disable animations to prevent unnecessary rerenders
                    },
                    redrawOnWindowResize: false // Prevent redraw on window resize
                },
                stroke: {
                    curve: smoothCurve ? 'smooth' : 'straight'
                },
                markers: {
                    size: showPoints ? 4 : 0
                },
                legend: {
                    show: showLegend
                },
                // Disable any auto update/refresh features
                annotations: {
                    position: 'front'
                }
            },
            // --- Series Data ---
            series: series,
        };
        // Clean up potential undefined values from top-level yaxis
        if (apexChartCardConfig.yaxis[0].min === undefined)
            delete apexChartCardConfig.yaxis[0].min;
        if (apexChartCardConfig.yaxis[0].max === undefined)
            delete apexChartCardConfig.yaxis[0].max;
        if (apexChartCardConfig.yaxis[0].decimals === undefined)
            delete apexChartCardConfig.yaxis[0].decimals;
        return apexChartCardConfig;
    }
    _createChart(isEnergy) {
        var _a;
        // If still loading, show loading indicator
        if (this._isLoading) {
            return this._createLoadingIndicator();
        }
        const entities = isEnergy ? this._energyEntities : this._powerEntities;
        // Check if we have any entities selected
        if (!entities || entities.length === 0) {
            return this._createEmptyCard(isEnergy);
        }
        // Check if hass is available
        if (!this._hass) {
            return this._createLoadingIndicator();
        }
        // Generate chart config
        const chartConfig = this._generateApexchartsConfig(entities, isEnergy);
        if (!chartConfig) {
            return this._createErrorMessage(`Failed to generate chart configuration for ${isEnergy ? 'energy' : 'power'} chart`, ['Check that all required entities exist in Home Assistant',
                'Refresh the page and try again']);
        }
        // Create the chart container
        const chartElement = document.createElement('div');
        chartElement.className = isEnergy ? 'energy-chart-container' : 'power-chart-container';
        chartElement.style.width = '100%';
        chartElement.style.marginBottom = '16px';
        chartElement.style.position = 'relative';
        chartElement.style.minHeight = `${((_a = this.config) === null || _a === void 0 ? void 0 : _a.chart_height) || 300}px`;
        try {
            // Check if apexcharts-card is registered
            if (this._apexChartCardRegistered === false) {
                return this._createErrorMessage('The apexcharts-card integration is not installed', [
                    'Install the apexcharts-card integration from HACS',
                    'Make sure apexcharts-card is correctly loaded in your Home Assistant instance',
                    'Refresh the page after installation to load the custom element'
                ]);
            }
            // Create the apexcharts-card element
            const apexCard = document.createElement('apexcharts-card');
            // Set card config for apexcharts-card
            try {
                apexCard.setConfig(chartConfig);
                apexCard.hass = this._hass;
                // Stop any potential auto-refresh by overriding the update method if it exists
                if (typeof apexCard._updateChart === 'function') {
                    const originalUpdateChart = apexCard._updateChart;
                    apexCard._updateChart = function (...args) {
                        // Only call the original update if explicitly requested
                        if (args[0] === 'manual-update') {
                            return originalUpdateChart.apply(this, args.slice(1));
                        }
                        // Otherwise prevent automatic updates
                        return;
                    };
                }
            }
            catch (configError) {
                console.error('Error configuring apexcharts-card:', configError);
                return this._createErrorMessage('Error configuring chart', ['The chart configuration is invalid',
                    'Check the console for more details']);
            }
            chartElement.appendChild(apexCard);
        }
        catch (err) {
            console.error(`Error creating ${isEnergy ? 'energy' : 'power'} chart:`, err);
            return this._createErrorMessage(`Error: ${err instanceof Error ? err.message : 'Failed to create chart'}`, [
                'Check that apexcharts-card is installed correctly',
                'Make sure all entities exist in Home Assistant',
                'Check the console for more detailed error information'
            ]);
        }
        return chartElement;
    }
    _createEmptyCard(isEnergy) {
        var _a;
        const container = document.createElement('div');
        container.className = 'empty-chart-container';
        container.style.padding = '16px';
        container.style.textAlign = 'center';
        container.style.color = 'var(--secondary-text-color)';
        container.style.height = `${(((_a = this.config) === null || _a === void 0 ? void 0 : _a.chart_height) || 300) - 32}px`;
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.flexDirection = 'column';
        container.style.border = '1px dashed var(--divider-color)';
        container.style.borderRadius = '8px';
        container.style.margin = '8px 16px';
        const icon = document.createElement('ha-icon');
        icon.setAttribute('icon', 'mdi:chart-line-variant');
        icon.style.marginBottom = '8px';
        icon.style.color = 'var(--secondary-text-color)';
        icon.style.width = '48px';
        icon.style.height = '48px';
        const message = document.createElement('div');
        message.textContent = `No ${isEnergy ? 'energy' : 'power'} entities selected. Please select entities in the Energy Dashboard Entity Card.`;
        container.appendChild(icon);
        container.appendChild(message);
        return container;
    }
    _createLoadingIndicator() {
        var _a;
        const container = document.createElement('div');
        container.className = 'loading-container';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.height = `${((_a = this.config) === null || _a === void 0 ? void 0 : _a.chart_height) || 200}px`;
        container.style.width = '100%';
        container.style.transition = 'opacity 0.3s ease-in-out';
        // Spinner
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
      <style>
        @keyframes spinner {
          to { transform: rotate(360deg); }
        }
        .loading-spinner:before {
          content: '';
          box-sizing: border-box;
          position: absolute;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2px solid var(--secondary-text-color);
          border-top-color: var(--primary-color);
          animation: spinner 0.8s linear infinite;
        }
      </style>
    `;
        spinner.style.position = 'relative';
        spinner.style.width = '30px';
        spinner.style.height = '30px';
        spinner.style.marginBottom = '16px';
        // Text
        const text = document.createElement('div');
        text.textContent = 'Initializing chart...';
        text.style.color = 'var(--secondary-text-color)';
        text.style.fontSize = '0.9em';
        container.appendChild(spinner);
        container.appendChild(text);
        return container;
    }
    _createErrorMessage(error, suggestions) {
        var _a;
        const container = document.createElement('div');
        container.className = 'error-container';
        container.style.padding = '16px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.height = `${(((_a = this.config) === null || _a === void 0 ? void 0 : _a.chart_height) || 200) - 32}px`;
        container.style.border = '1px dashed var(--error-color, red)';
        container.style.borderRadius = '8px';
        container.style.margin = '8px 16px';
        // Error icon
        const icon = document.createElement('ha-icon');
        icon.setAttribute('icon', 'mdi:alert-circle-outline');
        icon.style.color = 'var(--error-color, red)';
        icon.style.width = '40px';
        icon.style.height = '40px';
        icon.style.marginBottom = '8px';
        // Error message
        const errorText = document.createElement('div');
        errorText.textContent = error;
        errorText.style.color = 'var(--error-color, red)';
        errorText.style.fontWeight = 'bold';
        errorText.style.marginBottom = '8px';
        // Suggestions list
        const suggestionsList = document.createElement('ul');
        suggestionsList.style.color = 'var(--secondary-text-color)';
        suggestionsList.style.textAlign = 'left';
        suggestionsList.style.margin = '8px 0';
        suggestionsList.style.paddingLeft = '20px';
        suggestions.forEach(suggestion => {
            const item = document.createElement('li');
            item.textContent = suggestion;
            item.style.marginBottom = '4px';
            suggestionsList.appendChild(item);
        });
        container.appendChild(icon);
        container.appendChild(errorText);
        container.appendChild(suggestionsList);
        return container;
    }
    _updateCharts() {
        var _a;
        // Check if we need to reload selected entities
        this._loadSelectedEntities();
        // Power chart section
        if (this._powerChartEl) {
            const parent = this._powerChartEl.parentNode;
            if (parent) {
                const newPowerChart = this._createChart(false);
                parent.replaceChild(newPowerChart, this._powerChartEl);
                this._powerChartEl = newPowerChart;
                // Immediately disable any auto-refresh in the newly created ApexCharts card
                this._disableRefreshForApexChart(this._powerChartEl.querySelector('apexcharts-card'));
            }
        }
        // Energy chart section
        if (((_a = this.config) === null || _a === void 0 ? void 0 : _a.show_energy_section) && this._energyChartEl) {
            const parent = this._energyChartEl.parentNode;
            if (parent) {
                const newEnergyChart = this._createChart(true);
                parent.replaceChild(newEnergyChart, this._energyChartEl);
                this._energyChartEl = newEnergyChart;
                // Immediately disable any auto-refresh in the newly created ApexCharts card
                this._disableRefreshForApexChart(this._energyChartEl.querySelector('apexcharts-card'));
            }
        }
    }
    _disableRefreshForApexChart(apexChart) {
        if (!apexChart)
            return;
        try {
            const card = apexChart;
            if (card._updateTimer) {
                window.clearInterval(card._updateTimer);
                card._updateTimer = null;
            }
            if (card._config) {
                card._config.update_interval = '0s';
            }
            // Only block auto-refresh, allow manual refresh
            if (typeof card._updateChart === 'function' && !card._originalUpdateChart) {
                card._originalUpdateChart = card._updateChart;
                card._updateChart = function (arg) {
                    if (arg === 'manual-refresh') {
                        return card._originalUpdateChart.apply(this, arguments);
                    }
                    // Block automatic refreshes
                    return;
                };
            }
            if (typeof card._updateData === 'function' && !card._originalUpdateData) {
                card._originalUpdateData = card._updateData;
                card._updateData = function (arg) {
                    if (arg === 'manual-refresh') {
                        return card._originalUpdateData.apply(this, arguments);
                    }
                    return;
                };
            }
            if (card.ApexOptions && card.ApexOptions.chart) {
                if (card.ApexOptions.chart.animations) {
                    card.ApexOptions.chart.animations.enabled = false;
                }
                if (card._chart) {
                    const apexInstance = card._chart;
                    if (apexInstance && apexInstance.updateOptions) {
                        apexInstance.updateOptions({
                            chart: {
                                animations: { enabled: false },
                                autoUpdateSeries: false
                            }
                        }, false, false);
                    }
                }
            }
        }
        catch (error) {
            // Silently ignore
        }
    }
    _renderSectionTitle(title) {
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'section-title';
        sectionTitle.textContent = title;
        sectionTitle.style.padding = '8px 16px';
        sectionTitle.style.fontSize = 'var(--section-title-font-size, 1rem)';
        sectionTitle.style.fontWeight = '500';
        return sectionTitle;
    }
    _updateContent() {
        if (!this.config) {
            const card = this._root.querySelector('ha-card');
            if (card) {
                card.innerHTML = '<div class="empty-message">Card not configured</div>';
            }
            return;
        }
        // Get the ha-card element
        const card = this._root.querySelector('ha-card');
        if (!card)
            return;
        // Clear previous content
        card.innerHTML = '';
        // Header
        if (this.config.show_header) {
            const header = document.createElement('div');
            header.className = 'card-header';
            header.textContent = this.config.title;
            card.appendChild(header);
        }
        // Loading state - show loading indicator for the whole card when initializing
        if (this._isLoading) {
            const loadingIndicator = this._createLoadingIndicator();
            card.appendChild(loadingIndicator);
            return;
        }
        // Check if apexcharts-card is available (after loading state has ended)
        if (this._apexChartCardRegistered === false) {
            const errorMessage = this._createErrorMessage('The apexcharts-card integration is not installed', [
                'Install the apexcharts-card integration from HACS',
                'Make sure apexcharts-card is correctly loaded in your Home Assistant instance',
                'Refresh the page after installation to load the custom element'
            ]);
            card.appendChild(errorMessage);
            return;
        }
        // Add refresh controls before the charts
        const refreshControls = this._createRefreshControls();
        card.appendChild(refreshControls);
        // Container for both charts
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        chartContainer.style.width = '100%';
        chartContainer.style.display = 'flex';
        chartContainer.style.flexDirection = 'column';
        // Power chart section
        chartContainer.appendChild(this._renderSectionTitle('Power Consumption'));
        this._powerChartEl = this._createChart(false);
        chartContainer.appendChild(this._powerChartEl);
        // Energy chart section (if enabled)
        if (this.config.show_energy_section) {
            const separator = document.createElement('div');
            separator.className = 'section-separator';
            separator.style.margin = '16px 8px';
            chartContainer.appendChild(separator);
            chartContainer.appendChild(this._renderSectionTitle('Energy Consumption'));
            this._energyChartEl = this._createChart(true);
            chartContainer.appendChild(this._energyChartEl);
        }
        card.appendChild(chartContainer);
    }
    // Check if apexcharts-card is registered in the DOM
    _checkApexChartsRegistration() {
        this._isLoading = true;
        this._updateContent();
        // Use setTimeout to give the browser a chance to register custom elements
        setTimeout(() => {
            // Try to check if the element is defined
            this._apexChartCardRegistered = !!customElements.get('apexcharts-card');
            this._isLoading = false;
            this._updateContent();
        }, 500);
    }
    _setRefreshInterval(seconds) {
        // Convert seconds to string for apexcharts-card (e.g., "30s")
        const intervalString = `${seconds}s`;
        if (this.config) {
            this.config.update_interval = seconds;
        }
        this._currentRefreshInterval = seconds;
        this._updateRefreshControlsUI();
        // Update the ApexCharts card config for both charts (if present)
        const charts = this._findAllApexChartsCards();
        charts.forEach(chart => {
            if (chart._config) {
                chart._config.update_interval = intervalString;
                // Re-apply config to force ApexCharts to use new interval
                if (typeof chart.setConfig === 'function') {
                    chart.setConfig(chart._config);
                }
            }
        });
        // Stop our own timer and set up a new one if needed
        this._stopUpdateInterval();
        if (seconds > 0) {
            this._updateTimer = window.setInterval(() => {
                this._triggerApexChartManualRefresh();
            }, seconds * 1000);
        }
    }
    _manualRefresh() {
        // Reload the apexcharts-card instance(s) by re-creating the chart elements
        this._updateCharts();
    }
    _createRefreshControls() {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'refresh-controls';
        controlsContainer.style.display = 'flex';
        controlsContainer.style.justifyContent = 'space-between';
        controlsContainer.style.alignItems = 'center';
        controlsContainer.style.padding = '0 16px 8px';
        controlsContainer.style.gap = '8px';
        // Add a title for the refresh controls
        const refreshTitle = document.createElement('div');
        refreshTitle.className = 'refresh-title';
        refreshTitle.textContent = 'Refresh Rate:';
        refreshTitle.style.fontWeight = '500';
        refreshTitle.style.fontSize = '0.9em';
        refreshTitle.style.marginRight = '8px';
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'buttons-container';
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'flex-end';
        buttonsContainer.style.alignItems = 'center';
        buttonsContainer.style.gap = '8px';
        // Manual refresh button
        const refreshButton = document.createElement('button');
        refreshButton.className = 'refresh-button control-button';
        refreshButton.innerHTML = '<ha-icon icon="mdi:refresh"></ha-icon>';
        refreshButton.title = 'Refresh now';
        refreshButton.addEventListener('click', () => this._manualRefresh());
        refreshButton.style.minWidth = '36px';
        refreshButton.style.width = '36px';
        // Off button (disable automatic refresh)
        const offButton = document.createElement('button');
        offButton.className = 'interval-button control-button';
        offButton.innerText = 'Off';
        offButton.title = 'Disable automatic refresh';
        offButton.dataset.seconds = '0';
        offButton.addEventListener('click', () => this._setRefreshInterval(0));
        // 15 seconds button
        const sec15Button = document.createElement('button');
        sec15Button.className = 'interval-button control-button';
        sec15Button.innerText = '15s';
        sec15Button.title = 'Refresh every 15 seconds';
        sec15Button.dataset.seconds = '15';
        sec15Button.addEventListener('click', () => this._setRefreshInterval(15));
        // 30 seconds button
        const sec30Button = document.createElement('button');
        sec30Button.className = 'interval-button control-button';
        sec30Button.innerText = '30s';
        sec30Button.title = 'Refresh every 30 seconds';
        sec30Button.dataset.seconds = '30';
        sec30Button.addEventListener('click', () => this._setRefreshInterval(30));
        // 60 seconds button
        const sec60Button = document.createElement('button');
        sec60Button.className = 'interval-button control-button';
        sec60Button.innerText = '60s';
        sec60Button.title = 'Refresh every 60 seconds';
        sec60Button.dataset.seconds = '60';
        sec60Button.addEventListener('click', () => this._setRefreshInterval(60));
        buttonsContainer.appendChild(refreshButton);
        buttonsContainer.appendChild(offButton);
        buttonsContainer.appendChild(sec15Button);
        buttonsContainer.appendChild(sec30Button);
        buttonsContainer.appendChild(sec60Button);
        controlsContainer.appendChild(refreshTitle);
        controlsContainer.appendChild(buttonsContainer);
        // Set initial active state
        this._updateRefreshControlsUI(buttonsContainer);
        return controlsContainer;
    }
    _updateRefreshControlsUI(container) {
        const controls = container || this._root.querySelector('.buttons-container');
        if (!controls)
            return;
        // Clear active state from all buttons
        const buttons = controls.querySelectorAll('.interval-button');
        buttons.forEach(btn => {
            const button = btn;
            button.classList.remove('active');
            button.style.backgroundColor = 'var(--secondary-background-color)';
            button.style.color = 'var(--primary-text-color)';
        });
        // Set active state for the current interval button
        const activeButton = controls.querySelector(`.interval-button[data-seconds="${this._currentRefreshInterval}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
            activeButton.style.backgroundColor = 'var(--primary-color)';
            activeButton.style.color = 'var(--text-primary-color)';
        }
    }
    // Helper method to disable auto-updates in all ApexCharts instances
    _disableApexChartsAutoUpdate() {
        // Find and process all apexcharts-card elements in our shadow root
        const charts = this._findAllApexChartsCards();
        if (charts.length > 0) {
            // Disable timers and auto-refresh for all found charts
            this._stopAllApexChartTimers();
            // Log how many charts we disabled
            console.log(`Disabled auto-refresh for ${charts.length} ApexCharts cards`);
        }
    }
    _findAllApexChartsCards() {
        // Get all apexcharts-card elements within our shadowRoot
        const charts = [];
        // Look for the power chart
        if (this._powerChartEl) {
            const powerChart = this._powerChartEl.querySelector('apexcharts-card');
            if (powerChart)
                charts.push(powerChart);
        }
        // Look for the energy chart if it exists
        if (this._energyChartEl) {
            const energyChart = this._energyChartEl.querySelector('apexcharts-card');
            if (energyChart)
                charts.push(energyChart);
        }
        return charts;
    }
    _stopAllApexChartTimers() {
        const charts = this._findAllApexChartsCards();
        charts.forEach(chart => {
            // If the chart has an update timer, clear it
            if (chart._updateTimer) {
                window.clearInterval(chart._updateTimer);
                chart._updateTimer = null;
            }
            // If the chart has a config, make sure update_interval is set to 0
            if (chart._config) {
                chart._config.update_interval = 0;
            }
            // If the chart has internal data refreshing methods, intercept them
            this._interceptApexChartRefresh(chart);
        });
    }
    _interceptApexChartRefresh(chart) {
        // Try to intercept the update method if it exists
        if (chart._updateChart && !chart._originalUpdateChart) {
            chart._originalUpdateChart = chart._updateChart;
            chart._updateChart = function () {
                // Prevent automatic updates
                console.log('ApexCharts auto refresh prevented');
                return Promise.resolve();
            };
        }
        // Try to intercept the data update method if it exists
        if (chart._updateData && !chart._originalUpdateData) {
            chart._originalUpdateData = chart._updateData;
            chart._updateData = function () {
                // Prevent automatic updates
                console.log('ApexCharts data update prevented');
                return Promise.resolve();
            };
        }
        // Disable any other auto-update mechanism the chart might have
        if (chart._chart && chart._chart.updateOptions) {
            try {
                chart._chart.updateOptions({
                    chart: {
                        animations: {
                            enabled: false
                        },
                        autoUpdateSeries: false
                    }
                }, false, false);
            }
            catch (e) {
                console.warn('Failed to update ApexCharts options:', e);
            }
        }
    }
    _triggerApexChartManualRefresh() {
        const charts = this._findAllApexChartsCards();
        charts.forEach(chart => {
            try {
                if (chart._originalUpdateChart) {
                    chart._originalUpdateChart.call(chart, 'manual-refresh');
                    return;
                }
                if (chart._updateChart) {
                    chart._updateChart.call(chart, 'manual-refresh');
                    return;
                }
                if (chart.updateChart) {
                    chart.updateChart('manual-refresh');
                    return;
                }
                if (chart.update) {
                    chart.update('manual-refresh');
                    return;
                }
                if (chart._originalUpdateData) {
                    chart._originalUpdateData.call(chart, 'manual-refresh');
                    return;
                }
                if (chart._updateData) {
                    chart._updateData.call(chart, 'manual-refresh');
                    return;
                }
                if (chart._chart && chart._chart.updateSeries) {
                    const currentSeries = chart._chart.w.globals.series;
                    chart._chart.updateSeries(currentSeries, true);
                }
            }
            catch (e) {
                // Silently ignore
            }
        });
    }
}
// Register the card with the custom elements registry
customElements.define('energy-dashboard-chart-card', EnergyDashboardChartCard);

class EnergyDashboardChartCardEditor extends HTMLElement {
    constructor() {
        super();
        this.valueChanged = (ev) => {
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
            // Handle nested properties like power_chart_options.y_axis.title
            if (configValue.includes('.')) {
                const parts = configValue.split('.');
                const newConfig = { ...this.config };
                let currentObj = newConfig;
                for (let i = 0; i < parts.length - 1; i++) {
                    const part = parts[i];
                    if (!currentObj[part])
                        currentObj[part] = {};
                    currentObj[part] = { ...currentObj[part] };
                    currentObj = currentObj[part];
                }
                currentObj[parts[parts.length - 1]] = newValue;
                this.dispatchEvent(new CustomEvent('config-changed', {
                    detail: { config: newConfig },
                    bubbles: true,
                    composed: true
                }));
                return;
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
        };
        this._root = this.attachShadow({ mode: 'open' });
        this._root.appendChild(createStyles(editorStyles));
        // Create the form container
        const form = document.createElement('div');
        form.className = 'form';
        this._root.appendChild(form);
    }
    // Called when the element is added to the DOM
    connectedCallback() {
        this._updateForm();
    }
    setConfig(config) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        // Apply default chart config values 
        const defaultConfig = getDefaultChartConfig();
        // Create a merged config object
        this.config = {
            ...defaultConfig,
            ...config,
            // Handle nested objects properly
            power_chart_options: {
                ...defaultConfig.power_chart_options,
                ...(config.power_chart_options || {}),
                y_axis: {
                    ...(_a = defaultConfig.power_chart_options) === null || _a === void 0 ? void 0 : _a.y_axis,
                    ...(((_b = config.power_chart_options) === null || _b === void 0 ? void 0 : _b.y_axis) || {})
                }
            },
            energy_chart_options: {
                ...defaultConfig.energy_chart_options,
                ...(config.energy_chart_options || {}),
                y_axis: {
                    ...(_c = defaultConfig.energy_chart_options) === null || _c === void 0 ? void 0 : _c.y_axis,
                    ...(((_d = config.energy_chart_options) === null || _d === void 0 ? void 0 : _d.y_axis) || {})
                }
            },
            // Add base EnergyDashboardConfig properties
            title: (_e = config.title) !== null && _e !== void 0 ? _e : 'Energy Dashboard Chart',
            show_header: (_f = config.show_header) !== null && _f !== void 0 ? _f : true,
            show_state: (_g = config.show_state) !== null && _g !== void 0 ? _g : true,
            show_toggle: (_h = config.show_toggle) !== null && _h !== void 0 ? _h : true,
            auto_select_count: (_j = config.auto_select_count) !== null && _j !== void 0 ? _j : 6,
            max_height: (_k = config.max_height) !== null && _k !== void 0 ? _k : 400,
            show_energy_section: (_l = config.show_energy_section) !== null && _l !== void 0 ? _l : true,
            energy_auto_select_count: (_m = config.energy_auto_select_count) !== null && _m !== void 0 ? _m : 6,
            show_legend: (_o = config.show_legend) !== null && _o !== void 0 ? _o : true,
        };
        this._updateForm();
    }
    _updateForm() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
        if (!this.config)
            return;
        // Get or create the form element
        let form = this._root.querySelector('.form');
        if (!form) {
            form = document.createElement('div');
            form.className = 'form';
            this._root.appendChild(form);
        }
        form.innerHTML = '';
        // SECTION: General Settings
        this._addSectionTitle(form, 'General Settings');
        // Title field
        const titleRow = this._createRow();
        const titleField = document.createElement('ha-textfield');
        titleField.className = 'value';
        titleField.label = 'Title';
        titleField.value = this.config.title || 'Energy Dashboard Chart';
        titleField.configValue = 'title';
        titleField.addEventListener('change', this.valueChanged);
        titleRow.appendChild(titleField);
        form.appendChild(titleRow);
        // Show Header toggle
        const headerRow = this._createRow();
        const headerSwitch = document.createElement('ha-switch');
        headerSwitch.checked = this.config.show_header !== false;
        headerSwitch.configValue = 'show_header';
        headerSwitch.addEventListener('change', this.valueChanged);
        const headerLabel = document.createElement('div');
        headerLabel.textContent = 'Show Header';
        headerRow.appendChild(headerSwitch);
        headerRow.appendChild(headerLabel);
        form.appendChild(headerRow);
        // Show Energy Section toggle
        const energySectionRow = this._createRow();
        const energySectionSwitch = document.createElement('ha-switch');
        energySectionSwitch.checked = this.config.show_energy_section !== false;
        energySectionSwitch.configValue = 'show_energy_section';
        energySectionSwitch.addEventListener('change', this.valueChanged);
        const energySectionLabel = document.createElement('div');
        energySectionLabel.textContent = 'Show Energy Section';
        energySectionRow.appendChild(energySectionSwitch);
        energySectionRow.appendChild(energySectionLabel);
        form.appendChild(energySectionRow);
        // SECTION: Chart Settings
        this._addSectionTitle(form, 'Chart Settings');
        // Chart Type dropdown
        const chartTypeRow = this._createRow();
        const chartTypeField = document.createElement('ha-select');
        chartTypeField.className = 'value';
        chartTypeField.label = 'Chart Type';
        chartTypeField.configValue = 'chart_type';
        // Set options for the chart type dropdown
        chartTypeField.options = [
            { value: 'line', label: 'Line' },
            { value: 'area', label: 'Area' },
            { value: 'bar', label: 'Bar' }
        ];
        chartTypeField.value = this.config.chart_type || 'line';
        chartTypeField.addEventListener('change', this.valueChanged);
        chartTypeRow.appendChild(chartTypeField);
        form.appendChild(chartTypeRow);
        // Chart Height field
        const chartHeightRow = this._createRow();
        const chartHeightField = document.createElement('ha-textfield');
        chartHeightField.className = 'value';
        chartHeightField.label = 'Chart Height (pixels)';
        chartHeightField.type = 'number';
        chartHeightField.min = '100';
        chartHeightField.max = '1000';
        chartHeightField.value = String(this.config.chart_height || 300);
        chartHeightField.configValue = 'chart_height';
        chartHeightField.addEventListener('change', this.valueChanged);
        chartHeightRow.appendChild(chartHeightField);
        form.appendChild(chartHeightRow);
        // Hours to Show field
        const hoursToShowRow = this._createRow();
        const hoursToShowField = document.createElement('ha-textfield');
        hoursToShowField.className = 'value';
        hoursToShowField.label = 'Hours to Show';
        hoursToShowField.type = 'number';
        hoursToShowField.min = '1';
        hoursToShowField.max = '168'; // 7 days
        hoursToShowField.value = String(this.config.hours_to_show || 24);
        hoursToShowField.configValue = 'hours_to_show';
        hoursToShowField.addEventListener('change', this.valueChanged);
        hoursToShowRow.appendChild(hoursToShowField);
        form.appendChild(hoursToShowRow);
        // Update Interval field
        const updateIntervalRow = this._createRow();
        const updateIntervalField = document.createElement('ha-textfield');
        updateIntervalField.className = 'value';
        updateIntervalField.label = 'Update Interval (seconds)';
        updateIntervalField.type = 'number';
        updateIntervalField.min = '10';
        updateIntervalField.max = '3600';
        updateIntervalField.value = String(this.config.update_interval || 60);
        updateIntervalField.configValue = 'update_interval';
        updateIntervalField.addEventListener('change', this.valueChanged);
        updateIntervalRow.appendChild(updateIntervalField);
        form.appendChild(updateIntervalRow);
        // Show Points toggle
        const showPointsRow = this._createRow();
        const showPointsSwitch = document.createElement('ha-switch');
        showPointsSwitch.checked = this.config.show_points === true;
        showPointsSwitch.configValue = 'show_points';
        showPointsSwitch.addEventListener('change', this.valueChanged);
        const showPointsLabel = document.createElement('div');
        showPointsLabel.textContent = 'Show Data Points';
        showPointsRow.appendChild(showPointsSwitch);
        showPointsRow.appendChild(showPointsLabel);
        form.appendChild(showPointsRow);
        // Smooth Curve toggle
        const smoothCurveRow = this._createRow();
        const smoothCurveSwitch = document.createElement('ha-switch');
        smoothCurveSwitch.checked = this.config.smooth_curve !== false;
        smoothCurveSwitch.configValue = 'smooth_curve';
        smoothCurveSwitch.addEventListener('change', this.valueChanged);
        const smoothCurveLabel = document.createElement('div');
        smoothCurveLabel.textContent = 'Smooth Curve';
        smoothCurveRow.appendChild(smoothCurveSwitch);
        smoothCurveRow.appendChild(smoothCurveLabel);
        form.appendChild(smoothCurveRow);
        // Show Legend toggle
        const showLegendRow = this._createRow();
        const showLegendSwitch = document.createElement('ha-switch');
        showLegendSwitch.checked = this.config.show_legend !== false;
        showLegendSwitch.configValue = 'show_legend';
        showLegendSwitch.addEventListener('change', this.valueChanged);
        const showLegendLabel = document.createElement('div');
        showLegendLabel.textContent = 'Show Legend';
        showLegendRow.appendChild(showLegendSwitch);
        showLegendRow.appendChild(showLegendLabel);
        form.appendChild(showLegendRow);
        // Use Custom Colors toggle
        const customColorsRow = this._createRow();
        const customColorsSwitch = document.createElement('ha-switch');
        customColorsSwitch.checked = this.config.use_custom_colors === true;
        customColorsSwitch.configValue = 'use_custom_colors';
        customColorsSwitch.addEventListener('change', this.valueChanged);
        const customColorsLabel = document.createElement('div');
        customColorsLabel.textContent = 'Use Custom Colors';
        customColorsRow.appendChild(customColorsSwitch);
        customColorsRow.appendChild(customColorsLabel);
        form.appendChild(customColorsRow);
        // Aggregate Function dropdown
        const aggregateRow = this._createRow();
        const aggregateField = document.createElement('ha-select');
        aggregateField.className = 'value';
        aggregateField.label = 'Aggregate Function';
        aggregateField.configValue = 'aggregate_func';
        // Set options for the aggregate function dropdown
        aggregateField.options = [
            { value: 'avg', label: 'Average' },
            { value: 'min', label: 'Minimum' },
            { value: 'max', label: 'Maximum' },
            { value: 'sum', label: 'Sum' },
            { value: 'first', label: 'First' },
            { value: 'last', label: 'Last' }
        ];
        aggregateField.value = this.config.aggregate_func || 'avg';
        aggregateField.addEventListener('change', this.valueChanged);
        aggregateRow.appendChild(aggregateField);
        form.appendChild(aggregateRow);
        // SECTION: Power Chart Settings
        this._addSectionTitle(form, 'Power Chart Y-Axis Settings');
        // Power Y-Axis Title
        const powerYTitleRow = this._createRow();
        const powerYTitleField = document.createElement('ha-textfield');
        powerYTitleField.className = 'value';
        powerYTitleField.label = 'Y-Axis Title';
        powerYTitleField.value = ((_b = (_a = this.config.power_chart_options) === null || _a === void 0 ? void 0 : _a.y_axis) === null || _b === void 0 ? void 0 : _b.title) || 'Power';
        powerYTitleField.configValue = 'power_chart_options.y_axis.title';
        powerYTitleField.addEventListener('change', this.valueChanged);
        powerYTitleRow.appendChild(powerYTitleField);
        form.appendChild(powerYTitleRow);
        // Power Y-Axis Unit
        const powerYUnitRow = this._createRow();
        const powerYUnitField = document.createElement('ha-textfield');
        powerYUnitField.className = 'value';
        powerYUnitField.label = 'Y-Axis Unit';
        powerYUnitField.value = ((_d = (_c = this.config.power_chart_options) === null || _c === void 0 ? void 0 : _c.y_axis) === null || _d === void 0 ? void 0 : _d.unit) || 'W';
        powerYUnitField.configValue = 'power_chart_options.y_axis.unit';
        powerYUnitField.addEventListener('change', this.valueChanged);
        powerYUnitRow.appendChild(powerYUnitField);
        form.appendChild(powerYUnitRow);
        // Power Y-Axis Decimals
        const powerYDecimalsRow = this._createRow();
        const powerYDecimalsField = document.createElement('ha-textfield');
        powerYDecimalsField.className = 'value';
        powerYDecimalsField.label = 'Y-Axis Decimals';
        powerYDecimalsField.type = 'number';
        powerYDecimalsField.min = '0';
        powerYDecimalsField.max = '5';
        powerYDecimalsField.value = String((_g = (_f = (_e = this.config.power_chart_options) === null || _e === void 0 ? void 0 : _e.y_axis) === null || _f === void 0 ? void 0 : _f.decimals) !== null && _g !== void 0 ? _g : 1);
        powerYDecimalsField.configValue = 'power_chart_options.y_axis.decimals';
        powerYDecimalsField.addEventListener('change', this.valueChanged);
        powerYDecimalsRow.appendChild(powerYDecimalsField);
        form.appendChild(powerYDecimalsRow);
        // Power Y-Axis Min
        const powerYMinRow = this._createRow();
        const powerYMinField = document.createElement('ha-textfield');
        powerYMinField.className = 'value';
        powerYMinField.label = 'Y-Axis Minimum (empty for auto)';
        powerYMinField.type = 'number';
        powerYMinField.value = ((_j = (_h = this.config.power_chart_options) === null || _h === void 0 ? void 0 : _h.y_axis) === null || _j === void 0 ? void 0 : _j.min) !== undefined ?
            String(this.config.power_chart_options.y_axis.min) : '';
        powerYMinField.configValue = 'power_chart_options.y_axis.min';
        powerYMinField.addEventListener('change', this.valueChanged);
        powerYMinRow.appendChild(powerYMinField);
        form.appendChild(powerYMinRow);
        // Power Y-Axis Max
        const powerYMaxRow = this._createRow();
        const powerYMaxField = document.createElement('ha-textfield');
        powerYMaxField.className = 'value';
        powerYMaxField.label = 'Y-Axis Maximum (empty for auto)';
        powerYMaxField.type = 'number';
        powerYMaxField.value = ((_l = (_k = this.config.power_chart_options) === null || _k === void 0 ? void 0 : _k.y_axis) === null || _l === void 0 ? void 0 : _l.max) !== undefined ?
            String(this.config.power_chart_options.y_axis.max) : '';
        powerYMaxField.configValue = 'power_chart_options.y_axis.max';
        powerYMaxField.addEventListener('change', this.valueChanged);
        powerYMaxRow.appendChild(powerYMaxField);
        form.appendChild(powerYMaxRow);
        // Only show Energy Chart settings if energy section is enabled
        if (this.config.show_energy_section) {
            // SECTION: Energy Chart Settings
            this._addSectionTitle(form, 'Energy Chart Y-Axis Settings');
            // Energy Y-Axis Title
            const energyYTitleRow = this._createRow();
            const energyYTitleField = document.createElement('ha-textfield');
            energyYTitleField.className = 'value';
            energyYTitleField.label = 'Y-Axis Title';
            energyYTitleField.value = ((_o = (_m = this.config.energy_chart_options) === null || _m === void 0 ? void 0 : _m.y_axis) === null || _o === void 0 ? void 0 : _o.title) || 'Energy';
            energyYTitleField.configValue = 'energy_chart_options.y_axis.title';
            energyYTitleField.addEventListener('change', this.valueChanged);
            energyYTitleRow.appendChild(energyYTitleField);
            form.appendChild(energyYTitleRow);
            // Energy Y-Axis Unit
            const energyYUnitRow = this._createRow();
            const energyYUnitField = document.createElement('ha-textfield');
            energyYUnitField.className = 'value';
            energyYUnitField.label = 'Y-Axis Unit';
            energyYUnitField.value = ((_q = (_p = this.config.energy_chart_options) === null || _p === void 0 ? void 0 : _p.y_axis) === null || _q === void 0 ? void 0 : _q.unit) || 'kWh';
            energyYUnitField.configValue = 'energy_chart_options.y_axis.unit';
            energyYUnitField.addEventListener('change', this.valueChanged);
            energyYUnitRow.appendChild(energyYUnitField);
            form.appendChild(energyYUnitRow);
            // Energy Y-Axis Decimals
            const energyYDecimalsRow = this._createRow();
            const energyYDecimalsField = document.createElement('ha-textfield');
            energyYDecimalsField.className = 'value';
            energyYDecimalsField.label = 'Y-Axis Decimals';
            energyYDecimalsField.type = 'number';
            energyYDecimalsField.min = '0';
            energyYDecimalsField.max = '5';
            energyYDecimalsField.value = String((_t = (_s = (_r = this.config.energy_chart_options) === null || _r === void 0 ? void 0 : _r.y_axis) === null || _s === void 0 ? void 0 : _s.decimals) !== null && _t !== void 0 ? _t : 2);
            energyYDecimalsField.configValue = 'energy_chart_options.y_axis.decimals';
            energyYDecimalsField.addEventListener('change', this.valueChanged);
            energyYDecimalsRow.appendChild(energyYDecimalsField);
            form.appendChild(energyYDecimalsRow);
            // Energy Y-Axis Min
            const energyYMinRow = this._createRow();
            const energyYMinField = document.createElement('ha-textfield');
            energyYMinField.className = 'value';
            energyYMinField.label = 'Y-Axis Minimum (empty for auto)';
            energyYMinField.type = 'number';
            energyYMinField.value = ((_v = (_u = this.config.energy_chart_options) === null || _u === void 0 ? void 0 : _u.y_axis) === null || _v === void 0 ? void 0 : _v.min) !== undefined ?
                String(this.config.energy_chart_options.y_axis.min) : '';
            energyYMinField.configValue = 'energy_chart_options.y_axis.min';
            energyYMinField.addEventListener('change', this.valueChanged);
            energyYMinRow.appendChild(energyYMinField);
            form.appendChild(energyYMinRow);
            // Energy Y-Axis Max
            const energyYMaxRow = this._createRow();
            const energyYMaxField = document.createElement('ha-textfield');
            energyYMaxField.className = 'value';
            energyYMaxField.label = 'Y-Axis Maximum (empty for auto)';
            energyYMaxField.type = 'number';
            energyYMaxField.value = ((_x = (_w = this.config.energy_chart_options) === null || _w === void 0 ? void 0 : _w.y_axis) === null || _x === void 0 ? void 0 : _x.max) !== undefined ?
                String(this.config.energy_chart_options.y_axis.max) : '';
            energyYMaxField.configValue = 'energy_chart_options.y_axis.max';
            energyYMaxField.addEventListener('change', this.valueChanged);
            energyYMaxRow.appendChild(energyYMaxField);
            form.appendChild(energyYMaxRow);
        }
    }
    _createRow() {
        const row = document.createElement('div');
        row.className = 'row';
        return row;
    }
    _addSectionTitle(parent, title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'title';
        titleEl.textContent = title;
        parent.appendChild(titleEl);
    }
}
// Register the editor with the custom elements registry
customElements.define('energy-dashboard-chart-card-editor', EnergyDashboardChartCardEditor);

// Provide card information to the Home Assistant card catalog
window.customCards = window.customCards || [];
window.customCards.push({
    type: 'energy-dashboard-entity-card',
    name: EnergyDashboardEntityCard.displayName,
    description: EnergyDashboardEntityCard.description,
    preview: false,
    documentationURL: 'https://github.com/bballdavis/Hass-Energy-Dashboard'
});
// Add the chart card to the Home Assistant card catalog
window.customCards.push({
    type: 'energy-dashboard-chart-card',
    name: EnergyDashboardChartCard.displayName,
    description: EnergyDashboardChartCard.description,
    preview: false,
    documentationURL: 'https://github.com/bballdavis/Hass-Energy-Dashboard'
});
//# sourceMappingURL=energy-dashboard.js.map
