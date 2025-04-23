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

// Provide card information to the Home Assistant card catalog
window.customCards = window.customCards || [];
window.customCards.push({
    type: 'energy-dashboard-entity-card',
    name: EnergyDashboardEntityCard.displayName,
    description: EnergyDashboardEntityCard.description,
    preview: false,
    documentationURL: 'https://github.com/bballdavis/Hass-Energy-Dashboard'
});
//# sourceMappingURL=energy-dashboard.js.map
