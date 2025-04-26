import { LitElement, html, css, PropertyValues, TemplateResult, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { EntityInfo, EnergyDashboardConfig } from './types';
import { getPowerEntities, getEnergyEntities, loadToggleStates, saveToggleStates } from './entity-utils';

// Import the styles - converted to Lit CSS
const styles = css`
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
    gap: min(4px, 1%);
  }
  .control-button, .select-all-button {
    background-color: var(--card-background-color, white);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    padding: 2px 6px;
    color: var(--primary-text-color);
    font-size: 0.8em;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    flex: 1;
    margin: 0;
    box-shadow: none;
    min-height: 22px;
    max-height: 22px;
    box-sizing: border-box;
    white-space: nowrap;
    overflow: hidden;
    line-height: 1;
  }
  .control-button:hover, .select-all-button:hover {
    background-color: var(--primary-color);
    color: var(--text-primary-color);
  }
  .control-button ha-icon, .select-all-button ha-icon {
    margin-right: 3px;
    margin-bottom: 0px;
    --mdc-icon-size: 14px;
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
    box-sizing: border-box;
    width: 100%;
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
    box-sizing: border-box;
    flex-grow: 1;
    flex-shrink: 0;
    width: 100%;
    margin-bottom: 2px;
    border: 1px solid var(--divider-color, #e0e0e0);
  }
  .entity-item:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }
  .entity-item.on {
    border: 2px solid var(--entity-selected-border-color, var(--primary-color));
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
    min-width: 45px;
    max-width: 45px;
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
  
  /* Mode toggle styles */
  .mode-toggle-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 8px;
    margin-bottom: 8px;
    padding: 4px;
  }
  .toggle-wrapper {
    display: flex;
    position: relative;
    border: 1px solid var(--divider-color);
    border-radius: 25px;
    height: 30px;
    width: 200px;
    background-color: var(--card-background-color);
    overflow: hidden;
  }
  .active-background {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50%;
    background-color: var(--primary-color);
    border-radius: 25px;
    transition: left 0.3s ease-in-out;
    opacity: 0.2;
  }
  .toggle-option {
    flex: 1;
    text-align: center;
    line-height: 30px;
    cursor: pointer;
    z-index: 1;
    transition: all 0.3s ease;
  }
  
  /* Persistence toggle styles */
  .persistence-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 12px;
    margin-bottom: 12px;
    padding: 4px 16px;
    cursor: pointer;
    background-color: var(--card-background-color, white);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
  }
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
    vertical-align: middle;
  }
  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 34px;
    transition: .4s;
  }
  .toggle-button {
    position: absolute;
    height: 16px;
    width: 16px;
    bottom: 2px;
    background-color: white;
    border-radius: 50%;
    transition: .4s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
`;

@customElement('energy-dashboard-entity-card')
export class EnergyDashboardEntityCard extends LitElement {
  @property({ attribute: false }) hass: any;
  @property({ attribute: false }) config: EnergyDashboardConfig | undefined;
  
  @state() powerEntities: EntityInfo[] = [];
  @state() energyEntities: EntityInfo[] = [];
  @state() entityToggleStates: Record<string, boolean> = {};
  @state() energyEntityToggleStates: Record<string, boolean> = {};
  @state() viewMode: 'power' | 'energy' = 'power';
  
  private _initialized = false;
  private _energyInitialized = false;
  private powerScrollPosition = 0;
  private energyScrollPosition = 0;
  
  // Used for tracking containers in the DOM
  private powerContainerRef?: HTMLDivElement;
  private energyContainerRef?: HTMLDivElement;
  
  // Lifecycle callbacks
  connectedCallback(): void {
    super.connectedCallback();
    
    // Load view mode from localStorage
    this.viewMode = this._loadViewMode();
    
    // Load persistence setting from localStorage when element is connected to DOM
    if (this.config) {
      this.config.persist_selection = this._loadPersistenceState();
    }
  }
  
  // HA Config
  setConfig(config: EnergyDashboardConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }

    // Load persistence setting from localStorage first
    const persistenceFromStorage = this._loadPersistenceState();

    // Create a merged config object correctly by spreading config first
    this.config = {
      ...config,
      // Then set defaults only for missing properties
      title: config.title ?? 'Energy Dashboard',
      show_header: config.show_header ?? true,
      show_state: config.show_state ?? true,
      show_toggle: config.show_toggle ?? true,
      auto_select_count: config.auto_select_count ?? 6,
      max_height: config.max_height ?? 400,
      energy_auto_select_count: config.energy_auto_select_count ?? 6,
      // Use the stored value as priority for persistence setting
      persist_selection: persistenceFromStorage,
      // Always enable energy section
      show_energy_section: true,
      view_mode: this.viewMode,
    };
  }
  
  updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    
    // Save scroll positions after rendering
    if (this.powerContainerRef && this.viewMode === 'power') {
      this.powerContainerRef.scrollTop = this.powerScrollPosition;
    }
    if (this.energyContainerRef && this.viewMode === 'energy') {
      this.energyContainerRef.scrollTop = this.energyScrollPosition;
    }
  }
  
  static get cardType(): string {
    return 'energy-dashboard-entity-card';
  }
  
  static get displayName(): string {
    return 'Energy Dashboard Entity Card';
  }
  
  static get description(): string {
    return 'Card to select and display power and energy entities';
  }
  
  static get icon(): string {
    return 'mdi:lightning-bolt';
  }
  
  static getConfigElement(): HTMLElement {
    return document.createElement('energy-dashboard-entity-card-editor');
  }
  
  static getStubConfig(): object {
    return {
      title: 'Energy Dashboard',
      show_header: true,
      show_state: true,
      show_toggle: true,
      auto_select_count: 6,
      max_height: 400,
      energy_auto_select_count: 6,
      persist_selection: true
    };
  }
  
  getCardSize(): number {
    let rows = 0;

    if (this.powerEntities && this.powerEntities.length > 0) {
      rows += this.powerEntities.length * 0.7;
      rows += 2;
    }

    if (this.config?.show_energy_section && this.energyEntities && this.energyEntities.length > 0) {
      rows += this.energyEntities.length * 0.7;
      rows += 2;
    }

    return rows > 0 ? rows : 1;
  }
  
  // Home Assistant callback when entities are updated
  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    
    // Save scroll positions before updating
    if (this.powerContainerRef) {
      this.powerScrollPosition = this.powerContainerRef.scrollTop;
    }
    if (this.energyContainerRef) {
      this.energyScrollPosition = this.energyContainerRef.scrollTop;
    }
    
    if (changedProperties.has('hass')) {
      this._updateEntities();
    }
  }
  
  // Entity state management
  private _updateEntities(): void {
    if (!this.hass) return;

    try {
      this._updatePowerEntities();
      if (this.config?.show_energy_section) {
        this._updateEnergyEntities();
      }
    } catch (e) {
      console.error("Error updating entities:", e);
    }
  }
  
  private _updatePowerEntities(): void {
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
  
  private _updateEnergyEntities(): void {
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
  
  private _initializePowerToggleStates(entities: EntityInfo[]): void {
    // Only load saved states if persistence is enabled
    const persistenceEnabled = this.config?.persist_selection ?? true;
    const savedStates = persistenceEnabled ? loadToggleStates('energy-dashboard-power-toggle-states') : null;

    if (savedStates && Object.keys(savedStates).length > 0) {
      this.entityToggleStates = savedStates;
    } else {
      // Create a new toggle states object
      const toggleStates: Record<string, boolean> = {};

      // Get auto_select_count from config, or use default of 6
      const count = this.config?.auto_select_count ?? 6;

      // Initialize all entities first to ensure they're tracked
      entities.forEach(entity => {
        // Set to false by default
        toggleStates[entity.entityId] = false;
      });

      // Then set the first `count` entities to true
      entities.slice(0, count).forEach(entity => {
        toggleStates[entity.entityId] = true;
      });

      this.entityToggleStates = toggleStates;
    }
  }
  
  private _initializeEnergyToggleStates(entities: EntityInfo[]): void {
    // Only load saved states if persistence is enabled
    const persistenceEnabled = this.config?.persist_selection ?? true;
    const savedStates = persistenceEnabled ? loadToggleStates('energy-dashboard-energy-toggle-states') : null;

    if (savedStates && Object.keys(savedStates).length > 0) {
      this.energyEntityToggleStates = savedStates;
    } else {
      // Create a new toggle states object
      const toggleStates: Record<string, boolean> = {};

      // Get energy_auto_select_count from config, or use default of 6
      const count = this.config?.energy_auto_select_count ?? 6;

      // Initialize all entities first to ensure they're tracked
      entities.forEach(entity => {
        // Set to false by default
        toggleStates[entity.entityId] = false;
      });

      // Then set the first `count` entities to true
      entities.slice(0, count).forEach(entity => {
        toggleStates[entity.entityId] = true;
      });

      this.energyEntityToggleStates = toggleStates;
    }
  }
  
  // Entity selection persistence
  private _savePowerToggleStates(): void {
    // Always save toggle states to localStorage for the chart card to access, 
    // but they will only be loaded on initialization if persistence is enabled
    saveToggleStates(this.entityToggleStates, 'energy-dashboard-power-toggle-states');
  }

  private _saveEnergyToggleStates(): void {
    // Always save toggle states to localStorage for the chart card to access,
    // but they will only be loaded on initialization if persistence is enabled
    saveToggleStates(this.energyEntityToggleStates, 'energy-dashboard-energy-toggle-states');
  }

  // Entity control button handlers
  private _resetToPowerDefaultEntities(): void {
    // Get current entities
    const entities = getPowerEntities(this.hass);

    // Create a new toggle state object
    const toggleStates: Record<string, boolean> = {};
    const count = this.config?.auto_select_count ?? 6;

    // Set first 'count' entities to true, all others to false
    entities.forEach((entity, index) => {
      toggleStates[entity.entityId] = index < count;
    });

    // Update the toggle states
    this.entityToggleStates = {...toggleStates};
    this._savePowerToggleStates();
    this._updatePowerEntities();
  }

  private _clearAllPowerEntities(): void {
    const entities = getPowerEntities(this.hass);
    const newToggleStates: Record<string, boolean> = {};

    // Set all entity toggle states to false
    entities.forEach(entity => {
      newToggleStates[entity.entityId] = false;
    });

    this.entityToggleStates = {...newToggleStates};
    this._savePowerToggleStates();
    this._updatePowerEntities();
  }

  private _selectAllPowerEntities(): void {
    const entities = getPowerEntities(this.hass);
    const newToggleStates: Record<string, boolean> = {};

    // Set all entity toggle states to true
    entities.forEach(entity => {
      newToggleStates[entity.entityId] = true;
    });

    this.entityToggleStates = {...newToggleStates};
    this._savePowerToggleStates();
    this._updatePowerEntities();
  }

  private _togglePowerEntity(entityId: string): void {
    // Create a new object so lit detects the change
    const newToggleStates = {...this.entityToggleStates};
    newToggleStates[entityId] = !newToggleStates[entityId];
    
    this.entityToggleStates = newToggleStates;
    this._updatePowerEntities();
  }

  private _resetToEnergyDefaultEntities(): void {
    // Get current energy entities
    const entities = getEnergyEntities(this.hass);

    // Create a new toggle state object
    const toggleStates: Record<string, boolean> = {};
    const count = this.config?.energy_auto_select_count ?? 6;

    // Set first 'count' entities to true, all others to false
    entities.forEach((entity, index) => {
      toggleStates[entity.entityId] = index < count;
    });

    // Update the toggle states
    this.energyEntityToggleStates = {...toggleStates};
    this._saveEnergyToggleStates();
    this._updateEnergyEntities();
  }

  private _clearAllEnergyEntities(): void {
    const entities = getEnergyEntities(this.hass);
    const newToggleStates: Record<string, boolean> = {};

    // Set all entity toggle states to false
    entities.forEach(entity => {
      newToggleStates[entity.entityId] = false;
    });

    this.energyEntityToggleStates = {...newToggleStates};
    this._saveEnergyToggleStates();
    this._updateEnergyEntities();
  }

  private _selectAllEnergyEntities(): void {
    const entities = getEnergyEntities(this.hass);
    const newToggleStates: Record<string, boolean> = {};

    // Set all entity toggle states to true
    entities.forEach(entity => {
      newToggleStates[entity.entityId] = true;
    });

    this.energyEntityToggleStates = {...newToggleStates};
    this._saveEnergyToggleStates();
    this._updateEnergyEntities();
  }

  private _toggleEnergyEntity(entityId: string): void {
    // Create a new object so lit detects the change
    const newToggleStates = {...this.energyEntityToggleStates};
    newToggleStates[entityId] = !newToggleStates[entityId];
    
    this.energyEntityToggleStates = newToggleStates;
    this._updateEnergyEntities();
  }

  // Persistence toggle handling
  private _togglePersistence(): void {
    if (this.config) {
      // Toggle the persistence setting
      const newPersistState = !this.config.persist_selection;
      this.config = {
        ...this.config,
        persist_selection: newPersistState
      };

      // Always save the persistence toggle state, regardless of its value
      this._savePersistenceState(newPersistState);

      // If persistence is turned off, clear localStorage and reset to defaults immediately
      if (!newPersistState) {
        localStorage.removeItem('energy-dashboard-power-toggle-states');
        localStorage.removeItem('energy-dashboard-energy-toggle-states');

        // Reset initialized state to force reload of default entities
        this._initialized = false;
        this._energyInitialized = false;
      } else {
        // If persistence is turned on, save the current toggle states
        this._savePowerToggleStates();
        this._saveEnergyToggleStates();
      }

      // Re-initialize and update the content with new settings
      this._updateEntities();
      this.requestUpdate();
    }
  }

  // Manage the persistence toggle setting separately
  private _loadPersistenceState(): boolean {
    try {
      const stored = localStorage.getItem('energy-dashboard-persistence-toggle');
      return stored === null ? true : stored === 'true';
    } catch {
      return true; // Default to true if we can't load from localStorage
    }
  }

  private _savePersistenceState(persist: boolean): void {
    try {
      localStorage.setItem('energy-dashboard-persistence-toggle', String(persist));
    } catch (e) {
      console.error("Failed to save persistence state:", e);
    }
  }

  // View mode management
  private _saveViewMode(mode: 'power' | 'energy'): void {
    try {
      localStorage.setItem('energy-dashboard-view-mode', mode);
      
      // Also update config to keep it in sync
      if (this.config) {
        this.config.view_mode = mode;
      }
    } catch (e) {
      console.error("Failed to save view mode:", e);
    }
  }

  private _loadViewMode(): 'power' | 'energy' {
    try {
      const stored = localStorage.getItem('energy-dashboard-view-mode');
      return (stored === 'power' || stored === 'energy') ? stored : 'power';
    } catch {
      return 'power'; // Default to power view if we can't load from localStorage
    }
  }

  private _toggleViewMode(): void {
    // Save current scroll position before changing views
    if (this.viewMode === 'power' && this.powerContainerRef) {
      this.powerScrollPosition = this.powerContainerRef.scrollTop;
    } else if (this.viewMode === 'energy' && this.energyContainerRef) {
      this.energyScrollPosition = this.energyContainerRef.scrollTop;
    }
    
    const newMode = this.viewMode === 'power' ? 'energy' : 'power';
    this.viewMode = newMode;
    this._saveViewMode(newMode);

    // Dispatch a custom event that the chart card can listen for
    this.dispatchEvent(new CustomEvent('view-mode-changed', {
      detail: { mode: newMode },
      bubbles: true,
      composed: true
    }));
    
    // Request an update to ensure the new view renders
    this.requestUpdate();
  }
  
  // Event handler helper to get the right event target
  private _handleEntityClick(_e: Event, entityId: string, isPower: boolean): void {
    if (isPower) {
      this._togglePowerEntity(entityId);
    } else {
      this._toggleEnergyEntity(entityId);
    }
  }
  
  // Template rendering - mode toggle
  private renderModeToggle(): TemplateResult {
    return html`
      <div class="mode-toggle-container">
        <div class="toggle-wrapper">
          <div 
            class="active-background"
            style=${styleMap({
              left: this.viewMode === 'power' ? '0' : '50%'
            })}
          ></div>
          <div 
            class="toggle-option"
            style=${styleMap({
              fontWeight: this.viewMode === 'power' ? 'bold' : 'normal',
              color: this.viewMode === 'power' 
                ? 'var(--primary-text-color)' 
                : 'var(--secondary-text-color)'
            })}
            @click=${() => this.viewMode !== 'power' && this._toggleViewMode()}
          >
            Power
          </div>
          <div 
            class="toggle-option"
            style=${styleMap({
              fontWeight: this.viewMode === 'energy' ? 'bold' : 'normal',
              color: this.viewMode === 'energy' 
                ? 'var(--primary-text-color)' 
                : 'var(--secondary-text-color)'
            })}
            @click=${() => this.viewMode !== 'energy' && this._toggleViewMode()}
          >
            Energy
          </div>
        </div>
      </div>
    `;
  }
  
  // Template rendering - control buttons
  private renderControlButtons(isPower: boolean): TemplateResult {
    return html`
      <div class="control-buttons">
        <button 
          class="control-button"
          @click=${isPower ? 
            () => this._resetToPowerDefaultEntities() : 
            () => this._resetToEnergyDefaultEntities()}
        >
          <ha-icon icon="mdi:refresh"></ha-icon>
          <span>Reset</span>
        </button>
        
        <button 
          class="control-button"
          @click=${isPower ? 
            () => this._clearAllPowerEntities() : 
            () => this._clearAllEnergyEntities()}
        >
          <ha-icon icon="mdi:close-circle-outline"></ha-icon>
          <span>Clear</span>
        </button>
        
        <button 
          class="select-all-button"
          @click=${isPower ? 
            () => this._selectAllPowerEntities() : 
            () => this._selectAllEnergyEntities()}
        >
          <ha-icon icon="mdi:check-circle-outline"></ha-icon>
          <span>All</span>
        </button>
      </div>
    `;
  }
  
  // Template rendering - persistence toggle
  private renderPersistenceToggle(): TemplateResult {
    return html`
      <div class="persistence-toggle" @click=${this._togglePersistence}>
        <span style="margin-right: 8px; font-size: 14px; color: var(--primary-text-color)">
          Remember Selection: 
        </span>
        <span class="toggle-switch">
          <span 
            class="toggle-slider"
            style=${styleMap({
              backgroundColor: this.config?.persist_selection ? 
                'var(--primary-color, #03a9f4)' : '#ccc'
            })}
          >
            <span 
              class="toggle-button"
              style=${styleMap({
                left: this.config?.persist_selection ? '16px' : '4px'
              })}
            ></span>
          </span>
        </span>
      </div>
    `;
  }
  
  // Template rendering - entity item
  private renderEntityItem(entity: EntityInfo, isPower: boolean): TemplateResult {
    // Explicitly set the classes with non-nullable boolean values
    const classes = {
      'entity-item': true,
      'on': Boolean(entity.isOn) // Convert potentially undefined to boolean
    };
    
    return html`
      <div 
        class=${classMap(classes)}
        @click=${(e: Event) => this._handleEntityClick(e, entity.entityId, isPower)}
      >
        <div class="entity-left">
          <div class="entity-name">${entity.name}</div>
        </div>
        <div class="entity-state">
          ${isPower ?
            html`<span class="power-value">
              ${entity.powerValue !== undefined && entity.powerValue >= 1000 ?
                `${(entity.powerValue / 1000).toFixed(1)} kW` :
                `${Math.round(entity.powerValue || 0)} W`}
            </span>` :
            html`<span class="power-value">
              ${(entity.energyValue || 0).toFixed(2)} kWh
            </span>`
          }
        </div>
      </div>
    `;
  }
  
  // Template rendering - entities container
  private renderEntitiesContainer(entities: EntityInfo[], isPower: boolean): TemplateResult {
    const containerStyles = {
      'maxHeight': this.config?.max_height && this.config.max_height > 0 ?
        `${Math.min(this.config.max_height, 400)}px` : 'none',
      'overflowY': this.config?.max_height && this.config.max_height > 0 ?
        'auto' : 'visible'
    };
    
    return html`
      <div 
        class="entities-container"
        style=${styleMap(containerStyles)}
        ${isPower ? 
          this.setContainerRef(true) : 
          this.setContainerRef(false)
        }
      >
        ${entities.length === 0 ?
          html`<div class="empty-message">
            No ${isPower ? 'power' : 'energy'} entities found
          </div>` :
          entities.map(entity => this.renderEntityItem(entity, isPower))
        }
      </div>
    `;
  }
  
  // Helper to create a reference directive for containers
  private setContainerRef(isPower: boolean) {
    return (el: Element) => {
      if (el instanceof HTMLDivElement) {
        if (isPower) {
          this.powerContainerRef = el;
          if (this.powerScrollPosition > 0) {
            requestAnimationFrame(() => {
              if (this.powerContainerRef) {
                this.powerContainerRef.scrollTop = this.powerScrollPosition;
              }
            });
          }
        } else {
          this.energyContainerRef = el;
          if (this.energyScrollPosition > 0) {
            requestAnimationFrame(() => {
              if (this.energyContainerRef) {
                this.energyContainerRef.scrollTop = this.energyScrollPosition;
              }
            });
          }
        }
      }
    };
  }
  
  // Main render method
  static get styles(): CSSResultGroup {
    return styles;
  }
  
  render(): TemplateResult {
    if (!this.config) {
      return html`<ha-card>
        <div class="empty-message">Card not configured</div>
      </ha-card>`;
    }
    
    return html`
      <ha-card>
        ${this.config.show_header ? html`
          <div class="card-header">${this.config.title}</div>
        ` : ''}
        
        ${this.renderModeToggle()}
        
        ${this.viewMode === 'power' ? html`
          <!-- Power Section -->
          ${this.renderControlButtons(true)}
          ${this.renderPersistenceToggle()}
          
          <div class="section-title">Power Entities</div>
          ${this.renderEntitiesContainer(this.powerEntities, true)}
        ` : html`
          <!-- Energy Section -->
          ${this.renderControlButtons(false)}
          ${this.renderPersistenceToggle()}
          
          <div class="section-title">Energy Entities</div>
          ${this.renderEntitiesContainer(this.energyEntities, false)}
        `}
      </ha-card>
    `;
  }
}