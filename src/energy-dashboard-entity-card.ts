import { EntityInfo, EnergyDashboardConfig } from './types';
import { getPowerEntities, getEnergyEntities, loadToggleStates, saveToggleStates } from './entity-utils';
import { createStyles, cardStyles } from './styles';

export class EnergyDashboardEntityCard extends HTMLElement {
  // Properties
  private _hass: any;
  config?: EnergyDashboardConfig;
  powerEntities: EntityInfo[] = [];
  energyEntities: EntityInfo[] = [];
  entityToggleStates: Record<string, boolean> = {};
  energyEntityToggleStates: Record<string, boolean> = {};
  private _initialized: boolean = false;
  private _energyInitialized: boolean = false;
  private _root: ShadowRoot;
  private _viewMode: 'power' | 'energy' = 'power'; // Default view mode
  private _powerEntitiesContainer: HTMLElement | null = null;
  private _energyEntitiesContainer: HTMLElement | null = null;
  private _dynamicFilterValue: string = ''; // Track dynamic filter value
  private _filteredPowerEntities: EntityInfo[] = []; // Track filtered power entities
  private _filteredEnergyEntities: EntityInfo[] = []; // Track filtered energy entities
  private _searchInputHasFocus: boolean = false; // Track whether the search input has focus
  private _refreshIntervalId: number | null = null; // Timer ID for auto-refresh
  private _lastUpdateTimestamp: number = 0; // Track last entity update timestamp
  private _forceUpdate: boolean = false; // Flag to force update regardless of timestamp
  private _lastConfigState: string = ''; // Track last config state

  // Helper method to equalize button heights with ResizeObserver
  private _equalizeButtonHeights(buttonContainer: HTMLElement): void {
    if (!buttonContainer) return;

    const buttons = Array.from(buttonContainer.querySelectorAll('button'));
    if (buttons.length === 0) return;

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
    } catch (e) {
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
  private _forceRecalculation(element: HTMLElement): number {
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
  setConfig(config: EnergyDashboardConfig) {
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
      title: config.title ?? 'Energy Dashboard',
      show_header: config.show_header ?? true,
      show_state: config.show_state ?? true,
      show_toggle: config.show_toggle ?? true,
      auto_select_count: config.auto_select_count ?? 6,
      max_height: config.max_height ?? 0, // No longer using max_height, set to 0 by default
      energy_auto_select_count: config.energy_auto_select_count ?? 6,
      entity_removal_filter: config.entity_removal_filter ?? '', // Default to empty string for no filter
      refresh_rate: config.refresh_rate ?? 'off', // Default to off for refresh rate
      // Use the stored value as priority for persistence setting
      persist_selection: persistenceFromStorage,
      // Always enable energy section
      show_energy_section: true,
    };

    // Set up auto-refresh if configured
    this._setupRefreshInterval();

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
      energy_auto_select_count: 6,
      persist_selection: true,
      entity_removal_filter: '' // Fixed: renamed from entity_filter to entity_removal_filter
    };
  }

  getCardSize() {
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

  // Called when Home Assistant updates
  set hass(hass: any) {
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
    } else if (this.config?.refresh_rate && this.config.refresh_rate !== 'off') {
      const intervalMs = this.config.refresh_rate === '10s' ? 10000 : 30000;
      if (now - this._lastUpdateTimestamp >= intervalMs) {
        shouldUpdateEntities = true;
      }
    }
    
    if (shouldUpdateEntities) {
      this._updateEntities();
      this._lastUpdateTimestamp = now;
      this._forceUpdate = false; // Reset force update flag
    }
    
    // Always update content with current data (doesn't fetch new entity data)
    this._updateContent();
  }

  get hass() {
    return this._hass;
  }

  _updateEntities() {
    if (!this._hass) return;

    try {
      this._updatePowerEntities();
      if (this.config?.show_energy_section) {
        this._updateEnergyEntities();
      }
    } catch (e) {
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
    this.energyEntities = newEnergyEntities.map(entity => ({
      ...entity,
      isOn: this.energyEntityToggleStates[entity.entityId] || false
    }));
    
    // Apply the entity removal filter from config
    const filteredEntities = this._applyRemovalFilter(this.energyEntities);
    
    // Apply dynamic filter if exists
    this._filteredEnergyEntities = this._applyDynamicFilter(filteredEntities, this._dynamicFilterValue);
    
    this._saveEnergyToggleStates();
  }

  // Apply entity removal filter from configuration
  _applyRemovalFilter(entities: EntityInfo[]): EntityInfo[] {
    // If no filter is defined, return all entities
    if (!this.config?.entity_removal_filter || this.config.entity_removal_filter.trim() === '') {
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
  _applyDynamicFilter(entities: EntityInfo[], filterValue: string): EntityInfo[] {
    if (!filterValue) {
      return entities;
    }

    const filter = filterValue.toLowerCase();
    return entities.filter(entity => 
      entity.name.toLowerCase().includes(filter) || 
      entity.entityId.toLowerCase().includes(filter)
    );
  }

  // Handle dynamic filter input change
  _handleFilterInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    this._dynamicFilterValue = target.value;
    
    // Re-apply filters and update UI
    if (this._viewMode === 'power') {
      const filteredEntities = this._applyRemovalFilter(this.powerEntities);
      this._filteredPowerEntities = this._applyDynamicFilter(filteredEntities, this._dynamicFilterValue);
    } else {
      const filteredEntities = this._applyRemovalFilter(this.energyEntities);
      this._filteredEnergyEntities = this._applyDynamicFilter(filteredEntities, this._dynamicFilterValue);
    }
    
    this._updateContent();
  }

  _initializePowerToggleStates(entities: EntityInfo[]) {
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
      
      // Apply entity removal filter first to get only visible entities
      const visibleEntities = this._applyRemovalFilter(entities);

      // Initialize all entities to false first (including hidden ones)
      entities.forEach(entity => {
        // Set to false by default
        toggleStates[entity.entityId] = false;
      });

      // Then set the first `count` VISIBLE entities to true
      visibleEntities.slice(0, count).forEach(entity => {
        toggleStates[entity.entityId] = true;
      });

      this.entityToggleStates = toggleStates;
    }
  }

  _initializeEnergyToggleStates(entities: EntityInfo[]) {
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
      
      // Apply entity removal filter first to get only visible entities
      const visibleEntities = this._applyRemovalFilter(entities);

      // Initialize all entities to false first (including hidden ones)
      entities.forEach(entity => {
        // Set to false by default
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

  _resetToPowerDefaultEntities = () => {
    // Get current entities
    const entities = getPowerEntities(this._hass);
    
    // Apply entity removal filter first to get only visible entities
    const visibleEntities = this._applyRemovalFilter(entities);

    // Create a new toggle state object
    const toggleStates: Record<string, boolean> = {};
    const count = this.config?.auto_select_count ?? 6;

    // First initialize all to false
    entities.forEach(entity => {
      toggleStates[entity.entityId] = false;
    });

    // Then set first 'count' VISIBLE entities to true
    visibleEntities.slice(0, count).forEach(entity => {
      toggleStates[entity.entityId] = true;
    });

    // Update the toggle states
    this.entityToggleStates = toggleStates;
    this._savePowerToggleStates();
    this._updatePowerEntities();
    this._updateContent();
  }

  _clearAllPowerEntities = () => {
    const entities = getPowerEntities(this._hass);
    const newToggleStates: Record<string, boolean> = {};

    // Set all entity toggle states to false
    entities.forEach(entity => {
      newToggleStates[entity.entityId] = false;
    });

    this.entityToggleStates = newToggleStates;
    this._savePowerToggleStates();
    this._updatePowerEntities();
    this._updateContent();
  }

  _selectAllPowerEntities = () => {
    const entities = getPowerEntities(this._hass);
    const newToggleStates: Record<string, boolean> = {};

    // Set all entity toggle states to true
    entities.forEach(entity => {
      newToggleStates[entity.entityId] = true;
    });

    this.entityToggleStates = newToggleStates;
    this._savePowerToggleStates();
    this._updatePowerEntities();
    this._updateContent();
  }

  _togglePowerEntity = (e: Event) => {
    const target = e.currentTarget as HTMLElement;
    const entityId = target.dataset.entity;
    if (entityId) {
      this.entityToggleStates[entityId] = !this.entityToggleStates[entityId];
      this._updatePowerEntities();
      this._updateContent();
    }
  }

  _resetToEnergyDefaultEntities = () => {
    // Get current energy entities
    const entities = getEnergyEntities(this._hass);
    
    // Apply entity removal filter first to get only visible entities
    const visibleEntities = this._applyRemovalFilter(entities);

    // Create a new toggle state object
    const toggleStates: Record<string, boolean> = {};
    const count = this.config?.energy_auto_select_count ?? 6;

    // First initialize all to false
    entities.forEach(entity => {
      toggleStates[entity.entityId] = false;
    });

    // Then set first 'count' VISIBLE entities to true
    visibleEntities.slice(0, count).forEach(entity => {
      toggleStates[entity.entityId] = true;
    });

    // Update the toggle states
    this.energyEntityToggleStates = toggleStates;
    this._saveEnergyToggleStates();
    this._updateEnergyEntities();
    this._updateContent();
  }

  _clearAllEnergyEntities = () => {
    const entities = getEnergyEntities(this._hass);
    const newToggleStates: Record<string, boolean> = {};

    // Set all entity toggle states to false
    entities.forEach(entity => {
      newToggleStates[entity.entityId] = false;
    });

    this.energyEntityToggleStates = newToggleStates;
    this._saveEnergyToggleStates();
    this._updateEnergyEntities();
    this._updateContent();
  }

  _selectAllEnergyEntities = () => {
    const entities = getEnergyEntities(this._hass);
    const newToggleStates: Record<string, boolean> = {};

    // Set all entity toggle states to true
    entities.forEach(entity => {
      newToggleStates[entity.entityId] = true;
    });

    this.energyEntityToggleStates = newToggleStates;
    this._saveEnergyToggleStates();
    this._updateEnergyEntities();
    this._updateContent();
  }

  _toggleEnergyEntity = (e: Event) => {
    const target = e.currentTarget as HTMLElement;
    const entityId = target.dataset.entity;
    if (entityId) {
      this.energyEntityToggleStates[entityId] = !this.energyEntityToggleStates[entityId];
      this._updateEnergyEntities();
      this._updateContent();
    }
  }

  _togglePersistence = () => {
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
      } else {
        // If persistence is turned on, save the current toggle states
        this._savePowerToggleStates();
        this._saveEnergyToggleStates();
      }

      // Re-initialize and update the content with new settings
      this._updateEntities();
      this._updateContent();
    }
  }

  // Manage the persistence toggle setting separately
  _loadPersistenceState(): boolean {
    try {
      const stored = localStorage.getItem('energy-dashboard-persistence-toggle');
      return stored === null ? true : stored === 'true';
    } catch {
      return true; // Default to true if we can't load from localStorage
    }
  }

  _savePersistenceState(persist: boolean): void {
    try {
      localStorage.setItem('energy-dashboard-persistence-toggle', String(persist));
    } catch (e) {
      console.error("Failed to save persistence state:", e);
    }
  }

  // Save view mode to localStorage
  _saveViewMode(mode: 'power' | 'energy'): void {
    try {
      localStorage.setItem('energy-dashboard-view-mode', mode);
      // Also update config to keep it in sync
      if (this.config) {
        this.config.view_mode = mode;
      }
      this._viewMode = mode;
    } catch (e) {
      console.error("Failed to save view mode:", e);
    }
  }

  // Load view mode from localStorage
  _loadViewMode(): 'power' | 'energy' {
    try {
      const stored = localStorage.getItem('energy-dashboard-view-mode');
      return (stored === 'power' || stored === 'energy') ? stored : 'power';
    } catch {
      return 'power'; // Default to power view if we can't load from localStorage
    }
  }

  // Toggle between power and energy view
  _toggleViewMode = () => {
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
  }

  _updateContent() {
    if (!this.config) return;
    const card = this._root.querySelector('ha-card');
    if (!card) return;

    // Check if we need to update the content based on changes
    const currentPowerCount = this._filteredPowerEntities.length;
    const currentEnergyCount = this._filteredEnergyEntities.length;
    
    // Create a simple hash of the current configuration state to detect changes
    const currentConfigState = JSON.stringify({
      view: this._viewMode,
      filter: this._dynamicFilterValue,
      persist: this.config.persist_selection,
      refresh: this.config.refresh_rate,
      powerCount: currentPowerCount,
      energyCount: currentEnergyCount,
      enableMaxHeight: this.config.enable_max_height,
      maxHeight: this.config.max_height
    });
    
    // If nothing has changed, don't re-render
    if (currentConfigState === this._lastConfigState && !this._forceUpdate) {
      return;
    }
    
    // Update our tracking variables
    this._lastConfigState = currentConfigState;
    
    // Now proceed with the render
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
      toggleSlider.style.backgroundColor = this.config?.persist_selection ? 'var(--primary-color, #03a9f4)' : '#ccc';
      toggleSlider.style.borderRadius = '34px';
      toggleSlider.style.transition = '.4s';
      
      const toggleButton = document.createElement('span');
      toggleButton.style.position = 'absolute';
      toggleButton.style.content = '""';
      toggleButton.style.height = '16px';
      toggleButton.style.width = '16px';
      toggleButton.style.left = this.config?.persist_selection ? '16px' : '4px';
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
        this._powerEntitiesContainer!.style.display = '';
        this._energyEntitiesContainer!.style.display = 'none';
        scrollContainer.appendChild(this._powerEntitiesContainer!);
        card.appendChild(scrollContainer);
      } else {
        // Regular display without scroll
        this._powerEntitiesContainer!.style.display = '';
        this._energyEntitiesContainer!.style.display = 'none';
        card.appendChild(this._powerEntitiesContainer!);
      }
      
      // Update the entity buttons with filtered entities
      if (this._filteredPowerEntities.length > 0) {
        this._updateEntityButtons(this._powerEntitiesContainer!, this._filteredPowerEntities, this._togglePowerEntity, true);
      } else {
        // Clear the container but don't show any message
        this._powerEntitiesContainer!.innerHTML = '';
      }
    } else {
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
        this._powerEntitiesContainer!.style.display = 'none';
        this._energyEntitiesContainer!.style.display = '';
        scrollContainer.appendChild(this._energyEntitiesContainer!);
        card.appendChild(scrollContainer);
      } else {
        // Regular display without scroll
        this._powerEntitiesContainer!.style.display = 'none';
        this._energyEntitiesContainer!.style.display = '';
        card.appendChild(this._energyEntitiesContainer!);
      }
      
      // Show filtered entities or "no results" message
      if (this._filteredEnergyEntities.length > 0) {
        this._updateEntityButtons(this._energyEntitiesContainer!, this._filteredEnergyEntities, this._toggleEnergyEntity, false);
      } else {
        this._energyEntitiesContainer!.innerHTML = '';
      }
    }

    // Force layout recalculation to ensure all elements have proper dimensions
    requestAnimationFrame(() => {
      this._forceRecalculation(card as HTMLElement);

      // Equalize button heights once with a single timeout, don't use multiple nested timeouts
      setTimeout(() => {
        const controlButtonsContainers = Array.from(this._root.querySelectorAll('.control-buttons'));
        controlButtonsContainers.forEach((container) => {
          this._equalizeButtonHeights(container as HTMLElement);
        });
      }, 50);
    });
  }

  _updateEntityButtons(container: HTMLElement, entities: EntityInfo[], onClick: (e: Event) => void, isPower: boolean) {
    // Map existing entity items by entityId
    const existingItems: Record<string, HTMLElement> = {};
    Array.from(container.children).forEach(child => {
      const el = child as HTMLElement;
      if (el.dataset && el.dataset.entity) {
        existingItems[el.dataset.entity] = el;
      }
    });
    // Track which nodes are still needed
    const usedNodes = new Set<string>();
    // Add or update entity items
    entities.forEach(entity => {
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
      if (this.config?.show_state) {
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
  _setRefreshRate(rate: 'off' | '10s' | '30s') {
    if (!this.config) return;
    
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
    // Clear any existing interval first
    this._clearRefreshInterval();
    
    // Set up new interval if a refresh rate is configured
    if (this.config?.refresh_rate && this.config.refresh_rate !== 'off') {
      const intervalMs = this.config.refresh_rate === '10s' ? 10000 : 30000;
      this._refreshIntervalId = window.setInterval(() => {
        this._refreshNow();
      }, intervalMs);
    }
  }
}

// Register the card with the custom elements registry
customElements.define('energy-dashboard-entity-card', EnergyDashboardEntityCard);