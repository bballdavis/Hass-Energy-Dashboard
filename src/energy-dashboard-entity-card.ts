import { EntityInfo, EnergyDashboardConfig } from './types';
import { getPowerEntities, getEnergyEntities, loadToggleStates, saveToggleStates } from './entity-utils';
import { createStyles, cardStyles } from './styles';

/**
 * ScrollManager handles scroll position management for containers
 * It preserves scroll position across arbitrary DOM updates
 */
class ScrollManager {
  private scrollPositions = new Map<string, number>();
  private mutationObservers = new Map<string, MutationObserver>();
  private resizeObservers = new Map<string, ResizeObserver>();
  private updateScheduled = new Map<string, number>();
  private containers = new Map<string, HTMLElement>();
  
  /**
   * Register a container to manage its scroll state
   * @param id Unique identifier for this scroll container
   * @param container The HTML element that holds scrollable content
   */
  registerContainer(id: string, container: HTMLElement) {
    // Save initial scroll position if any
    this.scrollPositions.set(id, container.scrollTop);
    this.containers.set(id, container);
    
    // Set up scroll event listener to capture position changes
    container.addEventListener('scroll', () => {
      this.scrollPositions.set(id, container.scrollTop);
    }, { passive: true });
    
    // Set up mutation observer to restore scroll after content changes
    const observer = new MutationObserver(() => this.scheduleScrollRestore(id));
    observer.observe(container, { 
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });
    this.mutationObservers.set(id, observer);
    
    // Set up resize observer to handle container size changes
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => this.scheduleScrollRestore(id));
      resizeObserver.observe(container);
      this.resizeObservers.set(id, resizeObserver);
    }
    
    console.log(`ScrollManager: Registered container ${id}`);
    return this;
  }
  
  /**
   * Unregister a container and clean up all observers
   */
  unregisterContainer(id: string) {
    // Clean up observers
    const mutationObserver = this.mutationObservers.get(id);
    if (mutationObserver) {
      mutationObserver.disconnect();
      this.mutationObservers.delete(id);
    }
    
    const resizeObserver = this.resizeObservers.get(id);
    if (resizeObserver) {
      resizeObserver.disconnect();
      this.resizeObservers.delete(id);
    }
    
    // Clean up timers
    const timerId = this.updateScheduled.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      this.updateScheduled.delete(id);
    }
    
    // Remove saved data
    this.scrollPositions.delete(id);
    this.containers.delete(id);
    
    console.log(`ScrollManager: Unregistered container ${id}`);
  }
  
  /**
   * Schedule a scroll position restore (debounced)
   */
  private scheduleScrollRestore(id: string) {
    // Clear any pending restore for this container
    const existingTimer = this.updateScheduled.get(id);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }
    
    // Schedule a new restore
    const timerId = window.setTimeout(() => {
      this.restoreScrollPosition(id);
      this.updateScheduled.delete(id);
    }, 10);
    
    this.updateScheduled.set(id, timerId);
  }
  
  /**
   * Force an immediate scroll position restore
   */
  restoreScrollPosition(id: string) {
    const savedPosition = this.scrollPositions.get(id);
    const container = this.containers.get(id);
    
    if (savedPosition !== undefined && container) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        // Double RAF for more reliable scroll restoration after DOM changes
        requestAnimationFrame(() => {
          container.scrollTop = savedPosition;
          // console.log(`ScrollManager: Restored scroll position for ${id} to ${savedPosition}px`);
        });
      });
    }
  }
  
  /**
   * Manually save the current scroll position
   */
  saveScrollPosition(id: string) {
    const container = this.containers.get(id);
    if (container) {
      this.scrollPositions.set(id, container.scrollTop);
      // console.log(`ScrollManager: Manually saved scroll position for ${id}: ${container.scrollTop}px`);
    }
  }
  
  /**
   * Get the current saved scroll position
   */
  getScrollPosition(id: string): number {
    return this.scrollPositions.get(id) || 0;
  }
}

// Create a singleton instance
const scrollManager = new ScrollManager();

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
  private _powerEntitiesContainer: HTMLElement;  // Remove null type
  private _energyEntitiesContainer: HTMLElement;  // Remove null type
  
  // Static properties for card registration
  static get cardType() { return 'energy-dashboard-entity-card'; }
  static get displayName() { return 'Energy Dashboard Entity Card'; }
  static get description() { return 'Card to select and display power and energy entities'; }
  static get icon() { return 'mdi:lightning-bolt'; }

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.appendChild(createStyles(cardStyles));
    
    // Create the card element
    const card = document.createElement('ha-card');
    this._root.appendChild(card);
    
    // Create persistent containers that won't be recreated
    this._powerEntitiesContainer = document.createElement('div');
    this._powerEntitiesContainer.className = 'entities-container';
    this._powerEntitiesContainer.id = 'power-entities-container';
    this._powerEntitiesContainer.style.display = 'none'; // Hidden initially
    
    this._energyEntitiesContainer = document.createElement('div');
    this._energyEntitiesContainer.className = 'entities-container';
    this._energyEntitiesContainer.id = 'energy-entities-container';
    this._energyEntitiesContainer.style.display = 'none'; // Hidden initially
    
    // Add containers to card immediately so they can be registered with ScrollManager
    card.appendChild(this._powerEntitiesContainer);
    card.appendChild(this._energyEntitiesContainer);
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
    
    // Register containers with ScrollManager once they're in the DOM
    setTimeout(() => {
      scrollManager.registerContainer('power-container', this._powerEntitiesContainer);
      scrollManager.registerContainer('energy-container', this._energyEntitiesContainer);
      console.log('ScrollManager: Registered containers');
    }, 50);

    this._updateContent();
  }

  // Called when the element is removed from the DOM
  disconnectedCallback() {
    // Unregister containers when element is removed
    scrollManager.unregisterContainer('power-container');
    scrollManager.unregisterContainer('energy-container');
    console.log('ScrollManager: Unregistered containers');
  }

  // Home Assistant specific method to set config
  setConfig(config: EnergyDashboardConfig) {
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
      energy_auto_select_count: 6,
      persist_selection: true
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
    }

    this._updateEntities();
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

    // Create a new toggle state object
    const toggleStates: Record<string, boolean> = {};
    const count = this.config?.auto_select_count ?? 6;

    // Set first 'count' entities to true, all others to false
    entities.forEach((entity, index) => {
      toggleStates[entity.entityId] = index < count;
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
    const entityId = target.dataset.entityId;
    if (entityId) {
      this.entityToggleStates[entityId] = !this.entityToggleStates[entityId];
      this._updatePowerEntities();
      this._updateContent();
    }
  }

  _resetToEnergyDefaultEntities = () => {
    // Get current energy entities
    const entities = getEnergyEntities(this._hass);

    // Create a new toggle state object
    const toggleStates: Record<string, boolean> = {};
    const count = this.config?.energy_auto_select_count ?? 6;

    // Set first 'count' entities to true, all others to false
    entities.forEach((entity, index) => {
      toggleStates[entity.entityId] = index < count;
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
    const entityId = target.dataset.entityId;
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

    // Clear only the card contents, preserve containers
    card.innerHTML = '';

    // Render header if enabled
    if (this.config.show_header) {
      const header = document.createElement('div');
      header.className = 'card-header';
      header.textContent = this.config.title;
      card.appendChild(header);
    }

    // Add the mode toggle container (Power/Energy selector)
    card.appendChild(this._renderModeToggle());

    // Render section based on current view mode
    if (this._viewMode === 'power') {
      // Show power section
      card.appendChild(this._renderControlButtons(true));
      card.appendChild(this._renderPersistenceToggle());
      
      // Add section title
      const sectionTitle = document.createElement('div');
      sectionTitle.className = 'section-title';
      sectionTitle.textContent = 'Power Entities';
      card.appendChild(sectionTitle);

      // Create or update power entities container
      const container = this._powerEntitiesContainer || document.createElement('div');
      container.className = 'entities-container';
      container.id = 'power-entities-container';
      if (this.config.max_height && this.config.max_height > 0) {
        container.style.maxHeight = `${Math.min(this.config.max_height, 400)}px`;
        container.style.overflowY = 'auto';
      }
      
      // Clear the container and re-render entities
      container.innerHTML = '';
      
      // Empty message if no entities
      if (!this.powerEntities || this.powerEntities.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-message';
        emptyMsg.textContent = 'No power entities found';
        container.appendChild(emptyMsg);
      } else {
        // Re-render all entities
        const fragment = document.createDocumentFragment();
        
        this.powerEntities.forEach(entity => {
          const entityElement = document.createElement('div');
          entityElement.className = 'entity-item';
          entityElement.dataset.entityId = entity.entityId;
          
          if (entity.isOn) {
            entityElement.classList.add('on');
          }
          
          // Add click handler
          entityElement.addEventListener('click', this._togglePowerEntity);
          
          // Create the left part (entity name)
          const entityLeft = document.createElement('div');
          entityLeft.className = 'entity-left';
          
          const entityName = document.createElement('div');
          entityName.className = 'entity-name';
          entityName.textContent = entity.name;
          entityLeft.appendChild(entityName);
          
          // Create the right part (entity state)
          const entityState = document.createElement('div');
          entityState.className = 'entity-state';
          
          // Format power value
          const value = entity.powerValue !== undefined ? entity.powerValue : 0;
          const valueText = value >= 1000 
            ? `${(value / 1000).toFixed(1)} kW` 
            : `${Math.round(value)} W`;
            
          entityState.innerHTML = `<span class="power-value">${valueText}</span>`;
          
          // Assemble the entity item
          entityElement.appendChild(entityLeft);
          entityElement.appendChild(entityState);
          
          fragment.appendChild(entityElement);
        });
        
        container.appendChild(fragment);
      }
      
      // Save reference to container and add to card
      this._powerEntitiesContainer = container;
      card.appendChild(container);
      
    } else {
      // Show energy section
      card.appendChild(this._renderControlButtons(false));
      card.appendChild(this._renderPersistenceToggle());
      
      // Add section title
      const sectionTitle = document.createElement('div');
      sectionTitle.className = 'section-title';
      sectionTitle.textContent = 'Energy Entities';
      card.appendChild(sectionTitle);

      // Create or update energy entities container
      const container = this._energyEntitiesContainer || document.createElement('div');
      container.className = 'entities-container';
      container.id = 'energy-entities-container';
      if (this.config.max_height && this.config.max_height > 0) {
        container.style.maxHeight = `${Math.min(this.config.max_height, 400)}px`;
        container.style.overflowY = 'auto';
      }
      
      // Clear the container and re-render entities
      container.innerHTML = '';
      
      // Empty message if no entities
      if (!this.energyEntities || this.energyEntities.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-message';
        emptyMsg.textContent = 'No energy entities found';
        container.appendChild(emptyMsg);
      } else {
        // Re-render all entities
        const fragment = document.createDocumentFragment();
        
        this.energyEntities.forEach(entity => {
          const entityElement = document.createElement('div');
          entityElement.className = 'entity-item';
          entityElement.dataset.entityId = entity.entityId;
          
          if (entity.isOn) {
            entityElement.classList.add('on');
          }
          
          // Add click handler
          entityElement.addEventListener('click', this._toggleEnergyEntity);
          
          // Create the left part (entity name)
          const entityLeft = document.createElement('div');
          entityLeft.className = 'entity-left';
          
          const entityName = document.createElement('div');
          entityName.className = 'entity-name';
          entityName.textContent = entity.name;
          entityLeft.appendChild(entityName);
          
          // Create the right part (entity state)
          const entityState = document.createElement('div');
          entityState.className = 'entity-state';
          
          // Format energy value
          const value = entity.energyValue !== undefined ? entity.energyValue : 0;
          entityState.innerHTML = `<span class="power-value">${value.toFixed(2)} kWh</span>`;
          
          // Assemble the entity item
          entityElement.appendChild(entityLeft);
          entityElement.appendChild(entityState);
          
          fragment.appendChild(entityElement);
        });
        
        container.appendChild(fragment);
      }
      
      // Save reference to container and add to card
      this._energyEntitiesContainer = container;
      card.appendChild(container);
    }
    
    // After rendering, capture the current scroll positions
    if (this._powerEntitiesContainer) {
      const powerScrollTop = this._powerEntitiesContainer.scrollTop;
      setTimeout(() => {
        if (this._powerEntitiesContainer && this._viewMode === 'power') {
          this._powerEntitiesContainer.scrollTop = powerScrollTop;
        }
      }, 0);
    }
    
    if (this._energyEntitiesContainer) {
      const energyScrollTop = this._energyEntitiesContainer.scrollTop;
      setTimeout(() => {
        if (this._energyEntitiesContainer && this._viewMode === 'energy') {
          this._energyEntitiesContainer.scrollTop = energyScrollTop;
        }
      }, 0);
    }
  }
  
  // Render the mode toggle (Power/Energy selector)
  private _renderModeToggle(): HTMLElement {
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
    
    return modeToggleContainer;
  }
  
  // Render the control buttons (Reset, Clear, All)
  private _renderControlButtons(isPower: boolean): HTMLElement {
    const controlButtons = document.createElement('div');
    controlButtons.className = 'control-buttons';
    controlButtons.style.display = 'flex';
    controlButtons.style.flexWrap = 'nowrap';
    controlButtons.style.alignItems = 'center';
    controlButtons.style.gap = '4px';
    controlButtons.style.margin = '0 0 8px 0';
    controlButtons.style.padding = '0';
    
    // Reset button
    const resetButton = document.createElement('button');
    resetButton.className = 'control-button';
    resetButton.innerHTML = '<ha-icon icon="mdi:refresh"></ha-icon><span>Reset</span>';
    resetButton.style.flex = '1 1 0';
    resetButton.style.minWidth = '40px';
    resetButton.addEventListener('click', isPower ? this._resetToPowerDefaultEntities : this._resetToEnergyDefaultEntities);
    
    // Clear button
    const clearButton = document.createElement('button');
    clearButton.className = 'control-button';
    clearButton.innerHTML = '<ha-icon icon="mdi:close-circle-outline"></ha-icon><span>Clear</span>';
    clearButton.style.flex = '1 1 0';
    clearButton.style.minWidth = '40px';
    clearButton.addEventListener('click', isPower ? this._clearAllPowerEntities : this._clearAllEnergyEntities);
    
    // Select All button
    const selectAllButton = document.createElement('button');
    selectAllButton.className = 'select-all-button';
    selectAllButton.innerHTML = '<ha-icon icon="mdi:check-circle-outline"></ha-icon><span>All</span>';
    selectAllButton.style.flex = '1 1 0';
    selectAllButton.style.minWidth = '40px';
    selectAllButton.addEventListener('click', isPower ? this._selectAllPowerEntities : this._selectAllEnergyEntities);
    
    controlButtons.appendChild(resetButton);
    controlButtons.appendChild(clearButton);
    controlButtons.appendChild(selectAllButton);
    
    return controlButtons;
  }
  
  // Render the persistence toggle ("Remember Selection")
  private _renderPersistenceToggle(): HTMLElement {
    const persistenceToggle = document.createElement('div');
    persistenceToggle.className = 'persistence-toggle';
    persistenceToggle.style.display = 'flex';
    persistenceToggle.style.alignItems = 'center';
    persistenceToggle.style.justifyContent = 'center';
    persistenceToggle.style.marginTop = '12px';
    persistenceToggle.style.marginBottom = '12px';
    persistenceToggle.style.padding = '4px 16px';
    persistenceToggle.style.cursor = 'pointer';
    persistenceToggle.style.backgroundColor = 'var(--card-background-color, white)';
    persistenceToggle.style.border = '1px solid var(--divider-color, #e0e0e0)';
    persistenceToggle.style.borderRadius = '8px';
    persistenceToggle.addEventListener('click', this._togglePersistence);
    
    const toggleLabel = document.createElement('span');
    toggleLabel.style.marginRight = '8px';
    toggleLabel.style.fontSize = '14px';
    toggleLabel.style.color = 'var(--primary-text-color)';
    toggleLabel.textContent = 'Remember Selection: ';
    
    const toggleSwitch = document.createElement('span');
    toggleSwitch.className = 'toggle-switch';
    toggleSwitch.style.position = 'relative';
    toggleSwitch.style.display = 'inline-block';
    toggleSwitch.style.width = '36px';
    toggleSwitch.style.height = '20px';
    toggleSwitch.style.verticalAlign = 'middle';
    
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
    toggleButton.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
    
    toggleSlider.appendChild(toggleButton);
    toggleSwitch.appendChild(toggleSlider);
    persistenceToggle.appendChild(toggleLabel);
    persistenceToggle.appendChild(toggleSwitch);
    
    return persistenceToggle;
  }
}

// Register the card with the custom elements registry
customElements.define('energy-dashboard-entity-card', EnergyDashboardEntityCard);