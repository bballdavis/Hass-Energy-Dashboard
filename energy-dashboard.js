/**
 * Utility functions for entity selection, persistence, and Home Assistant state parsing.
 * Includes helpers for power/energy entity extraction and toggle state management.
 */
/**
 * Returns all power entities (W/kW) from Home Assistant state.
 * @param hass Home Assistant state object
 * @returns Array of EntityInfo for power entities
 */
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
/**
 * Returns all energy entities (Wh/kWh) from Home Assistant state.
 * @param hass Home Assistant state object
 * @returns Array of EntityInfo for energy entities
 */
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
/**
 * Loads toggle states from localStorage for a given key.
 * @param key Storage key
 * @returns Record of entityId to boolean, or null if not found
 */
function loadToggleStates(key) {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    }
    catch {
        return null;
    }
}
/**
 * Saves toggle states to localStorage for a given key.
 * @param states Record of entityId to boolean
 * @param key Storage key
 */
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

/**
 * Style definitions for the Energy Dashboard cards and editors.
 * Includes card layout, entity list, controls, and editor form styles.
 */
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
    --control-spacing: 5px;
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
    gap: var(--control-spacing, 5px); /* Using variable with 5px default */
  }
  .control-button, .select-all-button {
    background-color: var(--card-background-color, white);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px; /* Reduced from 6px */
    padding: 2px 6px; /* Further reduced padding */
    color: var(--primary-text-color);
    font-size: 0.8em; /* Even smaller font */
    font-weight: 500;
    cursor: pointer;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    flex: 1;
    margin: 0;
    box-shadow: none; /* Removed for flatter appearance */
    min-height: 22px; /* Further reduced height */
    max-height: 22px; /* Added max-height to enforce compactness */
    box-sizing: border-box;
    white-space: nowrap; /* Prevent text wrapping */
    overflow: hidden; /* Prevent content overflow */
    line-height: 1; /* Tighter line height */
  }
  .control-button:hover, .select-all-button:hover {
    background-color: var(--primary-color);
    color: var(--text-primary-color);
  }
  .control-button ha-icon, .select-all-button ha-icon {
    margin-right: 3px; /* Further reduced margin */
    margin-bottom: 0px;
    --mdc-icon-size: 14px; /* Even smaller icons */
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
    width: calc(100% - (var(--card-padding) * 2));
    box-sizing: border-box;
    min-width: 100%;
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
    border: 1px solid var(--divider-color, #e0e0e0); /* Light grey border for unselected */
  }
  .entity-item:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }
  .entity-item.on {
    border: 2px solid var(--entity-selected-border-color, var(--primary-color)); /* Highlight border when selected */
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
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
    min-width: 45px; /* Reduced from 65px to allow another 20px more for entity name */
    max-width: 45px; /* Reduced from 65px to allow another 20px more for entity name */
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
  
  .search-container {
    padding: 0 var(--card-padding) 16px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .search-input {
    width: 100%;
    padding: 8px 16px;
    border-radius: 24px;
    border: 1px solid var(--divider-color, #e0e0e0);
    background-color: var(--card-background-color, white);
    color: var(--primary-text-color);
    font-size: 14px;
    box-sizing: border-box;
    transition: all 0.3s ease;
  }
  
  .search-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
  }
  
  .refresh-control-container {
    padding: 0 var(--card-padding) 12px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .refresh-control {
    display: flex;
    background-color: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 16px;
    overflow: hidden;
    height: 26px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  .refresh-option {
    padding: 0 12px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--secondary-text-color);
    position: relative;
    min-width: 32px;
  }
  
  .refresh-option.active {
    background-color: var(--primary-color);
    color: var(--text-primary-color);
  }
  
  .refresh-option:hover:not(.active) {
    background-color: var(--divider-color);
  }
  
  .refresh-option.refresh-button {
    border-left: 1px solid var(--divider-color);
  }
  
  .refresh-option ha-icon {
    --mdc-icon-size: 14px;
  }

  /* Controls container layout */
  .controls-container {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: flex-end;
    width: 100%;
    padding: 8px var(--card-padding);
    box-sizing: border-box;
    gap: 10px;
    margin: 0;
  }

  /* Pill controls layout */
  .pill-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0 !important;
    padding: 0 !important;
    min-width: 0;
    flex: 0 0 auto;
  }

  .controls-container > .pill-group:not(:last-child) {
    margin-right: 0 !important;
  }

  .pill-row {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    justify-content: flex-start;
    width: 100%;
    gap: 0;
    margin: 0;
    padding: 0;
    min-height: 0;
    box-sizing: border-box;
  }
  
  .pill-control {
    background-color: var(--card-background-color, white);
    border: 1px solid var(--divider-color, #e0e0e0);
    color: var(--primary-text-color);
    font-size: 0.92em;
    font-weight: 500;
    cursor: pointer;
    padding: 2px 10px;
    min-width: 36px;
    min-height: 24px;
    height: 26px;
    box-sizing: border-box;
    transition: all 0.2s;
    border-radius: 16px;
    margin: 0;
    outline: none;
    border-right: none;
    line-height: 1.2;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .pill-control:last-child {
    border-right: 1px solid var(--divider-color, #e0e0e0);
  }
  
  .pill-control.active {
    background-color: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
    border-color: var(--primary-color, #03a9f4);
    z-index: 1;
  }
  
  .pill-control:not(.active):hover {
    background-color: var(--divider-color, #e0e0e0);
    color: var(--primary-text-color);
  }
  
  .pill-row .pill-control {
    border-radius: 0;
  }
  
  .pill-row .pill-control:first-child {
    border-radius: 16px 0 0 16px;
  }
  
  .pill-row .pill-control:last-child {
    border-radius: 0 16px 16px 0;
    border-right: 1px solid var(--divider-color, #e0e0e0);
  }

  /* Manual refresh button specific styles */
  .refresh-rate-button.manual-refresh {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0; /* Remove padding to rely on flex centering */
    min-width: 36px; /* Keep minimum width */
    width: 36px; /* Fixed width to match other buttons */
    height: 26px; /* Fixed height to match other pills */
    box-sizing: border-box;
    border-radius: 16px 0 0 16px;
    margin-right: -1px; /* For pill group effect */
  }

  .refresh-rate-button.manual-refresh ha-icon {
    /* Set explicit size for the icon */
    --mdc-icon-size: 14px;
    width: 14px;
    height: 14px;
    display: flex; /* Make the icon itself a flex container */
    align-items: center;
    justify-content: center;
    margin: 0;
    line-height: 1;
  }

  .pill-label {
    font-size: 11px !important;
    line-height: 1;
    color: var(--secondary-text-color, #888);
    margin-bottom: 2px;
    margin-top: 0px;
    text-align: center;
    letter-spacing: 0.01em;
    font-weight: 500;
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

/**
 * Main component for the Energy Dashboard Entity Card.
 * Handles entity selection, filtering, persistence, and UI controls for power and energy entities.
 * Designed for Home Assistant custom dashboards.
 *
 * Key responsibilities:
 * - Display and manage selectable power/energy entities
 * - Provide search/filter, auto-select, clear, and reset controls
 * - Persist entity selections and view mode
 * - Sync with the chart card for visualization
 */
class EnergyDashboardEntityCard extends HTMLElement {
    _equalizeButtonHeights(buttonContainer) {
        if (!buttonContainer)
            return;
        const buttons = Array.from(buttonContainer.querySelectorAll('button'));
        if (buttons.length === 0)
            return;
        buttons.forEach(btn => btn.style.height = 'auto');
        try {
            const resizeObserver = new ResizeObserver(() => {
                const maxHeight = Math.max(...buttons.map(btn => btn.offsetHeight));
                if (maxHeight > 0) {
                    buttons.forEach(btn => {
                        btn.style.height = `${maxHeight}px`;
                    });
                }
            });
            buttons.forEach(button => resizeObserver.observe(button));
            requestAnimationFrame(() => {
                const maxHeight = Math.max(...buttons.map(btn => btn.offsetHeight));
                if (maxHeight > 0) {
                    buttons.forEach(btn => {
                        btn.style.height = `${maxHeight}px`;
                    });
                }
            });
            setTimeout(() => {
                resizeObserver.disconnect();
            }, 2000);
        }
        catch {
            setTimeout(() => {
                const maxHeight = Math.max(...buttons.map(btn => btn.offsetHeight));
                if (maxHeight > 0) {
                    buttons.forEach(btn => {
                        btn.style.height = `${maxHeight}px`;
                    });
                }
            }, 100);
        }
    }
    _forceRecalculation(element) {
        return element.offsetHeight;
    }
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
        this._viewMode = 'power';
        this._powerEntitiesContainer = null;
        this._energyEntitiesContainer = null;
        this._dynamicFilterValue = '';
        this._filteredPowerEntities = [];
        this._filteredEnergyEntities = [];
        this._searchInputHasFocus = false;
        this._refreshIntervalId = null;
        this._lastUpdateTimestamp = 0;
        this._forceUpdate = false;
        this._handleFilterInput = (e) => {
            const target = e.target;
            this._dynamicFilterValue = target.value;
            if (this._viewMode === 'power') {
                const filteredEntities = this._applyRemovalFilter(this.powerEntities);
                this._filteredPowerEntities = this._applyDynamicFilter(filteredEntities, this._dynamicFilterValue);
            }
            else {
                const filteredEntities = this._applyRemovalFilter(this.energyEntities);
                this._filteredEnergyEntities = this._applyDynamicFilter(filteredEntities, this._dynamicFilterValue);
            }
            this._updateContent();
        };
        this._resetToPowerDefaultEntities = () => {
            var _a, _b;
            const entities = getPowerEntities(this._hass);
            let visibleEntities = this._applyRemovalFilter(entities);
            const toggleStates = {};
            const count = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.auto_select_count) !== null && _b !== void 0 ? _b : 6;
            visibleEntities = visibleEntities.sort((a, b) => { var _a, _b; return Math.abs((_a = b.powerValue) !== null && _a !== void 0 ? _a : 0) - Math.abs((_b = a.powerValue) !== null && _b !== void 0 ? _b : 0); });
            entities.forEach(entity => {
                toggleStates[entity.entityId] = false;
            });
            visibleEntities.slice(0, count).forEach(entity => {
                toggleStates[entity.entityId] = true;
            });
            this.entityToggleStates = toggleStates;
            this._savePowerToggleStates();
            this._updatePowerEntities();
            this._updateContent();
        };
        this._clearAllPowerEntities = () => {
            const entities = getPowerEntities(this._hass);
            const newToggleStates = {};
            entities.forEach(entity => {
                newToggleStates[entity.entityId] = false;
            });
            this.entityToggleStates = newToggleStates;
            this._savePowerToggleStates();
            this._updatePowerEntities();
            this._updateContent();
        };
        this._selectAllPowerEntities = () => {
            const entities = getPowerEntities(this._hass);
            const newToggleStates = {};
            entities.forEach(entity => {
                newToggleStates[entity.entityId] = true;
            });
            this.entityToggleStates = newToggleStates;
            this._savePowerToggleStates();
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
            var _a, _b;
            const entities = getEnergyEntities(this._hass);
            let visibleEntities = this._applyRemovalFilter(entities);
            const toggleStates = {};
            const count = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.auto_select_count) !== null && _b !== void 0 ? _b : 6;
            visibleEntities = visibleEntities.sort((a, b) => { var _a, _b; return Math.abs((_a = b.energyValue) !== null && _a !== void 0 ? _a : 0) - Math.abs((_b = a.energyValue) !== null && _b !== void 0 ? _b : 0); });
            entities.forEach(entity => {
                toggleStates[entity.entityId] = false;
            });
            visibleEntities.slice(0, count).forEach(entity => {
                toggleStates[entity.entityId] = true;
            });
            this.energyEntityToggleStates = toggleStates;
            this._saveEnergyToggleStates();
            this._updateEnergyEntities();
            this._updateContent();
        };
        this._clearAllEnergyEntities = () => {
            const entities = getEnergyEntities(this._hass);
            const newToggleStates = {};
            entities.forEach(entity => {
                newToggleStates[entity.entityId] = false;
            });
            this.energyEntityToggleStates = newToggleStates;
            this._saveEnergyToggleStates();
            this._updateEnergyEntities();
            this._updateContent();
        };
        this._selectAllEnergyEntities = () => {
            const entities = getEnergyEntities(this._hass);
            const newToggleStates = {};
            entities.forEach(entity => {
                newToggleStates[entity.entityId] = true;
            });
            this.energyEntityToggleStates = newToggleStates;
            this._saveEnergyToggleStates();
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
        this._togglePersistence = () => {
            if (this.config) {
                this.config.persist_selection = !this.config.persist_selection;
                this._savePersistenceState(this.config.persist_selection);
                if (!this.config.persist_selection) {
                    localStorage.removeItem('energy-dashboard-power-toggle-states');
                    localStorage.removeItem('energy-dashboard-energy-toggle-states');
                    this._initialized = false;
                    this._energyInitialized = false;
                }
                else {
                    this._savePowerToggleStates();
                    this._saveEnergyToggleStates();
                }
                this._updateEntities();
                this._updateContent();
            }
        };
        this._toggleViewMode = () => {
            const newMode = this._viewMode === 'power' ? 'energy' : 'power';
            this._viewMode = newMode;
            this._saveViewMode(newMode);
            this._updateContent();
            this.dispatchEvent(new CustomEvent('view-mode-changed', {
                detail: { mode: newMode },
                bubbles: true,
                composed: true
            }));
        };
        this._root = this.attachShadow({ mode: 'open' });
        this._root.appendChild(createStyles(cardStyles));
        const card = document.createElement('ha-card');
        this._root.appendChild(card);
        this._powerEntitiesContainer = document.createElement('div');
        this._powerEntitiesContainer.className = 'entities-container';
        this._energyEntitiesContainer = document.createElement('div');
        this._energyEntitiesContainer.className = 'entities-container';
    }
    connectedCallback() {
        if (this.config) {
            this.config.persist_selection = this._loadPersistenceState();
        }
        this._viewMode = this._loadViewMode();
        if (this.config) {
            this.config.view_mode = this._viewMode;
        }
        this._setupRefreshInterval();
        this._updateContent();
    }
    setConfig(config) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (!config) {
            throw new Error("Invalid configuration");
        }
        this._clearRefreshInterval();
        const persistenceFromStorage = this._loadPersistenceState();
        this.config = {
            ...config,
            title: (_a = config.title) !== null && _a !== void 0 ? _a : 'Energy Dashboard',
            show_header: (_b = config.show_header) !== null && _b !== void 0 ? _b : true,
            show_state: (_c = config.show_state) !== null && _c !== void 0 ? _c : true,
            show_toggle: (_d = config.show_toggle) !== null && _d !== void 0 ? _d : true,
            auto_select_count: (_e = config.auto_select_count) !== null && _e !== void 0 ? _e : 6,
            max_height: (_f = config.max_height) !== null && _f !== void 0 ? _f : 0,
            entity_removal_filter: (_g = config.entity_removal_filter) !== null && _g !== void 0 ? _g : '',
            refresh_rate: (_h = config.refresh_rate) !== null && _h !== void 0 ? _h : 'off',
            persist_selection: persistenceFromStorage,
            show_energy_section: true,
        };
        this._setupRefreshInterval();
        this._initialized = false;
        this._energyInitialized = false;
        this._forceUpdate = true;
        this._updateContent();
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
            max_height: 0,
            persist_selection: true,
            entity_removal_filter: ''
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
    set hass(hass) {
        var _a;
        const isFirstUpdate = !this._hass;
        this._hass = hass;
        if (this.config && isFirstUpdate) {
            this.config.persist_selection = this._loadPersistenceState();
            this._forceUpdate = true;
        }
        const now = Date.now();
        let shouldUpdateEntities = false;
        if (isFirstUpdate || this._forceUpdate) {
            shouldUpdateEntities = true;
        }
        else if (((_a = this.config) === null || _a === void 0 ? void 0 : _a.refresh_rate) && this.config.refresh_rate !== 'off') {
            const intervalMs = this.config.refresh_rate === '10s' ? 10000 : 30000;
            if (now - this._lastUpdateTimestamp >= intervalMs) {
                shouldUpdateEntities = true;
            }
        }
        if (shouldUpdateEntities) {
            this._updateEntities();
            this._lastUpdateTimestamp = now;
            this._forceUpdate = false;
            this._updateContent();
        }
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
        this.powerEntities.sort((a, b) => { var _a, _b; return Math.abs((_a = b.powerValue) !== null && _a !== void 0 ? _a : 0) - Math.abs((_b = a.powerValue) !== null && _b !== void 0 ? _b : 0); });
        const filteredEntities = this._applyRemovalFilter(this.powerEntities);
        this._filteredPowerEntities = this._applyDynamicFilter(filteredEntities, this._dynamicFilterValue);
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
        this.energyEntities.sort((a, b) => { var _a, _b; return Math.abs((_a = b.energyValue) !== null && _a !== void 0 ? _a : 0) - Math.abs((_b = a.energyValue) !== null && _b !== void 0 ? _b : 0); });
        const filteredEntities = this._applyRemovalFilter(this.energyEntities);
        this._filteredEnergyEntities = this._applyDynamicFilter(filteredEntities, this._dynamicFilterValue);
        this._saveEnergyToggleStates();
    }
    _applyRemovalFilter(entities) {
        var _a;
        if (!((_a = this.config) === null || _a === void 0 ? void 0 : _a.entity_removal_filter) || this.config.entity_removal_filter.trim() === '') {
            return entities;
        }
        const filterParts = this.config.entity_removal_filter.split('|');
        const filterString = filterParts[0].trim();
        if (filterString === '') {
            return entities;
        }
        const filterTerms = filterString
            .split(',')
            .map(term => term.trim().toLowerCase())
            .filter(term => term.length > 0);
        if (filterTerms.length === 0) {
            return entities;
        }
        let filterMode = 'contains';
        if (filterParts.length > 1) {
            const mode = filterParts[1].trim().toLowerCase();
            if (['exact', 'start', 'contains', 'entity_id'].includes(mode)) {
                filterMode = mode;
            }
        }
        return entities.filter(entity => {
            const nameLower = entity.name.toLowerCase();
            const entityIdLower = entity.entityId.toLowerCase();
            for (const term of filterTerms) {
                let shouldRemove = false;
                switch (filterMode) {
                    case 'exact':
                        shouldRemove = nameLower === term;
                        break;
                    case 'start':
                        shouldRemove = nameLower.startsWith(term);
                        break;
                    case 'entity_id':
                        shouldRemove = entityIdLower.includes(term);
                        break;
                    case 'contains':
                    default:
                        shouldRemove = nameLower.includes(term);
                        break;
                }
                if (shouldRemove) {
                    return false;
                }
            }
            return true;
        });
    }
    _applyDynamicFilter(entities, filterValue) {
        if (!filterValue) {
            return entities;
        }
        const filter = filterValue.toLowerCase();
        return entities.filter(entity => entity.name.toLowerCase().includes(filter) ||
            entity.entityId.toLowerCase().includes(filter));
    }
    _initializePowerToggleStates(entities) {
        var _a, _b, _c, _d;
        const persistenceEnabled = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.persist_selection) !== null && _b !== void 0 ? _b : true;
        const savedStates = persistenceEnabled ? loadToggleStates('energy-dashboard-power-toggle-states') : null;
        if (savedStates && Object.keys(savedStates).length > 0) {
            this.entityToggleStates = savedStates;
        }
        else {
            const toggleStates = {};
            const count = (_d = (_c = this.config) === null || _c === void 0 ? void 0 : _c.auto_select_count) !== null && _d !== void 0 ? _d : 6;
            let visibleEntities = this._applyRemovalFilter(entities);
            visibleEntities = visibleEntities.sort((a, b) => { var _a, _b; return Math.abs((_a = b.powerValue) !== null && _a !== void 0 ? _a : 0) - Math.abs((_b = a.powerValue) !== null && _b !== void 0 ? _b : 0); });
            entities.forEach(entity => {
                toggleStates[entity.entityId] = false;
            });
            visibleEntities.slice(0, count).forEach(entity => {
                toggleStates[entity.entityId] = true;
            });
            this.entityToggleStates = toggleStates;
        }
    }
    _initializeEnergyToggleStates(entities) {
        var _a, _b, _c, _d;
        const persistenceEnabled = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.persist_selection) !== null && _b !== void 0 ? _b : true;
        const savedStates = persistenceEnabled ? loadToggleStates('energy-dashboard-energy-toggle-states') : null;
        if (savedStates && Object.keys(savedStates).length > 0) {
            this.energyEntityToggleStates = savedStates;
        }
        else {
            const toggleStates = {};
            const count = (_d = (_c = this.config) === null || _c === void 0 ? void 0 : _c.auto_select_count) !== null && _d !== void 0 ? _d : 6;
            let visibleEntities = this._applyRemovalFilter(entities);
            visibleEntities = visibleEntities.sort((a, b) => { var _a, _b; return Math.abs((_a = b.energyValue) !== null && _a !== void 0 ? _a : 0) - Math.abs((_b = a.energyValue) !== null && _b !== void 0 ? _b : 0); });
            entities.forEach(entity => {
                toggleStates[entity.entityId] = false;
            });
            visibleEntities.slice(0, count).forEach(entity => {
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
    _loadPersistenceState() {
        try {
            const stored = localStorage.getItem('energy-dashboard-persistence-toggle');
            return stored === null ? true : stored === 'true';
        }
        catch {
            return true;
        }
    }
    _savePersistenceState(persist) {
        try {
            localStorage.setItem('energy-dashboard-persistence-toggle', String(persist));
        }
        catch (e) {
            console.error("Failed to save persistence state:", e);
        }
    }
    _saveViewMode(mode) {
        try {
            localStorage.setItem('energy-dashboard-view-mode', mode);
            if (this.config) {
                this.config.view_mode = mode;
            }
            this._viewMode = mode;
        }
        catch (e) {
            console.error("Failed to save view mode:", e);
        }
    }
    _loadViewMode() {
        try {
            const stored = localStorage.getItem('energy-dashboard-view-mode');
            return (stored === 'power' || stored === 'energy') ? stored : 'power';
        }
        catch {
            return 'power';
        }
    }
    _updateContent() {
        if (!this.config)
            return;
        const card = this._root.querySelector('ha-card');
        if (!card)
            return;
        card.innerHTML = '';
        if (this.config.show_header) {
            const header = document.createElement('div');
            header.className = 'card-header';
            header.textContent = this.config.title;
            card.appendChild(header);
        }
        const modeToggleContainer = document.createElement('div');
        modeToggleContainer.className = 'mode-toggle-container';
        modeToggleContainer.style.display = 'flex';
        modeToggleContainer.style.justifyContent = 'center';
        modeToggleContainer.style.alignItems = 'center';
        modeToggleContainer.style.marginTop = '8px';
        modeToggleContainer.style.marginBottom = '8px';
        modeToggleContainer.style.padding = '4px';
        const toggleWrapper = document.createElement('div');
        toggleWrapper.className = 'toggle-wrapper';
        toggleWrapper.style.display = 'flex';
        toggleWrapper.style.position = 'relative';
        toggleWrapper.style.border = '1px solid var(--divider-color)';
        toggleWrapper.style.borderRadius = '25px';
        toggleWrapper.style.height = '30px';
        toggleWrapper.style.width = '200px';
        toggleWrapper.style.backgroundColor = 'var(--card-background-color)';
        toggleWrapper.style.overflow = 'hidden';
        const activeBackground = document.createElement('div');
        activeBackground.className = 'active-background';
        activeBackground.style.position = 'absolute';
        activeBackground.style.top = '0';
        activeBackground.style.bottom = '0';
        activeBackground.style.left = this._viewMode === 'power' ? '0' : '50%';
        activeBackground.style.width = '50%';
        activeBackground.style.backgroundColor = 'var(--primary-color)';
        activeBackground.style.borderRadius = '25px';
        activeBackground.style.transition = 'left 0.3s ease-in-out';
        activeBackground.style.opacity = '0.2';
        const powerOption = document.createElement('div');
        powerOption.className = 'toggle-option';
        powerOption.textContent = 'Power';
        powerOption.style.flex = '1';
        powerOption.style.textAlign = 'center';
        powerOption.style.lineHeight = '30px';
        powerOption.style.cursor = 'pointer';
        powerOption.style.zIndex = '1';
        powerOption.style.fontWeight = this._viewMode === 'power' ? 'bold' : 'normal';
        powerOption.style.color = this._viewMode === 'power' ? 'var(--primary-text-color)' : 'var(--secondary-text-color)';
        powerOption.addEventListener('click', () => {
            if (this._viewMode !== 'power') {
                this._toggleViewMode();
            }
        });
        const energyOption = document.createElement('div');
        energyOption.className = 'toggle-option';
        energyOption.textContent = 'Energy';
        energyOption.style.flex = '1';
        energyOption.style.textAlign = 'center';
        energyOption.style.lineHeight = '30px';
        energyOption.style.cursor = 'pointer';
        energyOption.style.zIndex = '1';
        energyOption.style.fontWeight = this._viewMode === 'energy' ? 'bold' : 'normal';
        energyOption.style.color = this._viewMode === 'energy' ? 'var(--primary-text-color)' : 'var(--secondary-text-color)';
        energyOption.addEventListener('click', () => {
            if (this._viewMode !== 'energy') {
                this._toggleViewMode();
            }
        });
        toggleWrapper.appendChild(activeBackground);
        toggleWrapper.appendChild(powerOption);
        toggleWrapper.appendChild(energyOption);
        modeToggleContainer.appendChild(toggleWrapper);
        card.appendChild(modeToggleContainer);
        const renderPersistenceToggle = () => {
            var _a, _b;
            const persistenceToggle = document.createElement('div');
            persistenceToggle.className = 'persistence-toggle';
            persistenceToggle.style.display = 'flex';
            persistenceToggle.style.alignItems = 'center';
            persistenceToggle.style.justifyContent = 'center';
            persistenceToggle.style.marginTop = '8px';
            persistenceToggle.style.marginBottom = '8px';
            persistenceToggle.style.cursor = 'pointer';
            persistenceToggle.addEventListener('click', this._togglePersistence);
            persistenceToggle.setAttribute('id', 'persistence-toggle');
            const toggleLabel = document.createElement('span');
            toggleLabel.style.marginRight = '8px';
            toggleLabel.textContent = 'Remember Selection: ';
            const toggleSwitch = document.createElement('span');
            toggleSwitch.className = 'toggle-switch';
            toggleSwitch.style.position = 'relative';
            toggleSwitch.style.display = 'inline-block';
            toggleSwitch.style.width = '36px';
            toggleSwitch.style.height = '20px';
            const toggleSlider = document.createElement('span');
            toggleSlider.className = 'toggle-slider';
            toggleSlider.style.position = 'absolute';
            toggleSlider.style.cursor = 'pointer';
            toggleSlider.style.top = '0';
            toggleSlider.style.left = '0';
            toggleSlider.style.right = '0';
            toggleSlider.style.bottom = '0';
            toggleSlider.style.backgroundColor = ((_a = this.config) === null || _a === void 0 ? void 0 : _a.persist_selection) ? 'var(--primary-color, #03a9f4)' : '#ccc';
            toggleSlider.style.borderRadius = '34px';
            toggleSlider.style.transition = '.4s';
            const toggleButton = document.createElement('span');
            toggleButton.style.position = 'absolute';
            toggleButton.style.content = '""';
            toggleButton.style.height = '16px';
            toggleButton.style.width = '16px';
            toggleButton.style.left = ((_b = this.config) === null || _b === void 0 ? void 0 : _b.persist_selection) ? '16px' : '4px';
            toggleButton.style.bottom = '2px';
            toggleButton.style.backgroundColor = 'white';
            toggleButton.style.borderRadius = '50%';
            toggleButton.style.transition = '.4s';
            toggleSlider.appendChild(toggleButton);
            toggleSwitch.appendChild(toggleSlider);
            persistenceToggle.appendChild(toggleLabel);
            persistenceToggle.appendChild(toggleSwitch);
            return persistenceToggle;
        };
        if (this._viewMode === 'power') {
            const controlButtons = document.createElement('div');
            controlButtons.className = 'control-buttons';
            controlButtons.style.display = 'flex';
            controlButtons.style.flexWrap = 'nowrap';
            controlButtons.style.alignItems = 'center';
            controlButtons.style.gap = '4px';
            controlButtons.style.margin = '0 0 8px 0';
            controlButtons.style.padding = '0';
            const resetButton = document.createElement('button');
            resetButton.className = 'control-button';
            resetButton.innerHTML = '<ha-icon icon="mdi:refresh"></ha-icon><span>Reset</span>';
            resetButton.style.flex = '1 1 0';
            resetButton.style.minWidth = '40px';
            resetButton.addEventListener('click', this._resetToPowerDefaultEntities);
            const clearButton = document.createElement('button');
            clearButton.className = 'control-button';
            clearButton.innerHTML = '<ha-icon icon="mdi:close-circle-outline"></ha-icon><span>Clear</span>';
            clearButton.style.flex = '1 1 0';
            clearButton.style.minWidth = '40px';
            clearButton.addEventListener('click', this._clearAllPowerEntities);
            const selectAllButton = document.createElement('button');
            selectAllButton.className = 'select-all-button';
            selectAllButton.innerHTML = '<ha-icon icon="mdi:check-circle-outline"></ha-icon><span>All</span>';
            selectAllButton.style.flex = '1 1 0';
            selectAllButton.style.minWidth = '40px';
            selectAllButton.addEventListener('click', this._selectAllPowerEntities);
            controlButtons.appendChild(resetButton);
            controlButtons.appendChild(clearButton);
            controlButtons.appendChild(selectAllButton);
            card.appendChild(controlButtons);
            const persistenceToggleEl = renderPersistenceToggle();
            card.appendChild(persistenceToggleEl);
            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'section-title';
            sectionTitle.textContent = 'Power Entities';
            card.appendChild(sectionTitle);
            const searchContainer = document.createElement('div');
            searchContainer.className = 'search-container';
            const searchInput = document.createElement('input');
            searchInput.className = 'search-input';
            searchInput.type = 'text';
            searchInput.placeholder = 'Filter entities...';
            searchInput.value = this._dynamicFilterValue;
            searchInput.setAttribute('autocomplete', 'off');
            searchInput.setAttribute('autocorrect', 'off');
            searchInput.setAttribute('autocapitalize', 'none');
            searchInput.setAttribute('spellcheck', 'false');
            searchInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            searchInput.addEventListener('keydown', (e) => {
                e.stopPropagation();
            });
            searchInput.addEventListener('input', this._handleFilterInput);
            searchInput.addEventListener('focus', () => {
                this._searchInputHasFocus = true;
            });
            searchInput.addEventListener('blur', () => {
                this._searchInputHasFocus = false;
            });
            if (this._searchInputHasFocus) {
                setTimeout(() => {
                    searchInput.focus();
                }, 0);
            }
            searchContainer.appendChild(searchInput);
            card.appendChild(searchContainer);
            const refreshControlContainer = document.createElement('div');
            refreshControlContainer.className = 'refresh-control-container';
            const refreshControl = document.createElement('div');
            refreshControl.className = 'refresh-control';
            const offOption = document.createElement('div');
            offOption.className = `refresh-option${this.config.refresh_rate === 'off' || !this.config.refresh_rate ? ' active' : ''}`;
            offOption.textContent = 'Off';
            offOption.addEventListener('click', () => this._setRefreshRate('off'));
            const tenSecOption = document.createElement('div');
            tenSecOption.className = `refresh-option${this.config.refresh_rate === '10s' ? ' active' : ''}`;
            tenSecOption.textContent = '10s';
            tenSecOption.addEventListener('click', () => this._setRefreshRate('10s'));
            const thirtySecOption = document.createElement('div');
            thirtySecOption.className = `refresh-option${this.config.refresh_rate === '30s' ? ' active' : ''}`;
            thirtySecOption.textContent = '30s';
            thirtySecOption.addEventListener('click', () => this._setRefreshRate('30s'));
            const refreshButton = document.createElement('div');
            refreshButton.className = 'refresh-option refresh-button';
            refreshButton.innerHTML = '<ha-icon icon="mdi:refresh"></ha-icon>';
            refreshButton.title = 'Refresh now';
            refreshButton.addEventListener('click', () => this._refreshNow());
            refreshControl.appendChild(offOption);
            refreshControl.appendChild(tenSecOption);
            refreshControl.appendChild(thirtySecOption);
            refreshControl.appendChild(refreshButton);
            refreshControlContainer.appendChild(refreshControl);
            card.appendChild(refreshControlContainer);
            if (this.config.enable_max_height && this.config.max_height && this.config.max_height > 0) {
                const scrollContainer = document.createElement('div');
                scrollContainer.className = 'scroll-container';
                scrollContainer.style.maxHeight = `${this.config.max_height}px`;
                scrollContainer.style.overflowY = 'auto';
                scrollContainer.style.overflowX = 'hidden';
                scrollContainer.style.paddingRight = '4px';
                scrollContainer.style.marginBottom = '16px';
                this._powerEntitiesContainer.style.display = '';
                this._energyEntitiesContainer.style.display = 'none';
                scrollContainer.appendChild(this._powerEntitiesContainer);
                card.appendChild(scrollContainer);
            }
            else {
                this._powerEntitiesContainer.style.display = '';
                this._energyEntitiesContainer.style.display = 'none';
                card.appendChild(this._powerEntitiesContainer);
            }
            if (this._filteredPowerEntities.length > 0) {
                this._updateEntityButtons(this._powerEntitiesContainer, this._filteredPowerEntities, this._togglePowerEntity, true);
            }
            else {
                this._powerEntitiesContainer.innerHTML = '';
            }
        }
        else {
            const controlButtons = document.createElement('div');
            controlButtons.className = 'control-buttons';
            controlButtons.style.display = 'flex';
            controlButtons.style.flexWrap = 'nowrap';
            controlButtons.style.alignItems = 'center';
            controlButtons.style.gap = '4px';
            controlButtons.style.margin = '0 0 8px 0';
            controlButtons.style.padding = '0';
            const resetButton = document.createElement('button');
            resetButton.className = 'control-button';
            resetButton.innerHTML = '<ha-icon icon="mdi:refresh"></ha-icon><span>Reset</span>';
            resetButton.style.flex = '1 1 0';
            resetButton.style.minWidth = '40px';
            resetButton.addEventListener('click', this._resetToEnergyDefaultEntities);
            const clearButton = document.createElement('button');
            clearButton.className = 'control-button';
            clearButton.innerHTML = '<ha-icon icon="mdi:close-circle-outline"></ha-icon><span>Clear</span>';
            clearButton.style.flex = '1 1 0';
            clearButton.style.minWidth = '40px';
            clearButton.addEventListener('click', this._clearAllEnergyEntities);
            const selectAllButton = document.createElement('button');
            selectAllButton.className = 'select-all-button';
            selectAllButton.innerHTML = '<ha-icon icon="mdi:check-circle-outline"></ha-icon><span>All</span>';
            selectAllButton.style.flex = '1 1 0';
            selectAllButton.style.minWidth = '40px';
            selectAllButton.addEventListener('click', this._selectAllEnergyEntities);
            controlButtons.appendChild(resetButton);
            controlButtons.appendChild(clearButton);
            controlButtons.appendChild(selectAllButton);
            card.appendChild(controlButtons);
            const persistenceToggleEl = renderPersistenceToggle();
            card.appendChild(persistenceToggleEl);
            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'section-title';
            sectionTitle.textContent = 'Energy Entities';
            card.appendChild(sectionTitle);
            const searchContainer = document.createElement('div');
            searchContainer.className = 'search-container';
            const searchInput = document.createElement('input');
            searchInput.className = 'search-input';
            searchInput.type = 'text';
            searchInput.placeholder = 'Filter entities...';
            searchInput.value = this._dynamicFilterValue;
            searchInput.setAttribute('autocomplete', 'off');
            searchInput.setAttribute('autocorrect', 'off');
            searchInput.setAttribute('autocapitalize', 'none');
            searchInput.setAttribute('spellcheck', 'false');
            searchInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            searchInput.addEventListener('keydown', (e) => {
                e.stopPropagation();
            });
            searchInput.addEventListener('input', this._handleFilterInput);
            searchInput.addEventListener('focus', () => {
                this._searchInputHasFocus = true;
            });
            searchInput.addEventListener('blur', () => {
                this._searchInputHasFocus = false;
            });
            if (this._searchInputHasFocus) {
                setTimeout(() => {
                    searchInput.focus();
                }, 0);
            }
            searchContainer.appendChild(searchInput);
            card.appendChild(searchContainer);
            if (this.config.enable_max_height && this.config.max_height && this.config.max_height > 0) {
                const scrollContainer = document.createElement('div');
                scrollContainer.className = 'scroll-container';
                scrollContainer.style.maxHeight = `${this.config.max_height}px`;
                scrollContainer.style.overflowY = 'auto';
                scrollContainer.style.overflowX = 'hidden';
                scrollContainer.style.paddingRight = '4px';
                scrollContainer.style.marginBottom = '16px';
                this._powerEntitiesContainer.style.display = 'none';
                this._energyEntitiesContainer.style.display = '';
                scrollContainer.appendChild(this._energyEntitiesContainer);
                card.appendChild(scrollContainer);
            }
            else {
                this._powerEntitiesContainer.style.display = 'none';
                this._energyEntitiesContainer.style.display = '';
                card.appendChild(this._energyEntitiesContainer);
            }
            if (this._filteredEnergyEntities.length > 0) {
                this._updateEntityButtons(this._energyEntitiesContainer, this._filteredEnergyEntities, this._toggleEnergyEntity, false);
            }
            else {
                this._energyEntitiesContainer.innerHTML = '';
            }
        }
        requestAnimationFrame(() => {
            this._forceRecalculation(card);
            setTimeout(() => {
                const controlButtonsContainers = Array.from(this._root.querySelectorAll('.control-buttons'));
                controlButtonsContainers.forEach(container => {
                    this._equalizeButtonHeights(container);
                });
                const entityContainers = Array.from(this._root.querySelectorAll('.entities-container'));
                entityContainers.forEach(container => {
                    if (container.childElementCount === 0) {
                        console.error("Entity container is empty!");
                    }
                });
            }, 100);
        });
    }
    _updateEntityButtons(container, entities, onClick, isPower) {
        const existingItems = {};
        Array.from(container.children).forEach(child => {
            const el = child;
            if (el.dataset && el.dataset.entity) {
                existingItems[el.dataset.entity] = el;
            }
        });
        const usedNodes = new Set();
        entities.forEach(entity => {
            var _a;
            let entityItem = existingItems[entity.entityId];
            if (!entityItem) {
                entityItem = document.createElement('div');
                entityItem.dataset.entity = entity.entityId;
                entityItem.addEventListener('click', onClick);
                container.appendChild(entityItem);
            }
            entityItem.className = `entity-item ${entity.isOn ? 'on' : 'off'}`;
            entityItem.style.gap = '4px';
            entityItem.innerHTML = '';
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
            const valueDiv = document.createElement('div');
            valueDiv.className = 'power-value';
            if ((_a = this.config) === null || _a === void 0 ? void 0 : _a.show_state) {
                valueDiv.textContent = isPower
                    ? `${entity.unit === 'kW' ? entity.state : Math.round(entity.powerValue || 0)} ${entity.unit || 'W'}`
                    : `${entity.state} ${entity.unit}`;
            }
            entityState.appendChild(statusIndicator);
            entityState.appendChild(valueDiv);
            entityItem.appendChild(entityState);
            usedNodes.add(entity.entityId);
        });
        Object.keys(existingItems).forEach(entityId => {
            if (!usedNodes.has(entityId)) {
                container.removeChild(existingItems[entityId]);
            }
        });
    }
    _setRefreshRate(rate) {
        if (!this.config)
            return;
        this.config.refresh_rate = rate;
        this._clearRefreshInterval();
        if (rate !== 'off') {
            const intervalMs = rate === '10s' ? 10000 : 30000;
            this._refreshIntervalId = window.setInterval(() => {
                this._refreshNow();
            }, intervalMs);
        }
        this._updateContent();
    }
    _refreshNow() {
        this._forceUpdate = true;
        if (this._hass) {
            this._updateEntities();
            this._lastUpdateTimestamp = Date.now();
            this._forceUpdate = false;
            this._updateContent();
        }
    }
    _clearRefreshInterval() {
        if (this._refreshIntervalId !== null) {
            window.clearInterval(this._refreshIntervalId);
            this._refreshIntervalId = null;
        }
    }
    disconnectedCallback() {
        this._clearRefreshInterval();
    }
    _setupRefreshInterval() {
        var _a;
        this._clearRefreshInterval();
        if (((_a = this.config) === null || _a === void 0 ? void 0 : _a.refresh_rate) && this.config.refresh_rate !== 'off') {
            const intervalMs = this.config.refresh_rate === '10s' ? 10000 : 30000;
            this._refreshIntervalId = window.setInterval(() => {
                this._refreshNow();
            }, intervalMs);
        }
    }
}
customElements.define('energy-dashboard-entity-card', EnergyDashboardEntityCard);

/**
 * Editor component for the Energy Dashboard Entity Card.
 * Provides a UI for users to configure entity card options in Home Assistant.
 * Handles form rendering, validation, and config change events.
 */
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
            ...config,
            show_header: config.show_header !== undefined ? config.show_header : true,
            show_state: config.show_state !== undefined ? config.show_state : true,
            auto_select_count: config.auto_select_count !== undefined ? config.auto_select_count : 6,
            max_height: config.max_height !== undefined ? config.max_height : 400, // Default to ~15 entities
            enable_max_height: config.enable_max_height !== undefined ? config.enable_max_height : false,
            title: config.title !== undefined ? config.title : 'Energy Dashboard',
        };
        // Remove any lingering energy_auto_select_count property
        if ('energy_auto_select_count' in this.config) {
            delete this.config.energy_auto_select_count;
        }
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
        // Entity Removal Filter field
        const entityFilterRow = this._createRow();
        const entityFilterField = document.createElement('ha-textfield');
        entityFilterField.className = 'value';
        entityFilterField.label = 'Entity Removal Filter';
        entityFilterField.value = this.config.entity_removal_filter || '';
        entityFilterField.configValue = 'entity_removal_filter';
        entityFilterField.addEventListener('change', this.valueChanged);
        entityFilterField.helperText = 'Format: "string,string|mode" - Entities matching these terms will be REMOVED. Modes: contains (default), exact, start, entity_id';
        entityFilterField.helperPersistent = true;
        entityFilterRow.appendChild(entityFilterField);
        form.appendChild(entityFilterRow);
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
        // Enable Max Height toggle
        const enableMaxHeightRow = this._createRow();
        const enableMaxHeightSwitch = document.createElement('ha-switch');
        enableMaxHeightSwitch.checked = this.config.enable_max_height === true;
        enableMaxHeightSwitch.configValue = 'enable_max_height';
        enableMaxHeightSwitch.addEventListener('change', this.valueChanged);
        const enableMaxHeightLabel = document.createElement('div');
        enableMaxHeightLabel.textContent = 'Enable Max Height';
        enableMaxHeightRow.appendChild(enableMaxHeightSwitch);
        enableMaxHeightRow.appendChild(enableMaxHeightLabel);
        form.appendChild(enableMaxHeightRow);
        // Max Height field
        const maxHeightRow = this._createRow();
        const maxHeightField = document.createElement('ha-textfield');
        maxHeightField.className = 'value';
        maxHeightField.label = 'Max Height (pixels)';
        maxHeightField.type = 'number';
        maxHeightField.min = '100';
        maxHeightField.max = '1000';
        maxHeightField.value = String(this.config.max_height || 400);
        maxHeightField.configValue = 'max_height';
        maxHeightField.addEventListener('change', this.valueChanged);
        maxHeightField.helperText = 'Set maximum height in pixels for scrollable container';
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

/**
 * Configuration and type definitions for the Energy Dashboard chart card.
 * Describes chart options, presets, and config structure for type safety.
 */
function getDefaultChartConfig() {
    return {
        chart_height: 300,
        show_points: false,
        smooth_curve: true,
        stroke_width: 2,
        update_interval: 30,
        hours_to_show: 24,
        chart_options: {
            y_axis: {
                // min is undefined by default (auto)
                decimals: 1,
                title: 'Power',
                unit: 'W'
            }
        },
        use_custom_colors: false,
        show_legend: true,
        y_axis_max_presets: [500, 3000, 9000]
    };
}

/**
 * Main component for the Energy Dashboard Chart Card.
 * Renders power and energy charts, handles user interaction, and manages chart configuration.
 * Designed for Home Assistant custom dashboards.
 *
 * Key responsibilities:
 * - Display power/energy charts with configurable options
 * - Handle refresh, time range, and Y-axis controls
 * - Sync with entity selection from the entity card
 * - Manage chart state and updates
 */
class EnergyDashboardChartCard extends HTMLElement {
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
        this._currentRefreshInterval = 30;
        this._currentTimeRangeHours = 24;
        this._viewMode = 'power';
        this._handleViewModeChange = (event) => {
            if (event.detail && event.detail.mode) {
                this._viewMode = event.detail.mode;
                this._updateContent();
            }
        };
        this._root = this.attachShadow({ mode: 'open' });
        this._root.appendChild(createStyles(cardStyles));
        const card = document.createElement('ha-card');
        this._root.appendChild(card);
    }
    _loadViewMode() {
        try {
            const stored = localStorage.getItem('energy-dashboard-view-mode');
            return (stored === 'power' || stored === 'energy') ? stored : 'power';
        }
        catch {
            return 'power';
        }
    }
    connectedCallback() {
        this._viewMode = this._loadViewMode();
        window.addEventListener('view-mode-changed', this._handleViewModeChange);
        this._loadSelectedEntities();
        this._checkApexChartsRegistration();
        this._updateContent();
        this._stopUpdateInterval();
        setTimeout(() => {
            if (this._currentRefreshInterval > 0) {
                this._startUpdateInterval();
            }
        }, 1000);
    }
    disconnectedCallback() {
        this._stopUpdateInterval();
        window.removeEventListener('view-mode-changed', this._handleViewModeChange);
    }
    setConfig(config) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        if (!config) {
            throw new Error("Invalid configuration");
        }
        const defaultConfig = getDefaultChartConfig();
        this.config = {
            ...defaultConfig,
            ...config,
            chart_options: {
                ...defaultConfig.chart_options,
                ...(config.chart_options || {}),
                y_axis: {
                    ...(_a = defaultConfig.chart_options) === null || _a === void 0 ? void 0 : _a.y_axis,
                    ...(((_b = config.chart_options) === null || _b === void 0 ? void 0 : _b.y_axis) || {})
                }
            },
            title: (_c = config.title) !== null && _c !== void 0 ? _c : 'Energy Dashboard Chart',
            show_header: (_d = config.show_header) !== null && _d !== void 0 ? _d : true,
            show_state: (_e = config.show_state) !== null && _e !== void 0 ? _e : true,
            show_toggle: (_f = config.show_toggle) !== null && _f !== void 0 ? _f : true,
            auto_select_count: (_g = config.auto_select_count) !== null && _g !== void 0 ? _g : 6,
            max_height: (_h = config.max_height) !== null && _h !== void 0 ? _h : 400,
            show_energy_section: (_j = config.show_energy_section) !== null && _j !== void 0 ? _j : true,
            energy_auto_select_count: (_k = config.energy_auto_select_count) !== null && _k !== void 0 ? _k : 6,
            update_interval: (_l = config.update_interval) !== null && _l !== void 0 ? _l : 30,
            y_axis_max_presets: (_m = config.y_axis_max_presets) !== null && _m !== void 0 ? _m : [500, 3000, 9000],
        };
        this._currentRefreshInterval = (_o = this.config.update_interval) !== null && _o !== void 0 ? _o : 30;
        this._currentTimeRangeHours = (_p = this.config.hours_to_show) !== null && _p !== void 0 ? _p : 24;
        this._loadSelectedEntities();
        this._isLoading = true;
        this._checkApexChartsRegistration();
    }
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
    set hass(hass) {
        const firstUpdate = !this._hass;
        this._hass = hass;
        if (firstUpdate) {
            this._isLoading = false;
            this._updateContent();
        }
    }
    get hass() {
        return this._hass;
    }
    _loadSelectedEntities() {
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
        this._stopUpdateInterval();
        const seconds = this._currentRefreshInterval;
        if (seconds > 0) {
            this._updateTimer = window.setInterval(() => {
                this._updateCharts();
            }, seconds * 1000);
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
        const options = this.config.chart_options;
        const chartType = 'line';
        const hoursToShow = this.config.hours_to_show || 24;
        const showPoints = this.config.show_points || false;
        const showLegend = this.config.show_legend !== false;
        const smoothCurve = this.config.smooth_curve !== false;
        const strokeWidth = this.config.stroke_width || 2;
        const series = entities.map(entityId => {
            var _a, _b;
            return ({
                entity: entityId,
                name: ((_b = (_a = this._hass.states[entityId]) === null || _a === void 0 ? void 0 : _a.attributes) === null || _b === void 0 ? void 0 : _b.friendly_name) || entityId
            });
        });
        let yMin = (_a = options === null || options === void 0 ? void 0 : options.y_axis) === null || _a === void 0 ? void 0 : _a.min;
        let yMax = (_b = options === null || options === void 0 ? void 0 : options.y_axis) === null || _b === void 0 ? void 0 : _b.max;
        let yTitle = ((_c = options === null || options === void 0 ? void 0 : options.y_axis) === null || _c === void 0 ? void 0 : _c.title) || (isEnergy ? 'Energy (kWh)' : 'Power (W)');
        const decimals = ((_d = options === null || options === void 0 ? void 0 : options.y_axis) === null || _d === void 0 ? void 0 : _d.decimals) !== undefined ? options.y_axis.decimals : (isEnergy ? 2 : 0);
        const apexChartCardConfig = {
            type: 'custom:apexcharts-card',
            header: { show: false },
            graph_span: `${hoursToShow}h`,
            chart_type: chartType,
            series,
            yaxis: [{
                    ...(typeof yMin !== 'undefined' ? { min: yMin } : {}),
                    ...(typeof yMax !== 'undefined' ? { max: yMax } : {}),
                    decimals: decimals
                }],
            apex_config: {
                chart: {
                    height: this.config.chart_height || 300,
                    animations: { enabled: false },
                    toolbar: {
                        show: true,
                        tools: {
                            download: true,
                            selection: true,
                            zoom: true,
                            zoomin: true,
                            zoomout: true,
                            pan: true,
                            reset: true
                        }
                    }
                },
                yaxis: [{
                        title: {
                            text: yTitle || '',
                            style: {
                                fontSize: '12px',
                                fontWeight: 500,
                                color: 'var(--primary-text-color, #000)'
                            }
                        },
                        labels: {
                            formatter: (val) => val.toFixed(decimals),
                            style: {
                                fontSize: '11px',
                                fontFamily: 'Helvetica, Arial, sans-serif',
                                color: 'var(--secondary-text-color, #666)'
                            }
                        },
                        axisTicks: {
                            show: true,
                            color: 'var(--divider-color, #e0e0e0)',
                            width: 1
                        },
                        axisBorder: {
                            show: true,
                            color: 'var(--divider-color, #e0e0e0)',
                            width: 1
                        },
                        crosshairs: {
                            show: true,
                            position: 'back',
                            stroke: {
                                color: 'var(--primary-color, #03a9f4)',
                                width: 1,
                                dashArray: 0
                            }
                        }
                    }],
                grid: {
                    show: true,
                    borderColor: 'var(--divider-color, #e0e0e0)',
                    strokeDashArray: 0,
                    position: 'back',
                    xaxis: { lines: { show: false } },
                    yaxis: { lines: { show: true } },
                    padding: { top: 0, right: 0, bottom: 0, left: 0 }
                },
                markers: {
                    size: showPoints ? 4 : 0,
                    colors: ['var(--primary-color, #03a9f4)'],
                    strokeColors: 'var(--card-background-color, #fff)',
                    strokeWidth: 2
                },
                stroke: {
                    curve: smoothCurve ? 'smooth' : 'straight',
                    width: strokeWidth,
                    lineCap: 'round'
                },
                legend: {
                    show: showLegend,
                    position: 'bottom',
                    fontSize: '12px',
                    fontFamily: 'Helvetica, Arial, sans-serif',
                    labels: { colors: 'var(--primary-text-color, #000)' }
                },
                tooltip: {
                    theme: 'light',
                    style: {
                        fontSize: '12px',
                        fontFamily: 'Helvetica, Arial, sans-serif'
                    }
                },
                states: {
                    hover: { filter: { type: 'lighten', value: 0.1 } },
                    active: { filter: { type: 'darken', value: 0.35 } }
                }
            }
        };
        return apexChartCardConfig;
    }
    _createChart(isEnergy) {
        var _a;
        if (this._isLoading) {
            return this._createLoadingIndicator();
        }
        const entities = isEnergy ? this._energyEntities : this._powerEntities;
        if (!entities || entities.length === 0) {
            return this._createEmptyCard(isEnergy);
        }
        if (!this._hass) {
            return this._createLoadingIndicator();
        }
        const chartConfig = this._generateApexchartsConfig(entities, isEnergy);
        if (!chartConfig) {
            return this._createErrorMessage(`Failed to generate chart configuration for ${isEnergy ? 'energy' : 'power'} chart`, ['Check that all required entities exist in Home Assistant',
                'Refresh the page and try again']);
        }
        const chartElement = document.createElement('div');
        chartElement.className = isEnergy ? 'energy-chart-container' : 'power-chart-container';
        chartElement.style.width = '100%';
        chartElement.style.marginBottom = '16px';
        chartElement.style.position = 'relative';
        chartElement.style.minHeight = `${((_a = this.config) === null || _a === void 0 ? void 0 : _a.chart_height) || 300}px`;
        try {
            if (this._apexChartCardRegistered === false) {
                return this._createErrorMessage('The apexcharts-card integration is not installed', [
                    'Install the apexcharts-card integration from HACS',
                    'Make sure apexcharts-card is correctly loaded in your Home Assistant instance',
                    'Refresh the page after installation to load the custom element'
                ]);
            }
            const apexCard = document.createElement('apexcharts-card');
            try {
                apexCard.setConfig(chartConfig);
                apexCard.hass = this._hass;
            }
            catch (configError) {
                return this._createErrorMessage('Error configuring chart', ['The chart configuration is invalid',
                    'Check the console for more details']);
            }
            chartElement.appendChild(apexCard);
        }
        catch (err) {
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
        const icon = document.createElement('ha-icon');
        icon.setAttribute('icon', 'mdi:alert-circle-outline');
        icon.style.color = 'var(--error-color, red)';
        icon.style.width = '40px';
        icon.style.height = '40px';
        icon.style.marginBottom = '8px';
        const errorText = document.createElement('div');
        errorText.textContent = error;
        errorText.style.color = 'var(--error-color, red)';
        errorText.style.fontWeight = 'bold';
        errorText.style.marginBottom = '8px';
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
        var _a, _b, _c;
        if (!this._hass || this._isLoading || this._apexChartCardRegistered === false) {
            return;
        }
        this._loadSelectedEntities();
        const powerChartContainer = this._root.querySelector('.power-chart-placeholder');
        if (powerChartContainer) {
            const existingPowerChart = powerChartContainer.querySelector('apexcharts-card');
            if (existingPowerChart) {
                const updatedChartConfig = this._generateApexchartsConfig(this._powerEntities, false);
                if (updatedChartConfig) {
                    try {
                        existingPowerChart.setConfig(updatedChartConfig);
                        existingPowerChart.hass = this._hass;
                    }
                    catch (err) { }
                }
            }
            else {
                const newPowerChart = this._createChart(false);
                powerChartContainer.innerHTML = '';
                powerChartContainer.appendChild(newPowerChart);
                this._powerChartEl = newPowerChart;
            }
        }
        else if (!this._powerChartEl) {
            const card = this._root.querySelector('ha-card .chart-container');
            if (card) {
                const powerSectionTitle = card.querySelector('.section-title:not([data-energy])');
                if (powerSectionTitle) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'power-chart-placeholder';
                    const newChart = this._createChart(false);
                    placeholder.appendChild(newChart);
                    powerSectionTitle.after(placeholder);
                    this._powerChartEl = newChart;
                }
            }
        }
        const energyChartContainer = this._root.querySelector('.energy-chart-placeholder');
        if ((_a = this.config) === null || _a === void 0 ? void 0 : _a.show_energy_section) {
            if (energyChartContainer) {
                const existingEnergyChart = energyChartContainer.querySelector('apexcharts-card');
                if (existingEnergyChart) {
                    const updatedChartConfig = this._generateApexchartsConfig(this._energyEntities, true);
                    if (updatedChartConfig) {
                        try {
                            existingEnergyChart.setConfig(updatedChartConfig);
                            existingEnergyChart.hass = this._hass;
                        }
                        catch (err) { }
                    }
                }
                else {
                    const newEnergyChart = this._createChart(true);
                    energyChartContainer.innerHTML = '';
                    energyChartContainer.appendChild(newEnergyChart);
                    this._energyChartEl = newEnergyChart;
                }
            }
            else if (!this._energyChartEl) {
                const card = this._root.querySelector('ha-card .chart-container');
                if (card) {
                    const energySectionTitle = card.querySelector('.section-title[data-energy]');
                    if (energySectionTitle) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'energy-chart-placeholder';
                        const newChart = this._createChart(true);
                        placeholder.appendChild(newChart);
                        energySectionTitle.after(placeholder);
                        this._energyChartEl = newChart;
                    }
                }
            }
        }
        else {
            energyChartContainer === null || energyChartContainer === void 0 ? void 0 : energyChartContainer.remove();
            this._energyChartEl = null;
            (_b = this._root.querySelector('.section-title[data-energy]')) === null || _b === void 0 ? void 0 : _b.remove();
            (_c = this._root.querySelector('.section-separator')) === null || _c === void 0 ? void 0 : _c.remove();
        }
    }
    _renderSectionTitle(title, isEnergy = false) {
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'section-title';
        sectionTitle.textContent = title;
        if (isEnergy) {
            sectionTitle.dataset.energy = 'true';
        }
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
        const card = this._root.querySelector('ha-card');
        if (!card)
            return;
        card.innerHTML = '';
        card.style.paddingTop = '';
        if (this.config.show_header) {
            const header = document.createElement('div');
            header.className = 'card-header';
            header.textContent = this.config.title;
            card.appendChild(header);
        }
        else {
            card.style.paddingTop = 'var(--card-padding, 0px)';
        }
        if (this._isLoading) {
            const loadingIndicator = this._createLoadingIndicator();
            card.appendChild(loadingIndicator);
            return;
        }
        if (this._apexChartCardRegistered === false) {
            const errorMessage = this._createErrorMessage('The apexcharts-card integration is not installed', [
                'Install the apexcharts-card integration from HACS',
                'Make sure apexcharts-card is correctly loaded in your Home Assistant instance',
                'Refresh the page after installation to load the custom element'
            ]);
            card.appendChild(errorMessage);
            return;
        }
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls-container';
        const createGroup = (labelText, controls) => {
            const group = document.createElement('div');
            group.className = 'pill-group';
            group.style.display = 'flex';
            group.style.flexDirection = 'column';
            group.style.alignItems = 'center';
            group.style.margin = '0';
            group.style.padding = '0';
            const label = document.createElement('div');
            label.className = 'pill-label';
            label.textContent = labelText;
            label.style.textAlign = 'center';
            group.appendChild(label);
            group.appendChild(controls);
            return group;
        };
        const refreshControls = this._createRefreshRatePillControls();
        const timeRangeControls = this._createTimeRangeControls();
        const yAxisControls = this._createYAxisControls();
        [refreshControls, timeRangeControls, yAxisControls].forEach(row => {
            row.style.gap = '0';
            row.style.margin = '0';
            row.style.padding = '0';
        });
        controlsContainer.appendChild(createGroup('Refresh Rate', refreshControls));
        controlsContainer.appendChild(createGroup('Time Range', timeRangeControls));
        controlsContainer.appendChild(createGroup('Max Range', yAxisControls));
        card.appendChild(controlsContainer);
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        chartContainer.style.width = '100%';
        chartContainer.style.display = 'flex';
        chartContainer.style.flexDirection = 'column';
        chartContainer.style.marginTop = '8px';
        this._viewMode = this._loadViewMode();
        if (this._viewMode === 'power' || !this.config.show_energy_section) {
            chartContainer.appendChild(this._renderSectionTitle('Power Consumption'));
            const powerPlaceholder = document.createElement('div');
            powerPlaceholder.className = 'power-chart-placeholder';
            chartContainer.appendChild(powerPlaceholder);
            this._powerChartEl = null;
            this._energyChartEl = null;
        }
        else if (this._viewMode === 'energy' && this.config.show_energy_section) {
            chartContainer.appendChild(this._renderSectionTitle('Energy Consumption', true));
            const energyPlaceholder = document.createElement('div');
            energyPlaceholder.className = 'energy-chart-placeholder';
            chartContainer.appendChild(energyPlaceholder);
            this._energyChartEl = null;
            this._powerChartEl = null;
        }
        card.appendChild(chartContainer);
        setTimeout(() => this._updateCharts(), 0);
        setTimeout(() => this._startUpdateInterval(), 50);
        setTimeout(() => {
            this._updateRefreshRatePillControlsUI();
            this._updateTimeRangeControlsUI();
            this._updateYAxisControlsUI();
        }, 100);
    }
    _setRefreshInterval(seconds) {
        if (this.config) {
            this.config.update_interval = seconds;
        }
        this._currentRefreshInterval = seconds;
        this._updateRefreshRatePillControlsUI();
        this._stopUpdateInterval();
        this._updateCharts();
        this._startUpdateInterval();
    }
    _setTimeRange(hours) {
        if (this.config) {
            this.config.hours_to_show = hours;
        }
        this._currentTimeRangeHours = hours;
        this._updateTimeRangeControlsUI();
        this._updateCharts();
    }
    _manualRefresh() {
        this._updateCharts();
    }
    _createRefreshRatePillControls() {
        const container = document.createElement('div');
        container.className = 'refresh-rate-controls pill-row';
        const manualBtn = document.createElement('button');
        manualBtn.className = 'pill-control refresh-rate-button manual-refresh';
        manualBtn.innerHTML = '<ha-icon icon="mdi:refresh"></ha-icon>';
        manualBtn.title = 'Manual Refresh';
        manualBtn.addEventListener('click', () => this._manualRefresh());
        container.appendChild(manualBtn);
        const offBtn = document.createElement('button');
        offBtn.className = 'pill-control refresh-rate-button';
        offBtn.textContent = 'Off';
        offBtn.dataset.rate = '0';
        offBtn.style.borderRadius = '0';
        offBtn.style.marginLeft = '-1px';
        offBtn.addEventListener('click', () => this._setRefreshInterval(0));
        container.appendChild(offBtn);
        const rates = [5, 15, 30, 60];
        rates.forEach((rate, idx) => {
            const btn = document.createElement('button');
            btn.className = 'pill-control refresh-rate-button';
            btn.textContent = `${rate}s`;
            btn.dataset.rate = rate.toString();
            btn.style.marginRight = '-1px';
            btn.style.borderRadius = idx === rates.length - 1 ? '0 16px 16px 0' : '0';
            btn.style.marginLeft = '-1px';
            btn.addEventListener('click', () => this._setRefreshInterval(rate));
            container.appendChild(btn);
        });
        this._updateRefreshRatePillControlsUI(container);
        return container;
    }
    _updateRefreshRatePillControlsUI(container) {
        const controls = container || this._root.querySelector('.refresh-rate-controls');
        if (!controls)
            return;
        const buttons = controls.querySelectorAll('.refresh-rate-button');
        buttons.forEach(btn => {
            const button = btn;
            button.classList.remove('active');
            button.style.backgroundColor = 'var(--card-background-color, white)';
            button.style.color = 'var(--primary-text-color, #212121)';
            button.style.borderColor = 'var(--divider-color, #e0e0e0)';
        });
        const activeRate = this._currentRefreshInterval.toString();
        const activeButton = Array.from(buttons).find(btn => {
            const button = btn;
            return button.dataset.rate === activeRate;
        });
        if (activeButton) {
            activeButton.classList.add('active');
            activeButton.style.backgroundColor = 'var(--primary-color, #03a9f4)';
            activeButton.style.color = 'var(--text-primary-color, #fff)';
            activeButton.style.borderColor = 'var(--primary-color, #03a9f4)';
        }
    }
    _updateTimeRangeControlsUI(container) {
        const controls = container || this._root.querySelector('.time-range-controls');
        if (!controls)
            return;
        const buttons = controls.querySelectorAll('.time-range-button');
        buttons.forEach(btn => {
            const button = btn;
            button.classList.remove('active');
            button.style.backgroundColor = 'var(--card-background-color, white)';
            button.style.color = 'var(--primary-text-color, #212121)';
            button.style.borderColor = 'var(--divider-color, #e0e0e0)';
        });
        const activeButton = controls.querySelector(`.time-range-button[data-hours="${this._currentTimeRangeHours}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
            activeButton.style.backgroundColor = 'var(--primary-color, #03a9f4)';
            activeButton.style.color = 'var(--text-primary-color, #fff)';
            activeButton.style.borderColor = 'var(--primary-color, #03a9f4)';
        }
    }
    _updateYAxisControlsUI(container) {
        var _a, _b;
        const controls = container || this._root.querySelector('.y-axis-controls');
        if (!controls)
            return;
        const yAxis = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.chart_options) === null || _b === void 0 ? void 0 : _b.y_axis;
        const currentMax = yAxis && typeof yAxis.max !== 'undefined' ? yAxis.max : 'auto';
        const currentMaxStr = currentMax === undefined ? 'auto' : String(currentMax);
        const buttons = controls.querySelectorAll('.yaxis-button');
        buttons.forEach(btn => {
            const button = btn;
            button.classList.remove('active');
            button.style.backgroundColor = 'var(--card-background-color, white)';
            button.style.color = 'var(--primary-text-color, #212121)';
            button.style.borderColor = 'var(--divider-color, #e0e0e0)';
        });
        const activeButton = controls.querySelector(`.yaxis-button[data-yaxis="${currentMaxStr}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
            activeButton.style.backgroundColor = 'var(--primary-color, #03a9f4)';
            activeButton.style.color = 'var(--text-primary-color, #fff)';
            activeButton.style.borderColor = 'var(--primary-color, #03a9f4)';
        }
    }
    _setYAxisMax(maxValue) {
        if (!this.config)
            return;
        if (!this.config.chart_options)
            this.config.chart_options = { y_axis: {} };
        if (!this.config.chart_options.y_axis)
            this.config.chart_options.y_axis = {};
        this.config.chart_options.y_axis.max = maxValue === 'auto' ? undefined : Number(maxValue);
        this._updateYAxisControlsUI();
        this._updateCharts();
    }
    _createTimeRangeControls() {
        const container = document.createElement('div');
        container.className = 'time-range-controls pill-row';
        const timeRanges = [
            { label: '1h', hours: 1 },
            { label: '3h', hours: 3 },
            { label: '12h', hours: 12 },
            { label: '24h', hours: 24 },
            { label: '3d', hours: 72 },
            { label: '1w', hours: 168 }
        ];
        timeRanges.forEach((range, index) => {
            const btn = document.createElement('button');
            btn.className = 'pill-control time-range-button';
            btn.textContent = range.label;
            btn.dataset.hours = String(range.hours);
            btn.style.borderRadius =
                index === 0 ? '16px 0 0 16px' :
                    index === timeRanges.length - 1 ? '0 16px 16px 0' : '0';
            btn.style.marginLeft = index > 0 ? '-1px' : '0';
            btn.style.minWidth = '36px';
            btn.style.height = '26px';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            btn.style.fontSize = '0.95em';
            btn.style.letterSpacing = '0.01em';
            btn.style.padding = '0';
            btn.addEventListener('click', () => this._setTimeRange(range.hours));
            if (this._currentTimeRangeHours === range.hours) {
                btn.classList.add('active');
            }
            container.appendChild(btn);
        });
        return container;
    }
    _createYAxisControls() {
        var _a, _b, _c;
        const container = document.createElement('div');
        container.className = 'y-axis-controls pill-row';
        const presets = ((_a = this.config) === null || _a === void 0 ? void 0 : _a.y_axis_max_presets) || [500, 3000, 9000];
        const yAxisPresets = [
            { label: 'Auto', value: 'auto' },
            ...presets.map(v => ({ label: String(v), value: String(v) }))
        ];
        const yAxis = (_c = (_b = this.config) === null || _b === void 0 ? void 0 : _b.chart_options) === null || _c === void 0 ? void 0 : _c.y_axis;
        const currentMax = yAxis && typeof yAxis.max !== 'undefined' ? yAxis.max : 'auto';
        const currentMaxStr = currentMax === undefined ? 'auto' : String(currentMax);
        yAxisPresets.forEach((preset, index) => {
            const btn = document.createElement('button');
            btn.className = 'pill-control yaxis-button';
            btn.textContent = preset.label;
            btn.dataset.yaxis = preset.value;
            btn.style.borderRadius =
                index === 0 ? '16px 0 0 16px' :
                    index === yAxisPresets.length - 1 ? '0 16px 16px 0' : '0';
            btn.style.marginLeft = index > 0 ? '-1px' : '0';
            btn.style.minWidth = '36px';
            btn.style.height = '26px';
            btn.addEventListener('click', () => this._setYAxisMax(preset.value));
            if (currentMaxStr === preset.value) {
                btn.classList.add('active');
            }
            container.appendChild(btn);
        });
        return container;
    }
    _checkApexChartsRegistration() {
        const isRegistered = customElements.get('apexcharts-card') !== undefined;
        this._apexChartCardRegistered = !!isRegistered;
        if (!this._isLoading) {
            this._updateContent();
        }
    }
}
customElements.define('energy-dashboard-chart-card', EnergyDashboardChartCard);

/**
 * Editor component for the Energy Dashboard Chart Card.
 * Provides a UI for users to configure chart options in Home Assistant.
 * Handles form rendering, validation, and config change events.
 */
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
            // Handle nested properties like chart_options.y_axis.title
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const defaultConfig = getDefaultChartConfig();
        this.config = {
            ...defaultConfig,
            ...config,
            chart_options: {
                ...defaultConfig.chart_options,
                ...(config.chart_options || {}),
                y_axis: {
                    ...(_a = defaultConfig.chart_options) === null || _a === void 0 ? void 0 : _a.y_axis,
                    ...(((_b = config.chart_options) === null || _b === void 0 ? void 0 : _b.y_axis) || {})
                }
            },
            // Add base EnergyDashboardConfig properties
            title: (_c = config.title) !== null && _c !== void 0 ? _c : 'Energy Dashboard Chart',
            show_header: (_d = config.show_header) !== null && _d !== void 0 ? _d : true,
            show_state: (_e = config.show_state) !== null && _e !== void 0 ? _e : true,
            show_toggle: (_f = config.show_toggle) !== null && _f !== void 0 ? _f : true,
            auto_select_count: (_g = config.auto_select_count) !== null && _g !== void 0 ? _g : 6,
            max_height: (_h = config.max_height) !== null && _h !== void 0 ? _h : 400,
            energy_auto_select_count: (_j = config.energy_auto_select_count) !== null && _j !== void 0 ? _j : 6,
            show_legend: (_k = config.show_legend) !== null && _k !== void 0 ? _k : true,
            y_axis_max_presets: (_l = config.y_axis_max_presets) !== null && _l !== void 0 ? _l : [500, 3000, 9000],
        };
        this._updateForm();
    }
    _updateForm() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
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
        // SECTION: Chart Settings
        this._addSectionTitle(form, 'Chart Settings');
        // Chart appearance options
        const chartAppearance = document.createElement('div');
        chartAppearance.innerHTML = '<div class="title">Chart Appearance</div>';
        // Chart Height
        const chartHeightRow = document.createElement('div');
        chartHeightRow.className = 'row';
        const chartHeightLabel = document.createElement('div');
        chartHeightLabel.textContent = 'Chart Height (px)';
        const chartHeightInput = document.createElement('input');
        chartHeightInput.className = 'value';
        chartHeightInput.type = 'number';
        chartHeightInput.min = '100';
        chartHeightInput.max = '1000';
        chartHeightInput.value = ((_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.chart_height) === null || _b === void 0 ? void 0 : _b.toString()) || '300';
        chartHeightInput.addEventListener('change', (e) => {
            this.config = { ...this.config, chart_height: Number(e.target.value) };
            this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
        });
        chartHeightRow.appendChild(chartHeightLabel);
        chartHeightRow.appendChild(chartHeightInput);
        chartAppearance.appendChild(chartHeightRow);
        // Stroke Width slider
        const strokeWidthRow = document.createElement('div');
        strokeWidthRow.className = 'row';
        const strokeWidthLabel = document.createElement('div');
        strokeWidthLabel.textContent = 'Line Thickness';
        const strokeWidthContainer = document.createElement('div');
        strokeWidthContainer.className = 'value';
        strokeWidthContainer.style.display = 'flex';
        strokeWidthContainer.style.flexDirection = 'row';
        strokeWidthContainer.style.alignItems = 'center';
        const strokeWidthInput = document.createElement('ha-slider');
        strokeWidthInput.min = '1';
        strokeWidthInput.max = '5';
        strokeWidthInput.step = '0.25';
        strokeWidthInput.value = (((_c = this.config) === null || _c === void 0 ? void 0 : _c.stroke_width) || 2).toString();
        strokeWidthInput.style.flex = '1';
        strokeWidthInput.addEventListener('change', (e) => {
            const value = Number(e.target.value);
            this.config = { ...this.config, stroke_width: value };
            strokeWidthValueLabel.textContent = value.toString();
            this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
        });
        const strokeWidthValueLabel = document.createElement('span');
        strokeWidthValueLabel.textContent = (((_d = this.config) === null || _d === void 0 ? void 0 : _d.stroke_width) || 2).toString();
        strokeWidthValueLabel.style.minWidth = '20px';
        strokeWidthValueLabel.style.textAlign = 'right';
        strokeWidthValueLabel.style.marginLeft = '8px';
        strokeWidthContainer.appendChild(strokeWidthInput);
        strokeWidthContainer.appendChild(strokeWidthValueLabel);
        strokeWidthRow.appendChild(strokeWidthLabel);
        strokeWidthRow.appendChild(strokeWidthContainer);
        chartAppearance.appendChild(strokeWidthRow);
        // Show Points Toggle
        const showPointsRow = document.createElement('div');
        showPointsRow.className = 'row';
        const showPointsLabel = document.createElement('div');
        showPointsLabel.textContent = 'Show Data Points';
        const showPointsToggle = document.createElement('ha-switch');
        showPointsToggle.checked = ((_e = this.config) === null || _e === void 0 ? void 0 : _e.show_points) || false;
        showPointsToggle.addEventListener('change', (e) => {
            this.config = { ...this.config, show_points: e.target.checked };
            this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
        });
        showPointsRow.appendChild(showPointsToggle);
        showPointsRow.appendChild(showPointsLabel);
        chartAppearance.appendChild(showPointsRow);
        // Smooth Curve Toggle
        const smoothCurveRow = document.createElement('div');
        smoothCurveRow.className = 'row';
        const smoothCurveLabel = document.createElement('div');
        smoothCurveLabel.textContent = 'Smooth Curve';
        const smoothCurveToggle = document.createElement('ha-switch');
        smoothCurveToggle.checked = ((_f = this.config) === null || _f === void 0 ? void 0 : _f.smooth_curve) !== false; // True by default
        smoothCurveToggle.addEventListener('change', (e) => {
            this.config = { ...this.config, smooth_curve: e.target.checked };
            this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
        });
        smoothCurveRow.appendChild(smoothCurveToggle);
        smoothCurveRow.appendChild(smoothCurveLabel);
        chartAppearance.appendChild(smoothCurveRow);
        form.appendChild(chartAppearance);
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
        // SECTION: Y-Axis Settings
        this._addSectionTitle(form, 'Y-Axis Settings');
        // Y-Axis Title
        const yTitleRow = this._createRow();
        const yTitleField = document.createElement('ha-textfield');
        yTitleField.className = 'value';
        yTitleField.label = 'Y-Axis Title';
        yTitleField.value = ((_h = (_g = this.config.chart_options) === null || _g === void 0 ? void 0 : _g.y_axis) === null || _h === void 0 ? void 0 : _h.title) || '';
        yTitleField.configValue = 'chart_options.y_axis.title';
        yTitleField.addEventListener('change', this.valueChanged);
        yTitleRow.appendChild(yTitleField);
        form.appendChild(yTitleRow);
        // Y-Axis Unit
        const yUnitRow = this._createRow();
        const yUnitField = document.createElement('ha-textfield');
        yUnitField.className = 'value';
        yUnitField.label = 'Y-Axis Unit';
        yUnitField.value = ((_k = (_j = this.config.chart_options) === null || _j === void 0 ? void 0 : _j.y_axis) === null || _k === void 0 ? void 0 : _k.unit) || '';
        yUnitField.configValue = 'chart_options.y_axis.unit';
        yUnitField.addEventListener('change', this.valueChanged);
        yUnitRow.appendChild(yUnitField);
        form.appendChild(yUnitRow);
        // Y-Axis Decimals
        const yDecimalsRow = this._createRow();
        const yDecimalsField = document.createElement('ha-textfield');
        yDecimalsField.className = 'value';
        yDecimalsField.label = 'Y-Axis Decimals';
        yDecimalsField.type = 'number';
        yDecimalsField.min = '0';
        yDecimalsField.max = '5';
        yDecimalsField.value = String((_o = (_m = (_l = this.config.chart_options) === null || _l === void 0 ? void 0 : _l.y_axis) === null || _m === void 0 ? void 0 : _m.decimals) !== null && _o !== void 0 ? _o : 1);
        yDecimalsField.configValue = 'chart_options.y_axis.decimals';
        yDecimalsField.addEventListener('change', this.valueChanged);
        yDecimalsRow.appendChild(yDecimalsField);
        form.appendChild(yDecimalsRow);
        // Y-Axis Min
        const yMinRow = this._createRow();
        const yMinField = document.createElement('ha-textfield');
        yMinField.className = 'value';
        yMinField.label = 'Y-Axis Minimum (empty for auto)';
        yMinField.type = 'number';
        yMinField.value = ((_q = (_p = this.config.chart_options) === null || _p === void 0 ? void 0 : _p.y_axis) === null || _q === void 0 ? void 0 : _q.min) !== undefined ? String(this.config.chart_options.y_axis.min) : '';
        yMinField.configValue = 'chart_options.y_axis.min';
        yMinField.addEventListener('change', this.valueChanged);
        yMinRow.appendChild(yMinField);
        form.appendChild(yMinRow);
        // Y-Axis Max
        const yMaxRow = this._createRow();
        const yMaxField = document.createElement('ha-textfield');
        yMaxField.className = 'value';
        yMaxField.label = 'Y-Axis Maximum (empty for auto)';
        yMaxField.type = 'number';
        yMaxField.value = ((_s = (_r = this.config.chart_options) === null || _r === void 0 ? void 0 : _r.y_axis) === null || _s === void 0 ? void 0 : _s.max) !== undefined ? String(this.config.chart_options.y_axis.max) : '';
        yMaxField.configValue = 'chart_options.y_axis.max';
        yMaxField.addEventListener('change', this.valueChanged);
        yMaxRow.appendChild(yMaxField);
        form.appendChild(yMaxRow);
        // Y-Axis Max Presets
        const yMaxPresetsRow = this._createRow();
        const yMaxPresetsLabel = document.createElement('div');
        yMaxPresetsLabel.textContent = 'Y-Axis Max Presets (comma separated)';
        const yMaxPresetsInput = document.createElement('input');
        yMaxPresetsInput.className = 'value';
        yMaxPresetsInput.type = 'text';
        yMaxPresetsInput.value = (this.config.y_axis_max_presets || [500, 3000, 9000]).join(', ');
        yMaxPresetsInput.addEventListener('change', (e) => {
            const val = e.target.value;
            const arr = val.split(',').map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v));
            this.config = { ...this.config, y_axis_max_presets: arr };
            this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
        });
        yMaxPresetsRow.appendChild(yMaxPresetsLabel);
        yMaxPresetsRow.appendChild(yMaxPresetsInput);
        form.appendChild(yMaxPresetsRow);
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
