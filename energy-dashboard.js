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
    // Helper method to equalize button heights with ResizeObserver
    _equalizeButtonHeights(buttonContainer) {
        if (!buttonContainer)
            return;
        const buttons = Array.from(buttonContainer.querySelectorAll('button'));
        if (buttons.length === 0)
            return;
        // First, reset heights to auto to get natural height
        buttons.forEach(btn => btn.style.height = 'auto');
        // Use ResizeObserver for more reliable height adjustments
        try {
            const resizeObserver = new ResizeObserver(() => {
                // Find tallest button
                const maxHeight = Math.max(...buttons.map(btn => btn.offsetHeight));
                // Set all buttons to the tallest height
                if (maxHeight > 0) {
                    buttons.forEach(btn => {
                        btn.style.height = `${maxHeight}px`;
                    });
                }
            });
            // Observe all buttons
            buttons.forEach(button => resizeObserver.observe(button));
            // Immediate equalization attempt
            requestAnimationFrame(() => {
                const maxHeight = Math.max(...buttons.map(btn => btn.offsetHeight));
                if (maxHeight > 0) {
                    buttons.forEach(btn => {
                        btn.style.height = `${maxHeight}px`;
                    });
                }
            });
            // Cleanup after 2 seconds (by then equalization should be stable)
            setTimeout(() => {
                resizeObserver.disconnect();
            }, 2000);
        }
        catch (e) {
            // Fallback if ResizeObserver is not supported
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
    // Force browser to recalculate layout to ensure all heights are properly calculated
    _forceRecalculation(element) {
        // Reading offsetHeight forces a layout recalculation
        const height = element.offsetHeight;
        return height;
    }
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
        this._viewMode = 'power'; // Default view mode
        this._powerEntitiesContainer = null;
        this._energyEntitiesContainer = null;
        this._dynamicFilterValue = ''; // Track dynamic filter value
        this._filteredPowerEntities = []; // Track filtered power entities
        this._filteredEnergyEntities = []; // Track filtered energy entities
        this._searchInputHasFocus = false; // Track whether the search input has focus
        this._refreshIntervalId = null; // Timer ID for auto-refresh
        this._lastUpdateTimestamp = 0; // Track last entity update timestamp
        this._forceUpdate = false; // Flag to force update regardless of timestamp
        // Handle dynamic filter input change
        this._handleFilterInput = (e) => {
            const target = e.target;
            this._dynamicFilterValue = target.value;
            // Re-apply filters and update UI
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
            // Sort by absolute value descending
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
            // Set all entity toggle states to false
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
            // Set all entity toggle states to true
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
            // Sort by absolute value descending
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
            // Set all entity toggle states to false
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
            // Set all entity toggle states to true
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
                // Toggle the persistence setting
                this.config.persist_selection = !this.config.persist_selection;
                // Always save the persistence toggle state, regardless of its value
                this._savePersistenceState(this.config.persist_selection);
                // If persistence is turned off, clear localStorage and reset to defaults immediately
                if (!this.config.persist_selection) {
                    localStorage.removeItem('energy-dashboard-power-toggle-states');
                    localStorage.removeItem('energy-dashboard-energy-toggle-states');
                    // Reset initialized state to force reload of default entities
                    this._initialized = false;
                    this._energyInitialized = false;
                }
                else {
                    // If persistence is turned on, save the current toggle states
                    this._savePowerToggleStates();
                    this._saveEnergyToggleStates();
                }
                // Re-initialize and update the content with new settings
                this._updateEntities();
                this._updateContent();
            }
        };
        // Toggle between power and energy view
        this._toggleViewMode = () => {
            const newMode = this._viewMode === 'power' ? 'energy' : 'power';
            this._viewMode = newMode;
            this._saveViewMode(newMode);
            // Save the current view mode to be used by chart card
            this._updateContent();
            // Dispatch a custom event that the chart card can listen for
            this.dispatchEvent(new CustomEvent('view-mode-changed', {
                detail: { mode: newMode },
                bubbles: true,
                composed: true
            }));
        };
        this._root = this.attachShadow({ mode: 'open' });
        this._root.appendChild(createStyles(cardStyles));
        // Create the card element
        const card = document.createElement('ha-card');
        this._root.appendChild(card);
        // Only create containers here, do not append
        this._powerEntitiesContainer = document.createElement('div');
        this._powerEntitiesContainer.className = 'entities-container';
        this._energyEntitiesContainer = document.createElement('div');
        this._energyEntitiesContainer.className = 'entities-container';
    }
    // Called when the element is added to the DOM
    connectedCallback() {
        // Load persistence setting from localStorage when element is connected to DOM
        if (this.config) {
            this.config.persist_selection = this._loadPersistenceState();
        }
        // Load view mode from localStorage
        this._viewMode = this._loadViewMode();
        if (this.config) {
            this.config.view_mode = this._viewMode;
        }
        // Set up auto-refresh if configured
        this._setupRefreshInterval();
        this._updateContent();
    }
    // Home Assistant specific method to set config
    setConfig(config) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (!config) {
            throw new Error("Invalid configuration");
        }
        // Clear any existing refresh interval before changing config
        this._clearRefreshInterval();
        // Load persistence setting from localStorage first
        const persistenceFromStorage = this._loadPersistenceState();
        // Create a merged config object correctly by spreading config first
        this.config = {
            ...config,
            // Then set defaults only for missing properties
            title: (_a = config.title) !== null && _a !== void 0 ? _a : 'Energy Dashboard',
            show_header: (_b = config.show_header) !== null && _b !== void 0 ? _b : true,
            show_state: (_c = config.show_state) !== null && _c !== void 0 ? _c : true,
            show_toggle: (_d = config.show_toggle) !== null && _d !== void 0 ? _d : true,
            auto_select_count: (_e = config.auto_select_count) !== null && _e !== void 0 ? _e : 6,
            max_height: (_f = config.max_height) !== null && _f !== void 0 ? _f : 0, // No longer using max_height, set to 0 by default
            entity_removal_filter: (_g = config.entity_removal_filter) !== null && _g !== void 0 ? _g : '', // Default to empty string for no filter
            refresh_rate: (_h = config.refresh_rate) !== null && _h !== void 0 ? _h : 'off', // Default to off for refresh rate
            // Use the stored value as priority for persistence setting
            persist_selection: persistenceFromStorage,
            // Always enable energy section
            show_energy_section: true,
        };
        // Set up auto-refresh if configured
        this._setupRefreshInterval();
        // Reset initialization flags so that entity selection is re-initialized with new config values
        this._initialized = false;
        this._energyInitialized = false;
        this._forceUpdate = true; // Force update to apply new config
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
            max_height: 0,
            persist_selection: true,
            entity_removal_filter: '' // Fixed: renamed from entity_filter to entity_removal_filter
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
        var _a;
        const isFirstUpdate = !this._hass;
        this._hass = hass;
        // Load the persistence setting from localStorage early to ensure it's always available
        if (this.config && isFirstUpdate) {
            this.config.persist_selection = this._loadPersistenceState();
            // Force first update
            this._forceUpdate = true;
        }
        // Only update entities based on refresh rate settings or force update flag
        const now = Date.now();
        let shouldUpdateEntities = false;
        // Update in these cases:
        // 1. First update (isFirstUpdate)
        // 2. Force update flag is set (_forceUpdate)
        // 3. Refresh rate is active and enough time has passed since last update
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
            this._forceUpdate = false; // Reset force update flag
            // Only update content when entities are updated
            this._updateContent();
        }
        // Do NOT call _updateContent() on every hass update
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
        // Map the entities with their toggle state
        this.powerEntities = newPowerEntities.map(entity => ({
            ...entity,
            isOn: this.entityToggleStates[entity.entityId] || false
        }));
        // Sort by absolute power value, descending
        this.powerEntities.sort((a, b) => { var _a, _b; return Math.abs((_a = b.powerValue) !== null && _a !== void 0 ? _a : 0) - Math.abs((_b = a.powerValue) !== null && _b !== void 0 ? _b : 0); });
        // Apply the entity removal filter from config
        const filteredEntities = this._applyRemovalFilter(this.powerEntities);
        // Apply dynamic filter if exists
        this._filteredPowerEntities = this._applyDynamicFilter(filteredEntities, this._dynamicFilterValue);
        this._savePowerToggleStates();
    }
    _updateEnergyEntities() {
        const newEnergyEntities = getEnergyEntities(this._hass);
        if (!this._energyInitialized || Object.keys(this.energyEntityToggleStates).length === 0) {
            this._initializeEnergyToggleStates(newEnergyEntities);
            this._energyInitialized = true;
        }
        // Map the entities with their toggle state
        this.energyEntities = newEnergyEntities.map(entity => ({
            ...entity,
            isOn: this.energyEntityToggleStates[entity.entityId] || false
        }));
        // Sort by absolute energy value, descending
        this.energyEntities.sort((a, b) => { var _a, _b; return Math.abs((_a = b.energyValue) !== null && _a !== void 0 ? _a : 0) - Math.abs((_b = a.energyValue) !== null && _b !== void 0 ? _b : 0); });
        // Apply the entity removal filter from config
        const filteredEntities = this._applyRemovalFilter(this.energyEntities);
        // Apply dynamic filter if exists
        this._filteredEnergyEntities = this._applyDynamicFilter(filteredEntities, this._dynamicFilterValue);
        this._saveEnergyToggleStates();
    }
    // Apply entity removal filter from configuration
    _applyRemovalFilter(entities) {
        var _a;
        // If no filter is defined, return all entities
        if (!((_a = this.config) === null || _a === void 0 ? void 0 : _a.entity_removal_filter) || this.config.entity_removal_filter.trim() === '') {
            return entities;
        }
        // Parse filter string: format is "string1,string2|option"
        // Example: "kitchen,bedroom|contains" to filter out entities with kitchen or bedroom in their names
        const filterParts = this.config.entity_removal_filter.split('|');
        const filterString = filterParts[0].trim();
        // If filter string is empty after trimming, return all entities
        if (filterString === '') {
            return entities;
        }
        // Get filter terms: split by comma, trim each, convert to lowercase, remove empty strings
        const filterTerms = filterString
            .split(',')
            .map(term => term.trim().toLowerCase())
            .filter(term => term.length > 0);
        // If no valid filter terms, return all entities
        if (filterTerms.length === 0) {
            return entities;
        }
        // Get filter mode: default to 'contains' if not specified or invalid
        let filterMode = 'contains'; // Default to contains for better usability
        if (filterParts.length > 1) {
            const mode = filterParts[1].trim().toLowerCase();
            if (['exact', 'start', 'contains', 'entity_id'].includes(mode)) {
                filterMode = mode;
            }
        }
        // Log the active filter for debugging
        console.log(`Applying entity removal filter: terms=${filterTerms.join(', ')}, mode=${filterMode}`);
        // Apply filter using the specified mode to remove matching entities
        return entities.filter(entity => {
            // Convert entity name to lowercase for case-insensitive matching
            const nameLower = entity.name.toLowerCase();
            const entityIdLower = entity.entityId.toLowerCase();
            // Check each filter term against this entity
            for (const term of filterTerms) {
                let shouldRemove = false;
                // Apply different matching logic based on filter mode
                switch (filterMode) {
                    case 'exact':
                        // Remove if the entity name exactly matches the term
                        shouldRemove = nameLower === term;
                        break;
                    case 'start':
                        // Remove if the entity name starts with the term
                        shouldRemove = nameLower.startsWith(term);
                        break;
                    case 'entity_id':
                        // Remove if the entity ID contains the term
                        shouldRemove = entityIdLower.includes(term);
                        break;
                    case 'contains':
                    default:
                        // Remove if the entity name contains the term (default behavior)
                        shouldRemove = nameLower.includes(term);
                        break;
                }
                // If any term matches according to the filter mode, remove this entity
                if (shouldRemove) {
                    return false;
                }
            }
            // Keep the entity if it didn't match any filter terms
            return true;
        });
    }
    // Apply dynamic filter (from search box)
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
        // Only load saved states if persistence is enabled
        const persistenceEnabled = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.persist_selection) !== null && _b !== void 0 ? _b : true;
        const savedStates = persistenceEnabled ? loadToggleStates('energy-dashboard-power-toggle-states') : null;
        if (savedStates && Object.keys(savedStates).length > 0) {
            this.entityToggleStates = savedStates;
        }
        else {
            // Create a new toggle states object
            const toggleStates = {};
            const count = (_d = (_c = this.config) === null || _c === void 0 ? void 0 : _c.auto_select_count) !== null && _d !== void 0 ? _d : 6;
            // Apply entity removal filter first to get only visible entities
            let visibleEntities = this._applyRemovalFilter(entities);
            // Sort by absolute value descending
            visibleEntities = visibleEntities.sort((a, b) => { var _a, _b; return Math.abs((_a = b.powerValue) !== null && _a !== void 0 ? _a : 0) - Math.abs((_b = a.powerValue) !== null && _b !== void 0 ? _b : 0); });
            // Initialize all entities to false first (including hidden ones)
            entities.forEach(entity => {
                toggleStates[entity.entityId] = false;
            });
            // Then set the first `count` VISIBLE entities to true
            visibleEntities.slice(0, count).forEach(entity => {
                toggleStates[entity.entityId] = true;
            });
            this.entityToggleStates = toggleStates;
        }
    }
    _initializeEnergyToggleStates(entities) {
        var _a, _b, _c, _d;
        // Only load saved states if persistence is enabled
        const persistenceEnabled = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.persist_selection) !== null && _b !== void 0 ? _b : true;
        const savedStates = persistenceEnabled ? loadToggleStates('energy-dashboard-energy-toggle-states') : null;
        if (savedStates && Object.keys(savedStates).length > 0) {
            this.energyEntityToggleStates = savedStates;
        }
        else {
            // Create a new toggle states object
            const toggleStates = {};
            const count = (_d = (_c = this.config) === null || _c === void 0 ? void 0 : _c.auto_select_count) !== null && _d !== void 0 ? _d : 6;
            // Apply entity removal filter first to get only visible entities
            let visibleEntities = this._applyRemovalFilter(entities);
            // Sort by absolute value descending
            visibleEntities = visibleEntities.sort((a, b) => { var _a, _b; return Math.abs((_a = b.energyValue) !== null && _a !== void 0 ? _a : 0) - Math.abs((_b = a.energyValue) !== null && _b !== void 0 ? _b : 0); });
            // Initialize all entities to false first (including hidden ones)
            entities.forEach(entity => {
                toggleStates[entity.entityId] = false;
            });
            // Then set the first `count` VISIBLE entities to true
            visibleEntities.slice(0, count).forEach(entity => {
                toggleStates[entity.entityId] = true;
            });
            this.energyEntityToggleStates = toggleStates;
        }
    }
    // Make entity selections accessible to other components even when persistence is off
    _savePowerToggleStates() {
        // Always save toggle states to localStorage for the chart card to access, 
        // but they will only be loaded on initialization if persistence is enabled
        saveToggleStates(this.entityToggleStates, 'energy-dashboard-power-toggle-states');
    }
    // Make entity selections accessible to other components even when persistence is off
    _saveEnergyToggleStates() {
        // Always save toggle states to localStorage for the chart card to access,
        // but they will only be loaded on initialization if persistence is enabled
        saveToggleStates(this.energyEntityToggleStates, 'energy-dashboard-energy-toggle-states');
    }
    // Manage the persistence toggle setting separately
    _loadPersistenceState() {
        try {
            const stored = localStorage.getItem('energy-dashboard-persistence-toggle');
            return stored === null ? true : stored === 'true';
        }
        catch {
            return true; // Default to true if we can't load from localStorage
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
    // Save view mode to localStorage
    _saveViewMode(mode) {
        try {
            localStorage.setItem('energy-dashboard-view-mode', mode);
            // Also update config to keep it in sync
            if (this.config) {
                this.config.view_mode = mode;
            }
            this._viewMode = mode;
        }
        catch (e) {
            console.error("Failed to save view mode:", e);
        }
    }
    // Load view mode from localStorage
    _loadViewMode() {
        try {
            const stored = localStorage.getItem('energy-dashboard-view-mode');
            return (stored === 'power' || stored === 'energy') ? stored : 'power';
        }
        catch {
            return 'power'; // Default to power view if we can't load from localStorage
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
        // Section rendering
        const renderPersistenceToggle = () => {
            var _a, _b;
            console.log("Rendering persistence toggle, config:", this.config);
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
        // First always add the mode buttons (Power/Energy) section
        if (this._viewMode === 'power') {
            // Add control buttons section
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
            // Add the persistence toggle right after control buttons
            const persistenceToggleEl = renderPersistenceToggle();
            card.appendChild(persistenceToggleEl);
            console.log("Appended persistence toggle to card:", persistenceToggleEl);
            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'section-title';
            sectionTitle.textContent = 'Power Entities';
            card.appendChild(sectionTitle);
            // Add dynamic filter input
            const searchContainer = document.createElement('div');
            searchContainer.className = 'search-container';
            const searchInput = document.createElement('input');
            searchInput.className = 'search-input';
            searchInput.type = 'text';
            searchInput.placeholder = 'Filter entities...';
            searchInput.value = this._dynamicFilterValue;
            // Add attribute to prevent Home Assistant from intercepting inputs
            searchInput.setAttribute('autocomplete', 'off');
            searchInput.setAttribute('autocorrect', 'off');
            searchInput.setAttribute('autocapitalize', 'none');
            searchInput.setAttribute('spellcheck', 'false');
            // Prevent the input from being focused when clicking in empty areas of the card
            searchInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            // Prevent the key event from bubbling up to Home Assistant
            searchInput.addEventListener('keydown', (e) => {
                e.stopPropagation();
            });
            // Add our filter handler
            searchInput.addEventListener('input', this._handleFilterInput);
            // Add focus and blur event listeners to track focus state
            searchInput.addEventListener('focus', () => {
                this._searchInputHasFocus = true;
            });
            searchInput.addEventListener('blur', () => {
                this._searchInputHasFocus = false;
            });
            // If the search input had focus before re-rendering, restore focus
            if (this._searchInputHasFocus) {
                // Need to delay this slightly to ensure the DOM is ready
                setTimeout(() => {
                    searchInput.focus();
                }, 0);
            }
            searchContainer.appendChild(searchInput);
            card.appendChild(searchContainer);
            // Add refresh control after search input
            const refreshControlContainer = document.createElement('div');
            refreshControlContainer.className = 'refresh-control-container';
            const refreshControl = document.createElement('div');
            refreshControl.className = 'refresh-control';
            // Off option
            const offOption = document.createElement('div');
            offOption.className = `refresh-option${this.config.refresh_rate === 'off' || !this.config.refresh_rate ? ' active' : ''}`;
            offOption.textContent = 'Off';
            offOption.addEventListener('click', () => this._setRefreshRate('off'));
            // 10s option
            const tenSecOption = document.createElement('div');
            tenSecOption.className = `refresh-option${this.config.refresh_rate === '10s' ? ' active' : ''}`;
            tenSecOption.textContent = '10s';
            tenSecOption.addEventListener('click', () => this._setRefreshRate('10s'));
            // 30s option
            const thirtySecOption = document.createElement('div');
            thirtySecOption.className = `refresh-option${this.config.refresh_rate === '30s' ? ' active' : ''}`;
            thirtySecOption.textContent = '30s';
            thirtySecOption.addEventListener('click', () => this._setRefreshRate('30s'));
            // Refresh button
            const refreshButton = document.createElement('div');
            refreshButton.className = 'refresh-option refresh-button';
            refreshButton.innerHTML = '<ha-icon icon="mdi:refresh"></ha-icon>';
            refreshButton.title = 'Refresh now';
            refreshButton.addEventListener('click', () => this._refreshNow());
            // Add options to control
            refreshControl.appendChild(offOption);
            refreshControl.appendChild(tenSecOption);
            refreshControl.appendChild(thirtySecOption);
            refreshControl.appendChild(refreshButton);
            refreshControlContainer.appendChild(refreshControl);
            card.appendChild(refreshControlContainer);
            // Apply max height if configured
            if (this.config.enable_max_height && this.config.max_height && this.config.max_height > 0) {
                // Create a container with fixed height and scrolling for the entities
                const scrollContainer = document.createElement('div');
                scrollContainer.className = 'scroll-container';
                scrollContainer.style.maxHeight = `${this.config.max_height}px`;
                scrollContainer.style.overflowY = 'auto';
                scrollContainer.style.overflowX = 'hidden';
                scrollContainer.style.paddingRight = '4px'; // Small padding to account for scrollbar
                scrollContainer.style.marginBottom = '16px';
                // Add the entities container to the scroll container
                this._powerEntitiesContainer.style.display = '';
                this._energyEntitiesContainer.style.display = 'none';
                scrollContainer.appendChild(this._powerEntitiesContainer);
                card.appendChild(scrollContainer);
            }
            else {
                // Regular display without scroll
                this._powerEntitiesContainer.style.display = '';
                this._energyEntitiesContainer.style.display = 'none';
                card.appendChild(this._powerEntitiesContainer);
            }
            // Update the entity buttons with filtered entities
            if (this._filteredPowerEntities.length > 0) {
                this._updateEntityButtons(this._powerEntitiesContainer, this._filteredPowerEntities, this._togglePowerEntity, true);
            }
            else {
                // Clear the container but don't show any message
                this._powerEntitiesContainer.innerHTML = '';
            }
        }
        else {
            // Similar structure for energy view
            // Add control buttons section  
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
            // Add the persistence toggle right after control buttons
            const persistenceToggleEl = renderPersistenceToggle();
            card.appendChild(persistenceToggleEl);
            console.log("Appended persistence toggle to card:", persistenceToggleEl);
            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'section-title';
            sectionTitle.textContent = 'Energy Entities';
            card.appendChild(sectionTitle);
            // Add dynamic filter input
            const searchContainer = document.createElement('div');
            searchContainer.className = 'search-container';
            const searchInput = document.createElement('input');
            searchInput.className = 'search-input';
            searchInput.type = 'text';
            searchInput.placeholder = 'Filter entities...';
            searchInput.value = this._dynamicFilterValue;
            // Add attribute to prevent Home Assistant from intercepting inputs
            searchInput.setAttribute('autocomplete', 'off');
            searchInput.setAttribute('autocorrect', 'off');
            searchInput.setAttribute('autocapitalize', 'none');
            searchInput.setAttribute('spellcheck', 'false');
            // Prevent the input from being focused when clicking in empty areas of the card
            searchInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            // Prevent the key event from bubbling up to Home Assistant
            searchInput.addEventListener('keydown', (e) => {
                e.stopPropagation();
            });
            // Add our filter handler
            searchInput.addEventListener('input', this._handleFilterInput);
            // Add focus and blur event listeners to track focus state
            searchInput.addEventListener('focus', () => {
                this._searchInputHasFocus = true;
            });
            searchInput.addEventListener('blur', () => {
                this._searchInputHasFocus = false;
            });
            // If the search input had focus before re-rendering, restore focus
            if (this._searchInputHasFocus) {
                // Need to delay this slightly to ensure the DOM is ready
                setTimeout(() => {
                    searchInput.focus();
                }, 0);
            }
            searchContainer.appendChild(searchInput);
            card.appendChild(searchContainer);
            // Apply max height if configured
            if (this.config.enable_max_height && this.config.max_height && this.config.max_height > 0) {
                // Create a container with fixed height and scrolling for the entities
                const scrollContainer = document.createElement('div');
                scrollContainer.className = 'scroll-container';
                scrollContainer.style.maxHeight = `${this.config.max_height}px`;
                scrollContainer.style.overflowY = 'auto';
                scrollContainer.style.overflowX = 'hidden';
                scrollContainer.style.paddingRight = '4px'; // Small padding to account for scrollbar
                scrollContainer.style.marginBottom = '16px';
                // Add the entities container to the scroll container
                this._powerEntitiesContainer.style.display = 'none';
                this._energyEntitiesContainer.style.display = '';
                scrollContainer.appendChild(this._energyEntitiesContainer);
                card.appendChild(scrollContainer);
            }
            else {
                // Regular display without scroll
                this._powerEntitiesContainer.style.display = 'none';
                this._energyEntitiesContainer.style.display = '';
                card.appendChild(this._energyEntitiesContainer);
            }
            // Show filtered entities or "no results" message
            if (this._filteredEnergyEntities.length > 0) {
                this._updateEntityButtons(this._energyEntitiesContainer, this._filteredEnergyEntities, this._toggleEnergyEntity, false);
            }
            else {
                this._energyEntitiesContainer.innerHTML = '';
            }
        }
        // Check after a short delay if the toggle actually appears in the DOM
        setTimeout(() => {
            const toggle = this._root.querySelector('#persistence-toggle');
            console.log("Persistence toggle in DOM after rendering:", toggle);
            if (toggle) {
                console.log("Toggle styles:", window.getComputedStyle(toggle));
            }
        }, 100);
        // Force layout recalculation to ensure all elements have proper dimensions
        requestAnimationFrame(() => {
            this._forceRecalculation(card);
            // Wait a bit for the DOM to be fully rendered before equalizing button heights
            setTimeout(() => {
                const controlButtonsContainers = Array.from(this._root.querySelectorAll('.control-buttons'));
                console.log(`Found ${controlButtonsContainers.length} control button containers to process`);
                controlButtonsContainers.forEach((container, index) => {
                    console.log(`Equalizing heights for container ${index}`);
                    this._equalizeButtonHeights(container);
                });
                // Also check for entity lists and make sure they're visible
                const entityContainers = Array.from(this._root.querySelectorAll('.entities-container'));
                console.log(`Found ${entityContainers.length} entity containers`);
                entityContainers.forEach(container => {
                    console.log(`Entity container has ${container.childElementCount} children`);
                    if (container.childElementCount === 0) {
                        console.warn("Entity container is empty!");
                    }
                });
            }, 100);
        });
    }
    _updateEntityButtons(container, entities, onClick, isPower) {
        // Map existing entity items by entityId
        const existingItems = {};
        Array.from(container.children).forEach(child => {
            const el = child;
            if (el.dataset && el.dataset.entity) {
                existingItems[el.dataset.entity] = el;
            }
        });
        // Track which nodes are still needed
        const usedNodes = new Set();
        // Add or update entity items
        entities.forEach(entity => {
            var _a;
            let entityItem = existingItems[entity.entityId];
            if (!entityItem) {
                entityItem = document.createElement('div');
                entityItem.dataset.entity = entity.entityId;
                entityItem.addEventListener('click', onClick);
                container.appendChild(entityItem);
            }
            // Update class and content
            entityItem.className = `entity-item ${entity.isOn ? 'on' : 'off'}`;
            entityItem.style.gap = '4px';
            // Build content
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
        // Remove any nodes that are no longer needed
        Object.keys(existingItems).forEach(entityId => {
            if (!usedNodes.has(entityId)) {
                container.removeChild(existingItems[entityId]);
            }
        });
    }
    // Refresh functionality methods
    // Set the refresh rate and update the interval
    _setRefreshRate(rate) {
        if (!this.config)
            return;
        // Update the config
        this.config.refresh_rate = rate;
        // Clear existing interval if there is one
        this._clearRefreshInterval();
        // Set up new interval if needed
        if (rate !== 'off') {
            const intervalMs = rate === '10s' ? 10000 : 30000;
            this._refreshIntervalId = window.setInterval(() => {
                this._refreshNow();
            }, intervalMs);
        }
        // Update the UI
        this._updateContent();
    }
    // Manually refresh the card
    _refreshNow() {
        // Set force update flag to bypass throttling
        this._forceUpdate = true;
        // Force an update of the entities
        if (this._hass) {
            this._updateEntities();
            this._lastUpdateTimestamp = Date.now(); // Update timestamp
            this._forceUpdate = false; // Reset flag after update
            this._updateContent();
        }
    }
    // Clear any existing refresh interval
    _clearRefreshInterval() {
        if (this._refreshIntervalId !== null) {
            window.clearInterval(this._refreshIntervalId);
            this._refreshIntervalId = null;
        }
    }
    // Clean up when the card is removed from the DOM
    disconnectedCallback() {
        this._clearRefreshInterval();
    }
    // Use this to set up the refresh interval when the card is initialized
    _setupRefreshInterval() {
        var _a;
        // Clear any existing interval first
        this._clearRefreshInterval();
        // Set up new interval if a refresh rate is configured
        if (((_a = this.config) === null || _a === void 0 ? void 0 : _a.refresh_rate) && this.config.refresh_rate !== 'off') {
            const intervalMs = this.config.refresh_rate === '10s' ? 10000 : 30000;
            this._refreshIntervalId = window.setInterval(() => {
                this._refreshNow();
            }, intervalMs);
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

function getDefaultChartConfig() {
    return {
        chart_type: 'line',
        chart_height: 300,
        show_points: false,
        smooth_curve: true,
        stroke_width: 2, // Default line thickness
        update_interval: 30, // Set default to 30 seconds
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

// Gaussian smoothing utility
function gaussianSmooth(data, window) {
    if (window <= 1)
        return data;
    const sigma = window / 3;
    const kernel = [];
    const mean = Math.floor(window / 2);
    let sum = 0;
    for (let i = 0; i < window; i++) {
        const x = i - mean;
        const value = Math.exp(-(x * x) / (2 * sigma * sigma));
        kernel.push(value);
        sum += value;
    }
    // Normalize
    for (let i = 0; i < kernel.length; i++)
        kernel[i] /= sum;
    const half = Math.floor(window / 2);
    const smoothed = [];
    for (let i = 0; i < data.length; i++) {
        let acc = 0;
        let weight = 0;
        for (let j = 0; j < window; j++) {
            const idx = i + j - half;
            if (idx >= 0 && idx < data.length) {
                acc += data[idx] * kernel[j];
                weight += kernel[j];
            }
        }
        smoothed.push(acc / (weight || 1));
    }
    return smoothed;
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
        this._currentTimeRangeHours = 24; // Default to 24 hours
        this._viewMode = 'power'; // Default to power view
        // Handle view mode changes from entity card
        this._handleViewModeChange = (event) => {
            if (event.detail && event.detail.mode) {
                this._viewMode = event.detail.mode;
                console.log(`View mode changed to: ${this._viewMode}`);
                // Update the chart display based on view mode
                this._updateContent();
            }
        };
        this._root = this.attachShadow({ mode: 'open' });
        this._root.appendChild(createStyles(cardStyles));
        // Create the card element
        const card = document.createElement('ha-card');
        this._root.appendChild(card);
    }
    // Load the view mode from localStorage
    _loadViewMode() {
        try {
            const stored = localStorage.getItem('energy-dashboard-view-mode');
            return (stored === 'power' || stored === 'energy') ? stored : 'power';
        }
        catch {
            return 'power'; // Default to power view if we can't load from localStorage
        }
    }
    // Called when the element is added to the DOM
    connectedCallback() {
        // Load the selected view mode from localStorage
        this._viewMode = this._loadViewMode();
        // Add event listener for view mode changes from entity card
        window.addEventListener('view-mode-changed', this._handleViewModeChange);
        this._loadSelectedEntities();
        this._checkApexChartsRegistration();
        // First update the content without starting the timer
        this._updateContent();
        // Cancel and reset any existing timers and configuration
        this._stopUpdateInterval();
        // Wait until the content is fully loaded before starting timers
        // This ensures all chart elements have properly initialized
        setTimeout(() => {
            // Only start the update timer if explicitly set
            if (this._currentRefreshInterval > 0) {
                this._startUpdateInterval();
            }
        }, 1000); // Longer timeout to ensure everything is properly loaded
    }
    disconnectedCallback() {
        this._stopUpdateInterval();
        // Remove event listener when component is removed
        window.removeEventListener('view-mode-changed', this._handleViewModeChange);
    }
    // Home Assistant specific method to set config
    setConfig(config) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
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
            // Set update_interval default to 30 seconds if not specified
            update_interval: (_o = config.update_interval) !== null && _o !== void 0 ? _o : 30,
        };
        // Set the current refresh interval from config
        this._currentRefreshInterval = (_p = this.config.update_interval) !== null && _p !== void 0 ? _p : 30;
        this._currentTimeRangeHours = (_q = this.config.hours_to_show) !== null && _q !== void 0 ? _q : 24;
        this._loadSelectedEntities();
        this._isLoading = true;
        this._checkApexChartsRegistration();
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
        this._stopUpdateInterval(); // Ensure no duplicate timers
        const seconds = this._currentRefreshInterval;
        if (seconds > 0) {
            this._updateTimer = window.setInterval(() => {
                console.log(`Timer triggered: Refreshing charts (Interval: ${seconds}s)`);
                this._updateCharts();
            }, seconds * 1000);
            console.log(`Update timer started with interval: ${seconds}s`);
        }
        else {
            console.log('Update timer not started (interval is 0).');
        }
    }
    _stopUpdateInterval() {
        if (this._updateTimer !== null) {
            window.clearInterval(this._updateTimer);
            this._updateTimer = null;
            console.log('Update timer stopped.');
        }
    }
    _generateApexchartsConfig(entities, isEnergy) {
        var _a, _b, _c, _d, _e;
        if (!this.config || !entities.length || !this._hass)
            return null;
        const options = isEnergy
            ? this.config.energy_chart_options
            : this.config.power_chart_options;
        // Generate Apexcharts configuration
        const chartType = this.config.chart_type || 'line';
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
        // Use only user-configured min/max, otherwise let apexcharts auto-range
        let yMin = (_a = options === null || options === void 0 ? void 0 : options.y_axis) === null || _a === void 0 ? void 0 : _a.min;
        let yMax = (_b = options === null || options === void 0 ? void 0 : options.y_axis) === null || _b === void 0 ? void 0 : _b.max;
        let yTitle = isEnergy ? 'Energy (kWh)' : 'Power (W)';
        if ((_c = options === null || options === void 0 ? void 0 : options.y_axis) === null || _c === void 0 ? void 0 : _c.title)
            yTitle = options.y_axis.title;
        const decimals = ((_d = options === null || options === void 0 ? void 0 : options.y_axis) === null || _d === void 0 ? void 0 : _d.decimals) !== undefined ? options.y_axis.decimals : (isEnergy ? 2 : 0);
        const apexChartCardConfig = {
            type: 'custom:apexcharts-card',
            header: {
                show: false
            },
            graph_span: `${hoursToShow}h`,
            chart_type: chartType,
            series,
            yaxis: [{
                    // Only set min/max if explicitly configured
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
                        // No custom tickAmount or forceNiceScale, let apexcharts handle it
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
                    xaxis: {
                        lines: {
                            show: false
                        }
                    },
                    yaxis: {
                        lines: {
                            show: true
                        }
                    },
                    padding: {
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0
                    }
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
                    labels: {
                        colors: 'var(--primary-text-color, #000)'
                    }
                },
                tooltip: {
                    theme: 'light',
                    style: {
                        fontSize: '12px',
                        fontFamily: 'Helvetica, Arial, sans-serif'
                    }
                },
                states: {
                    hover: {
                        filter: {
                            type: 'lighten',
                            value: 0.1
                        }
                    },
                    active: {
                        filter: {
                            type: 'darken',
                            value: 0.35
                        }
                    }
                }
            }
        };
        // --- Data Smoothing (Averaging) ---
        let averageWindow = 1;
        if (((_e = this.config) === null || _e === void 0 ? void 0 : _e.average_window) && this.config.average_window !== 'off') {
            if (this.config.average_window === '15min')
                averageWindow = 3;
            if (this.config.average_window === '1h')
                averageWindow = 12;
            if (this.config.average_window === '5h')
                averageWindow = 60;
        }
        if (averageWindow > 1 && this._hass) {
            if (Array.isArray(apexChartCardConfig.series)) {
                apexChartCardConfig.series = apexChartCardConfig.series.map((s) => {
                    const stateObj = this._hass.states[s.entity];
                    if (stateObj) {
                        const val = parseFloat(stateObj.state);
                        const dataArr = Array(60).fill(val); // Simulate 60 points
                        return { ...s, data: gaussianSmooth(dataArr, averageWindow) };
                    }
                    return s;
                });
            }
        }
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
        console.log("Executing _updateCharts: Updating chart elements.");
        if (!this._hass || this._isLoading || this._apexChartCardRegistered === false) {
            console.log("Skipping _updateCharts: Hass not ready, loading, or apexcharts-card not registered.");
            return;
        }
        // Always reload selected entities to ensure we have the latest selection
        this._loadSelectedEntities();
        const powerChartContainer = this._root.querySelector('.power-chart-placeholder');
        if (powerChartContainer) {
            // Check for existing apexcharts-card element
            const existingPowerChart = powerChartContainer.querySelector('apexcharts-card');
            if (existingPowerChart) {
                console.log("Refreshing existing power chart.");
                // Generate updated chart config with latest entity selections
                const updatedChartConfig = this._generateApexchartsConfig(this._powerEntities, false);
                if (updatedChartConfig) {
                    // Update the chart config with latest entity selections
                    try {
                        existingPowerChart.setConfig(updatedChartConfig);
                        existingPowerChart.hass = this._hass;
                    }
                    catch (err) {
                        console.warn("Failed to update chart config:", err);
                    }
                }
            }
            else {
                console.log("Creating new power chart (no existing chart found).");
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
                    console.log("Creating initial power chart (fallback).");
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
                // Check for existing apexcharts-card element
                const existingEnergyChart = energyChartContainer.querySelector('apexcharts-card');
                if (existingEnergyChart) {
                    console.log("Refreshing existing energy chart.");
                    // Generate updated chart config with latest entity selections
                    const updatedChartConfig = this._generateApexchartsConfig(this._energyEntities, true);
                    if (updatedChartConfig) {
                        // Update the chart config with latest entity selections
                        try {
                            existingEnergyChart.setConfig(updatedChartConfig);
                            existingEnergyChart.hass = this._hass;
                        }
                        catch (err) {
                            console.warn("Failed to update chart config:", err);
                        }
                    }
                }
                else {
                    console.log("Creating new energy chart (no existing chart found).");
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
                        console.log("Creating initial energy chart (fallback).");
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
        // Clear previous content
        card.innerHTML = '';
        // Reset any previous inline styles
        card.style.paddingTop = '';
        if (this.config.show_header) {
            const header = document.createElement('div');
            header.className = 'card-header';
            header.textContent = this.config.title;
            card.appendChild(header);
        }
        else {
            // Add padding to the top of the card when header is disabled
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
        // --- Controls Layout Container ---
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls-container';
        // Helper to create a group
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
        // Create controls
        const refreshControls = this._createRefreshRatePillControls();
        const timeRangeControls = this._createTimeRangeControls();
        const yAxisControls = this._createYAxisControls();
        const averagingControls = this._createAveragingControls();
        // Ensure pill-row gap is 0
        [refreshControls, timeRangeControls, yAxisControls, averagingControls].forEach(row => {
            row.style.gap = '0';
            row.style.margin = '0';
            row.style.padding = '0';
        });
        // Add groups to container
        controlsContainer.appendChild(createGroup('Refresh Rate', refreshControls));
        controlsContainer.appendChild(createGroup('Time Range', timeRangeControls));
        controlsContainer.appendChild(createGroup('Max Range', yAxisControls));
        controlsContainer.appendChild(createGroup('Smoothing', averagingControls));
        // Add the controls container to the card
        card.appendChild(controlsContainer);
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        chartContainer.style.width = '100%';
        chartContainer.style.display = 'flex';
        chartContainer.style.flexDirection = 'column';
        chartContainer.style.marginTop = '8px';
        // Load the view mode from localStorage (in case it changed)
        this._viewMode = this._loadViewMode();
        // Only show the appropriate chart based on view mode
        if (this._viewMode === 'power' || !this.config.show_energy_section) {
            // Power chart section
            chartContainer.appendChild(this._renderSectionTitle('Power Consumption'));
            const powerPlaceholder = document.createElement('div');
            powerPlaceholder.className = 'power-chart-placeholder';
            chartContainer.appendChild(powerPlaceholder);
            this._powerChartEl = null;
            // Reset energy chart element so it doesn't get updated
            this._energyChartEl = null;
        }
        else if (this._viewMode === 'energy' && this.config.show_energy_section) {
            // Energy chart section
            chartContainer.appendChild(this._renderSectionTitle('Energy Consumption', true));
            const energyPlaceholder = document.createElement('div');
            energyPlaceholder.className = 'energy-chart-placeholder';
            chartContainer.appendChild(energyPlaceholder);
            this._energyChartEl = null;
            // Reset power chart element so it doesn't get updated
            this._powerChartEl = null;
        }
        card.appendChild(chartContainer);
        setTimeout(() => this._updateCharts(), 0);
        setTimeout(() => this._startUpdateInterval(), 50);
        setTimeout(() => {
            this._updateRefreshRatePillControlsUI();
            this._updateTimeRangeControlsUI();
            this._updateYAxisControlsUI();
            this._updateAveragingControlsUI();
        }, 100);
    }
    _setRefreshInterval(seconds) {
        console.log(`Setting refresh interval to: ${seconds} seconds`);
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
        console.log("Manual refresh triggered.");
        this._updateCharts();
    }
    _createRefreshRatePillControls() {
        const container = document.createElement('div');
        container.className = 'refresh-rate-controls pill-row';
        // Manual refresh button as first pill
        const manualBtn = document.createElement('button');
        manualBtn.className = 'pill-control refresh-rate-button manual-refresh';
        manualBtn.innerHTML = '<ha-icon icon="mdi:refresh"></ha-icon>';
        manualBtn.title = 'Manual Refresh';
        manualBtn.addEventListener('click', () => this._manualRefresh());
        container.appendChild(manualBtn);
        // Off option as second pill
        const offBtn = document.createElement('button');
        offBtn.className = 'pill-control refresh-rate-button';
        offBtn.textContent = 'Off';
        offBtn.dataset.rate = '0';
        offBtn.style.borderRadius = '0';
        offBtn.style.marginLeft = '-1px';
        offBtn.addEventListener('click', () => this._setRefreshInterval(0));
        container.appendChild(offBtn);
        // Add other refresh rate options (5s, 15s, 30s, 60s)
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
        // Get all buttons including the manual refresh button
        const buttons = controls.querySelectorAll('.refresh-rate-button');
        // Reset all buttons to default state
        buttons.forEach(btn => {
            const button = btn;
            button.classList.remove('active'); // Remove active from all
            button.style.backgroundColor = 'var(--card-background-color, white)';
            button.style.color = 'var(--primary-text-color, #212121)';
            button.style.borderColor = 'var(--divider-color, #e0e0e0)';
        });
        // Find the active button by rate value (skip manual refresh which has no rate)
        const activeRate = this._currentRefreshInterval.toString();
        const activeButton = Array.from(buttons).find(btn => {
            const button = btn;
            return button.dataset.rate === activeRate;
        });
        // Apply active styling if found
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
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const controls = container || this._root.querySelector('.y-axis-controls');
        if (!controls)
            return;
        // Get the current max value based on the view mode
        const isEnergy = this._viewMode === 'energy';
        const currentMax = isEnergy
            ? ((_d = (_c = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.energy_chart_options) === null || _b === void 0 ? void 0 : _b.y_axis) === null || _c === void 0 ? void 0 : _c.max) !== null && _d !== void 0 ? _d : 'auto')
            : ((_h = (_g = (_f = (_e = this.config) === null || _e === void 0 ? void 0 : _e.power_chart_options) === null || _f === void 0 ? void 0 : _f.y_axis) === null || _g === void 0 ? void 0 : _g.max) !== null && _h !== void 0 ? _h : 'auto');
        // Convert to string for comparison with button data attribute
        const currentMaxStr = currentMax === undefined ? 'auto' : String(currentMax);
        const buttons = controls.querySelectorAll('.yaxis-button');
        buttons.forEach(btn => {
            const button = btn;
            button.classList.remove('active');
            button.style.backgroundColor = 'var(--card-background-color, white)'; // Changed from secondary-background-color
            button.style.color = 'var(--primary-text-color, #212121)';
            button.style.borderColor = 'var(--divider-color, #e0e0e0)';
        });
        // Find the active button by its data-yaxis attribute
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
        // Get current view mode
        const isEnergy = this._viewMode === 'energy';
        // Update config based on current view mode
        if (isEnergy) {
            if (!this.config.energy_chart_options) {
                this.config.energy_chart_options = { y_axis: {} };
            }
            if (!this.config.energy_chart_options.y_axis) {
                this.config.energy_chart_options.y_axis = {};
            }
            // Set max to number or undefined for auto
            this.config.energy_chart_options.y_axis.max =
                maxValue === 'auto' ? undefined : Number(maxValue);
        }
        else {
            if (!this.config.power_chart_options) {
                this.config.power_chart_options = { y_axis: {} };
            }
            if (!this.config.power_chart_options.y_axis) {
                this.config.power_chart_options.y_axis = {};
            }
            // Set max to number or undefined for auto
            this.config.power_chart_options.y_axis.max =
                maxValue === 'auto' ? undefined : Number(maxValue);
        }
        // Update the UI to show the active button
        this._updateYAxisControlsUI();
        // Refresh the chart to apply new Y-axis setting
        this._updateCharts();
        console.log(`Set Y-axis max to ${maxValue} for ${isEnergy ? 'energy' : 'power'} chart`);
    }
    _createAveragingControls() {
        const averagingContainer = document.createElement('div');
        averagingContainer.className = 'averaging-controls pill-row';
        averagingContainer.style.display = 'flex';
        averagingContainer.style.justifyContent = 'center';
        averagingContainer.style.alignItems = 'center';
        averagingContainer.style.gap = '0';
        averagingContainer.style.height = '26px';
        averagingContainer.style.padding = '0';
        const averagingOptions = [
            { label: 'Off', value: 'off' },
            { label: '15m', value: '15min' },
            { label: '1h', value: '1h' },
            { label: '5h', value: '5h' }
        ];
        averagingOptions.forEach((option, index) => {
            var _a, _b;
            const btn = document.createElement('button');
            btn.className = 'pill-control averaging-button';
            btn.textContent = option.label;
            btn.dataset.value = option.value;
            btn.style.borderRadius =
                index === 0 ? '16px 0 0 16px' :
                    index === averagingOptions.length - 1 ? '0 16px 16px 0' : '0';
            btn.style.marginLeft = index > 0 ? '-1px' : '0';
            btn.style.minWidth = '40px';
            btn.style.height = '26px';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            btn.style.fontSize = '0.9em';
            btn.style.border = '1px solid var(--divider-color, #e0e0e0)';
            btn.style.backgroundColor = 'var(--card-background-color, white)';
            btn.style.color = 'var(--primary-text-color)';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'all 0.2s';
            btn.style.padding = '0';
            if (((_a = this.config) === null || _a === void 0 ? void 0 : _a.average_window) === option.value || (!((_b = this.config) === null || _b === void 0 ? void 0 : _b.average_window) && option.value === 'off')) {
                btn.style.backgroundColor = 'var(--primary-color, #03a9f4)';
                btn.style.color = 'var(--text-primary-color, #fff)';
                btn.style.borderColor = 'var(--primary-color, #03a9f4)';
            }
            btn.addEventListener('click', () => {
                if (this.config) {
                    this.config.average_window = option.value;
                    this._updateCharts();
                    this._updateAveragingControlsUI(averagingContainer);
                }
            });
            averagingContainer.appendChild(btn);
        });
        return averagingContainer;
    }
    _updateAveragingControlsUI(container) {
        var _a;
        const controls = container || this._root.querySelector('.averaging-controls');
        if (!controls)
            return;
        const buttons = controls.querySelectorAll('.averaging-button');
        buttons.forEach(btn => {
            const button = btn;
            button.classList.remove('active');
            button.style.backgroundColor = 'var(--card-background-color, white)';
            button.style.color = 'var(--primary-text-color, #212121)';
            button.style.borderColor = 'var(--divider-color, #e0e0e0)';
        });
        const activeValue = ((_a = this.config) === null || _a === void 0 ? void 0 : _a.average_window) || 'off';
        const activeButton = controls.querySelector(`.averaging-button[data-value="${activeValue}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
            activeButton.style.backgroundColor = 'var(--primary-color, #03a9f4)';
            activeButton.style.color = 'var(--text-primary-color, #fff)';
            activeButton.style.borderColor = 'var(--primary-color, #03a9f4)';
        }
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
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const container = document.createElement('div');
        container.className = 'y-axis-controls pill-row';
        const yAxisPresets = [
            { label: 'Auto', value: 'auto' },
            { label: '500', value: '500' },
            { label: '3000', value: '3000' },
            { label: '9000', value: '9000' }
        ];
        const isEnergy = this._viewMode === 'energy';
        const currentMax = isEnergy
            ? ((_d = (_c = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.energy_chart_options) === null || _b === void 0 ? void 0 : _b.y_axis) === null || _c === void 0 ? void 0 : _c.max) !== null && _d !== void 0 ? _d : 'auto')
            : ((_h = (_g = (_f = (_e = this.config) === null || _e === void 0 ? void 0 : _e.power_chart_options) === null || _f === void 0 ? void 0 : _f.y_axis) === null || _g === void 0 ? void 0 : _g.max) !== null && _h !== void 0 ? _h : 'auto');
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
    // Check if apexcharts-card is registered as a custom element
    _checkApexChartsRegistration() {
        // Check if apexcharts-card is registered as a custom element
        const isRegistered = customElements.get('apexcharts-card') !== undefined;
        if (isRegistered) {
            console.log('apexcharts-card is registered as a custom element');
            this._apexChartCardRegistered = true;
        }
        else {
            console.warn('apexcharts-card is not registered as a custom element');
            this._apexChartCardRegistered = false;
        }
        // Update content once we know the status
        if (!this._isLoading) {
            this._updateContent();
        }
    }
}
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
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
            energy_auto_select_count: (_l = config.energy_auto_select_count) !== null && _l !== void 0 ? _l : 6,
            show_legend: (_m = config.show_legend) !== null && _m !== void 0 ? _m : true,
        };
        this._updateForm();
    }
    _updateForm() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
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
        // Chart Type
        const chartTypeRow = document.createElement('div');
        chartTypeRow.className = 'row';
        const chartTypeLabel = document.createElement('div');
        chartTypeLabel.textContent = 'Chart Type';
        const chartTypeSelect = document.createElement('select');
        chartTypeSelect.className = 'value';
        const chartTypes = ['line', 'area', 'bar'];
        chartTypes.forEach(type => {
            var _a;
            const option = document.createElement('option');
            option.value = type;
            option.text = type.charAt(0).toUpperCase() + type.slice(1);
            option.selected = ((_a = this.config) === null || _a === void 0 ? void 0 : _a.chart_type) === type;
            chartTypeSelect.appendChild(option);
        });
        chartTypeSelect.addEventListener('change', (e) => {
            this.config = { ...this.config, chart_type: e.target.value };
            this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
        });
        chartTypeRow.appendChild(chartTypeLabel);
        chartTypeRow.appendChild(chartTypeSelect);
        chartAppearance.appendChild(chartTypeRow);
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
        strokeWidthInput.step = '1';
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
        powerYTitleField.value = ((_h = (_g = this.config.power_chart_options) === null || _g === void 0 ? void 0 : _g.y_axis) === null || _h === void 0 ? void 0 : _h.title) || 'Power';
        powerYTitleField.configValue = 'power_chart_options.y_axis.title';
        powerYTitleField.addEventListener('change', this.valueChanged);
        powerYTitleRow.appendChild(powerYTitleField);
        form.appendChild(powerYTitleRow);
        // Power Y-Axis Unit
        const powerYUnitRow = this._createRow();
        const powerYUnitField = document.createElement('ha-textfield');
        powerYUnitField.className = 'value';
        powerYUnitField.label = 'Y-Axis Unit';
        powerYUnitField.value = ((_k = (_j = this.config.power_chart_options) === null || _j === void 0 ? void 0 : _j.y_axis) === null || _k === void 0 ? void 0 : _k.unit) || 'W';
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
        powerYDecimalsField.value = String((_o = (_m = (_l = this.config.power_chart_options) === null || _l === void 0 ? void 0 : _l.y_axis) === null || _m === void 0 ? void 0 : _m.decimals) !== null && _o !== void 0 ? _o : 1);
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
        powerYMinField.value = ((_q = (_p = this.config.power_chart_options) === null || _p === void 0 ? void 0 : _p.y_axis) === null || _q === void 0 ? void 0 : _q.min) !== undefined ?
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
        powerYMaxField.value = ((_s = (_r = this.config.power_chart_options) === null || _r === void 0 ? void 0 : _r.y_axis) === null || _s === void 0 ? void 0 : _s.max) !== undefined ?
            String(this.config.power_chart_options.y_axis.max) : '';
        powerYMaxField.configValue = 'power_chart_options.y_axis.max';
        powerYMaxField.addEventListener('change', this.valueChanged);
        powerYMaxRow.appendChild(powerYMaxField);
        form.appendChild(powerYMaxRow);
        // SECTION: Energy Chart Settings - Always shown now
        this._addSectionTitle(form, 'Energy Chart Y-Axis Settings');
        // Energy Y-Axis Title
        const energyYTitleRow = this._createRow();
        const energyYTitleField = document.createElement('ha-textfield');
        energyYTitleField.className = 'value';
        energyYTitleField.label = 'Y-Axis Title';
        energyYTitleField.value = ((_u = (_t = this.config.energy_chart_options) === null || _t === void 0 ? void 0 : _t.y_axis) === null || _u === void 0 ? void 0 : _u.title) || 'Energy';
        energyYTitleField.configValue = 'energy_chart_options.y_axis.title';
        energyYTitleField.addEventListener('change', this.valueChanged);
        energyYTitleRow.appendChild(energyYTitleField);
        form.appendChild(energyYTitleRow);
        // Energy Y-Axis Unit
        const energyYUnitRow = this._createRow();
        const energyYUnitField = document.createElement('ha-textfield');
        energyYUnitField.className = 'value';
        energyYUnitField.label = 'Y-Axis Unit';
        energyYUnitField.value = ((_w = (_v = this.config.energy_chart_options) === null || _v === void 0 ? void 0 : _v.y_axis) === null || _w === void 0 ? void 0 : _w.unit) || 'kWh';
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
        energyYDecimalsField.value = String((_z = (_y = (_x = this.config.energy_chart_options) === null || _x === void 0 ? void 0 : _x.y_axis) === null || _y === void 0 ? void 0 : _y.decimals) !== null && _z !== void 0 ? _z : 2);
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
        energyYMinField.value = ((_1 = (_0 = this.config.energy_chart_options) === null || _0 === void 0 ? void 0 : _0.y_axis) === null || _1 === void 0 ? void 0 : _1.min) !== undefined ?
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
        energyYMaxField.value = ((_3 = (_2 = this.config.energy_chart_options) === null || _2 === void 0 ? void 0 : _2.y_axis) === null || _3 === void 0 ? void 0 : _3.max) !== undefined ?
            String(this.config.energy_chart_options.y_axis.max) : '';
        energyYMaxField.configValue = 'energy_chart_options.y_axis.max';
        energyYMaxField.addEventListener('change', this.valueChanged);
        energyYMaxRow.appendChild(energyYMaxField);
        form.appendChild(energyYMaxRow);
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
