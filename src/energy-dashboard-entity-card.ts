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
  setConfig(config: EnergyDashboardConfig) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
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
      show_energy_section: config.show_energy_section ?? true,
      energy_auto_select_count: config.energy_auto_select_count ?? 6,
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
    this._hass = hass;
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
    const savedStates = loadToggleStates('energy-dashboard-power-toggle-states');
    if (savedStates && Object.keys(savedStates).length > 0) {
      this.entityToggleStates = savedStates;
    } else {
      const toggleStates: Record<string, boolean> = {};
      const count = this.config?.auto_select_count ?? 6;
      entities.slice(0, count).forEach(entity => {
        toggleStates[entity.entityId] = true;
      });
      this.entityToggleStates = toggleStates;
    }
  }

  _initializeEnergyToggleStates(entities: EntityInfo[]) {
    const savedStates = loadToggleStates('energy-dashboard-energy-toggle-states');
    if (savedStates && Object.keys(savedStates).length > 0) {
      this.energyEntityToggleStates = savedStates;
    } else {
      const toggleStates: Record<string, boolean> = {};
      const count = this.config?.energy_auto_select_count ?? 6;
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

  _resetToPowerDefaultEntities = () => {
    this._initializePowerToggleStates(getPowerEntities(this._hass));
    this._updatePowerEntities();
    this._updateContent();
  }

  _clearAllPowerEntities = () => {
    this.entityToggleStates = {};
    this._updatePowerEntities();
    this._updateContent();
  }

  _selectAllPowerEntities = () => {
    const entities = getPowerEntities(this._hass);
    entities.forEach(entity => {
      this.entityToggleStates[entity.entityId] = true;
    });
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
    this._initializeEnergyToggleStates(getEnergyEntities(this._hass));
    this._updateEnergyEntities();
    this._updateContent();
  }

  _clearAllEnergyEntities = () => {
    this.energyEntityToggleStates = {};
    this._updateEnergyEntities();
    this._updateContent();
  }

  _selectAllEnergyEntities = () => {
    const entities = getEnergyEntities(this._hass);
    entities.forEach(entity => {
      this.energyEntityToggleStates[entity.entityId] = true;
    });
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

  _renderPowerSection(): HTMLElement {
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
      
      if (this.config?.max_height && this.config.max_height > 0) {
        entitiesContainer.style.maxHeight = `${Math.min(this.config.max_height, 400)}px`;
        entitiesContainer.style.overflowY = 'auto';
      }
      
      // Add entities
      this.powerEntities.forEach(entity => {
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
        
        if (this.config?.show_state) {
          powerValue.textContent = `${entity.unit === 'kW' ? entity.state : Math.round(entity.powerValue || 0)} ${entity.unit || 'W'}`;
        }
        
        entityState.appendChild(statusIndicator);
        entityState.appendChild(powerValue);
        entityItem.appendChild(entityState);
        
        entitiesContainer.appendChild(entityItem);
      });
      
      containerWrapper.appendChild(entitiesContainer);
      section.appendChild(containerWrapper);
    } else {
      // Empty message
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent = 'No power entities found. Make sure you have entities with unit set to W or kW.';
      section.appendChild(emptyMessage);
    }
    
    return section;
  }

  _renderEnergySection(): HTMLElement {
    const section = document.createElement('div');

    // Only render if energy section is enabled
    if (!this.config?.show_energy_section) {
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
      
      if (this.config?.max_height && this.config.max_height > 0) {
        entitiesContainer.style.maxHeight = `${Math.min(this.config.max_height, 400)}px`;
        entitiesContainer.style.overflowY = 'auto';
      }
      
      // Add entities
      this.energyEntities.forEach(entity => {
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
        
        if (this.config?.show_state) {
          powerValue.textContent = `${entity.state} ${entity.unit}`;
        }
        
        entityState.appendChild(statusIndicator);
        entityState.appendChild(powerValue);
        entityItem.appendChild(entityState);
        
        entitiesContainer.appendChild(entityItem);
      });
      
      containerWrapper.appendChild(entitiesContainer);
      section.appendChild(containerWrapper);
    } else {
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
    if (!card) return;

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