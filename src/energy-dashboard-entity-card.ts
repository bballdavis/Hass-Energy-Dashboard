// Import types only for TypeScript compilation - using type imports doesn't generate runtime imports
import { EntityInfo, EnergyDashboardConfig } from './types';
import { getPowerEntities, getEnergyEntities, loadToggleStates, saveToggleStates } from './entity-utils';
import { createStyles, cardStyles } from './styles';
import { loadHaLit, setupLitRenderer } from './ha-lit-import-helper';

// Create a class that extends HTMLElement and uses Home Assistant's lit
export class EnergyDashboardEntityCard extends HTMLElement {
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

  private _root: ShadowRoot;
  _hass: any;
  config: EnergyDashboardConfig | undefined;
  powerEntities: EntityInfo[] = [];
  energyEntities: EntityInfo[] = [];
  entityToggleStates: Record<string, boolean> = {};
  energyEntityToggleStates: Record<string, boolean> = {};
  private _initialized = false;
  private _energyInitialized = false;
  private powerScrollPosition = 0;
  private energyScrollPosition = 0;
  private viewMode: 'power' | 'energy' = 'power';
  private litLoaded = false;
  
  // Used for tracking containers in the DOM
  private powerContainerRef?: HTMLDivElement;
  private energyContainerRef?: HTMLDivElement;
  
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.appendChild(createStyles(cardStyles));
    this.loadLitLibraries();
  }

  // Define the hass property with a setter
  set hass(hass: any) {
    this._hass = hass;
    this._updateEntities();
    this.requestUpdate();
  }
  
  get hass(): any {
    return this._hass;
  }
  
  // Load Lit libraries dynamically at runtime
  async loadLitLibraries() {
    try {
      // Check if we're in Home Assistant
      const isHomeAssistant = window.customElements && 
        window.customElements.get('home-assistant') !== undefined;
      
      if (isHomeAssistant) {
        // Use our helper to load Home Assistant's Lit modules
        const litModules = await loadHaLit().catch((e) => {
          console.warn('Could not load HA Lit modules, falling back to manual rendering:', e);
          return null;
        });
        
        if (litModules) {
          // Set up our renderer with the loaded modules
          setupLitRenderer(litModules);
          this.litLoaded = true;
          this.requestUpdate();
        } else {
          console.warn('Failed to load Lit modules, falling back to manual rendering');
        }
      } else {
        // Fallback for development
        console.warn('Not running in Home Assistant, using fallback rendering');
      }
    } catch (e) {
      console.error('Failed to load Lit libraries:', e);
    }
  }
  
  // Method to request updates (will be overridden by Lit when available)
  requestUpdate() {
    if (this.litLoaded) {
      // If we have Lit loaded, use its update mechanism
      return;
    }
    
    // Otherwise, use a simple render approach
    this._render();
  }
  
  // Simple render method when Lit isn't available
  private _render() {
    if (!this.config || !this._root) return;
    
    // Create a ha-card element
    let card = this._root.querySelector('ha-card');
    if (!card) {
      card = document.createElement('ha-card');
      this._root.appendChild(card);
    }
    
    // Clear existing content
    card.innerHTML = '';
    
    // Add header if enabled
    if (this.config.show_header) {
      const header = document.createElement('div');
      header.className = 'card-header';
      header.textContent = this.config.title || 'Energy Dashboard';
      card.appendChild(header);
    }
    
    // Add mode toggle
    card.appendChild(this._createModeToggle());
    
    // Render the correct section based on view mode
    if (this.viewMode === 'power') {
      // Create control buttons
      card.appendChild(this._createControlButtons(true));
      card.appendChild(this._createPersistenceToggle());
      
      // Add section title
      const sectionTitle = document.createElement('div');
      sectionTitle.className = 'section-title';
      sectionTitle.textContent = 'Power Entities';
      card.appendChild(sectionTitle);
      
      // Create container for entities
      const container = document.createElement('div');
      container.className = 'entities-container';
      if (this.config.max_height && this.config.max_height > 0) {
        container.style.maxHeight = `${Math.min(this.config.max_height, 400)}px`;
        container.style.overflowY = 'auto';
      }
      
      // Create entity items
      if (this.powerEntities.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-message';
        emptyMsg.textContent = 'No power entities found';
        container.appendChild(emptyMsg);
      } else {
        this.powerEntities.forEach(entity => {
          container.appendChild(this._createEntityItem(entity, true));
        });
      }
      
      card.appendChild(container);
      this.powerContainerRef = container;
      
      // Restore scroll position
      if (this.powerScrollPosition > 0) {
        requestAnimationFrame(() => {
          if (this.powerContainerRef) {
            this.powerContainerRef.scrollTop = this.powerScrollPosition;
          }
        });
      }
    } else {
      // Create control buttons
      card.appendChild(this._createControlButtons(false));
      card.appendChild(this._createPersistenceToggle());
      
      // Add section title
      const sectionTitle = document.createElement('div');
      sectionTitle.className = 'section-title';
      sectionTitle.textContent = 'Energy Entities';
      card.appendChild(sectionTitle);
      
      // Create container for entities
      const container = document.createElement('div');
      container.className = 'entities-container';
      if (this.config.max_height && this.config.max_height > 0) {
        container.style.maxHeight = `${Math.min(this.config.max_height, 400)}px`;
        container.style.overflowY = 'auto';
      }
      
      // Create entity items
      if (this.energyEntities.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-message';
        emptyMsg.textContent = 'No energy entities found';
        container.appendChild(emptyMsg);
      } else {
        this.energyEntities.forEach(entity => {
          container.appendChild(this._createEntityItem(entity, false));
        });
      }
      
      card.appendChild(container);
      this.energyContainerRef = container;
      
      // Restore scroll position
      if (this.energyScrollPosition > 0) {
        requestAnimationFrame(() => {
          if (this.energyContainerRef) {
            this.energyContainerRef.scrollTop = this.energyScrollPosition;
          }
        });
      }
    }
  }
  
  // Helper methods to create DOM elements
  private _createModeToggle(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'mode-toggle-container';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'toggle-wrapper';
    
    const activeBackground = document.createElement('div');
    activeBackground.className = 'active-background';
    activeBackground.style.left = this.viewMode === 'power' ? '0' : '50%';
    wrapper.appendChild(activeBackground);
    
    const powerOption = document.createElement('div');
    powerOption.className = 'toggle-option';
    powerOption.textContent = 'Power';
    powerOption.style.fontWeight = this.viewMode === 'power' ? 'bold' : 'normal';
    powerOption.style.color = this.viewMode === 'power' 
      ? 'var(--primary-text-color)' 
      : 'var(--secondary-text-color)';
    if (this.viewMode !== 'power') {
      powerOption.addEventListener('click', () => this._toggleViewMode());
    }
    wrapper.appendChild(powerOption);
    
    const energyOption = document.createElement('div');
    energyOption.className = 'toggle-option';
    energyOption.textContent = 'Energy';
    energyOption.style.fontWeight = this.viewMode === 'energy' ? 'bold' : 'normal';
    energyOption.style.color = this.viewMode === 'energy' 
      ? 'var(--primary-text-color)' 
      : 'var(--secondary-text-color)';
    if (this.viewMode !== 'energy') {
      energyOption.addEventListener('click', () => this._toggleViewMode());
    }
    wrapper.appendChild(energyOption);
    
    container.appendChild(wrapper);
    return container;
  }
  
  private _createControlButtons(isPower: boolean): HTMLElement {
    const container = document.createElement('div');
    container.className = 'control-buttons';
    
    const resetButton = document.createElement('button');
    resetButton.className = 'control-button';
    resetButton.innerHTML = '<ha-icon icon="mdi:refresh"></ha-icon><span>Reset</span>';
    resetButton.addEventListener('click', isPower ? 
      () => this._resetToPowerDefaultEntities() : 
      () => this._resetToEnergyDefaultEntities()
    );
    container.appendChild(resetButton);
    
    const clearButton = document.createElement('button');
    clearButton.className = 'control-button';
    clearButton.innerHTML = '<ha-icon icon="mdi:close-circle-outline"></ha-icon><span>Clear</span>';
    clearButton.addEventListener('click', isPower ? 
      () => this._clearAllPowerEntities() : 
      () => this._clearAllEnergyEntities()
    );
    container.appendChild(clearButton);
    
    const selectAllButton = document.createElement('button');
    selectAllButton.className = 'select-all-button';
    selectAllButton.innerHTML = '<ha-icon icon="mdi:check-circle-outline"></ha-icon><span>All</span>';
    selectAllButton.addEventListener('click', isPower ? 
      () => this._selectAllPowerEntities() : 
      () => this._selectAllEnergyEntities()
    );
    container.appendChild(selectAllButton);
    
    return container;
  }
  
  private _createPersistenceToggle(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'persistence-toggle';
    container.addEventListener('click', () => this._togglePersistence());
    
    const label = document.createElement('span');
    label.style.marginRight = '8px';
    label.style.fontSize = '14px';
    label.style.color = 'var(--primary-text-color)';
    label.textContent = 'Remember Selection: ';
    container.appendChild(label);
    
    const toggle = document.createElement('span');
    toggle.className = 'toggle-switch';
    
    const slider = document.createElement('span');
    slider.className = 'toggle-slider';
    slider.style.backgroundColor = this.config?.persist_selection ? 
      'var(--primary-color, #03a9f4)' : '#ccc';
    
    const button = document.createElement('span');
    button.className = 'toggle-button';
    button.style.left = this.config?.persist_selection ? '16px' : '4px';
    
    slider.appendChild(button);
    toggle.appendChild(slider);
    container.appendChild(toggle);
    
    return container;
  }
  
  private _createEntityItem(entity: EntityInfo, isPower: boolean): HTMLElement {
    const item = document.createElement('div');
    item.className = 'entity-item';
    if (entity.isOn) {
      item.classList.add('on');
    }
    
    item.addEventListener('click', () => {
      if (isPower) {
        this._togglePowerEntity(entity.entityId);
      } else {
        this._toggleEnergyEntity(entity.entityId);
      }
    });
    
    const leftPart = document.createElement('div');
    leftPart.className = 'entity-left';
    
    const name = document.createElement('div');
    name.className = 'entity-name';
    name.textContent = entity.name;
    leftPart.appendChild(name);
    
    const rightPart = document.createElement('div');
    rightPart.className = 'entity-state';
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'power-value';
    
    if (isPower) {
      const value = entity.powerValue !== undefined ? entity.powerValue : 0;
      valueSpan.textContent = value >= 1000 
        ? `${(value / 1000).toFixed(1)} kW` 
        : `${Math.round(value)} W`;
    } else {
      valueSpan.textContent = `${(entity.energyValue || 0).toFixed(2)} kWh`;
    }
    
    rightPart.appendChild(valueSpan);
    
    item.appendChild(leftPart);
    item.appendChild(rightPart);
    
    return item;
  }
  
  // Called when the element is added to the DOM
  connectedCallback(): void {
    // Load view mode from localStorage
    this.viewMode = this._loadViewMode();
    
    // Load persistence setting from localStorage when element is connected to DOM
    if (this.config) {
      this.config.persist_selection = this._loadPersistenceState();
    }
    
    // Initial render
    this.requestUpdate();
  }
  
  // Called when element is removed from DOM
  disconnectedCallback(): void {
    // Save scroll positions
    this._saveScrollPositions();
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
    
    this.requestUpdate();
  }
  
  // Home Assistant cards API
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
  
  // Save scroll positions before updates
  private _saveScrollPositions(): void {
    if (this.powerContainerRef) {
      this.powerScrollPosition = this.powerContainerRef.scrollTop;
    }
    if (this.energyContainerRef) {
      this.energyScrollPosition = this.energyContainerRef.scrollTop;
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
    
    // Request update to render changes
    this.requestUpdate();
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
    
    // Request update to render changes
    this.requestUpdate();
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
    this._saveScrollPositions();
    
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
}

// Register the custom element
customElements.define('energy-dashboard-entity-card', EnergyDashboardEntityCard);