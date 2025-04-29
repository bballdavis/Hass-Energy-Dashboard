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

    this._updateContent();
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
      console.log("Appended persistence toggle to card:", persistenceToggleEl);
      
      const sectionTitle = document.createElement('div');
      sectionTitle.className = 'section-title';
      sectionTitle.textContent = 'Power Entities';
      card.appendChild(sectionTitle);

      // Then add the entities container
      this._powerEntitiesContainer!.style.display = '';
      this._energyEntitiesContainer!.style.display = 'none';
      card.appendChild(this._powerEntitiesContainer!);
      this._updateEntityButtons(this._powerEntitiesContainer!, this.powerEntities, this._togglePowerEntity, true);
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
      console.log("Appended persistence toggle to card:", persistenceToggleEl);
      
      const sectionTitle = document.createElement('div');
      sectionTitle.className = 'section-title';
      sectionTitle.textContent = 'Energy Entities';
      card.appendChild(sectionTitle);

      // Then add the entities container
      this._powerEntitiesContainer!.style.display = 'none';
      this._energyEntitiesContainer!.style.display = '';
      card.appendChild(this._energyEntitiesContainer!);
      this._updateEntityButtons(this._energyEntitiesContainer!, this.energyEntities, this._toggleEnergyEntity, false);
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
      this._forceRecalculation(card as HTMLElement);

      // Wait a bit for the DOM to be fully rendered before equalizing button heights
      setTimeout(() => {
        const controlButtonsContainers = Array.from(this._root.querySelectorAll('.control-buttons'));
        console.log(`Found ${controlButtonsContainers.length} control button containers to process`);
        controlButtonsContainers.forEach((container, index) => {
          console.log(`Equalizing heights for container ${index}`);
          this._equalizeButtonHeights(container as HTMLElement);
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
}

// Register the card with the custom elements registry
customElements.define('energy-dashboard-entity-card', EnergyDashboardEntityCard);