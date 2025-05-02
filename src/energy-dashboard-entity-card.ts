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

import { EntityInfo, EnergyDashboardConfig } from './types';
import { getPowerEntities, getEnergyEntities, loadToggleStates, saveToggleStates } from './entity-utils';
import { createStyles, cardStyles } from './styles';

export class EnergyDashboardEntityCard extends HTMLElement {
  private _hass: any;
  config?: EnergyDashboardConfig;
  powerEntities: EntityInfo[] = [];
  energyEntities: EntityInfo[] = [];
  entityToggleStates: Record<string, boolean> = {};
  energyEntityToggleStates: Record<string, boolean> = {};
  private _initialized: boolean = false;
  private _energyInitialized: boolean = false;
  private _root: ShadowRoot;
  private _viewMode: 'power' | 'energy' = 'power';
  private _powerEntitiesContainer: HTMLElement | null = null;
  private _energyEntitiesContainer: HTMLElement | null = null;
  private _dynamicFilterValue: string = '';
  private _filteredPowerEntities: EntityInfo[] = [];
  private _filteredEnergyEntities: EntityInfo[] = [];
  private _searchInputHasFocus: boolean = false;
  private _refreshIntervalId: number | null = null;
  private _lastUpdateTimestamp: number = 0;
  private _forceUpdate: boolean = false;

  private _equalizeButtonHeights(buttonContainer: HTMLElement): void {
    if (!buttonContainer) return;

    const buttons = Array.from(buttonContainer.querySelectorAll('button'));
    if (buttons.length === 0) return;

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
    } catch {
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

  private _forceRecalculation(element: HTMLElement): number {
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

  setConfig(config: EnergyDashboardConfig) {
    if (!config) {
      throw new Error("Invalid configuration");
    }

    this._clearRefreshInterval();

    const persistenceFromStorage = this._loadPersistenceState();

    this.config = {
      ...config,
      title: config.title ?? 'Energy Dashboard',
      show_header: config.show_header ?? true,
      show_state: config.show_state ?? true,
      show_toggle: config.show_toggle ?? true,
      auto_select_count: config.auto_select_count ?? 6,
      max_height: config.max_height ?? 0,
      entity_removal_filter: config.entity_removal_filter ?? '',
      refresh_rate: config.refresh_rate ?? 'off',
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

  set hass(hass: any) {
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
    } else if (this.config?.refresh_rate && this.config.refresh_rate !== 'off') {
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
    this.powerEntities.sort((a, b) => Math.abs(b.powerValue ?? 0) - Math.abs(a.powerValue ?? 0));
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
    this.energyEntities.sort((a, b) => Math.abs(b.energyValue ?? 0) - Math.abs(a.energyValue ?? 0));
    const filteredEntities = this._applyRemovalFilter(this.energyEntities);
    this._filteredEnergyEntities = this._applyDynamicFilter(filteredEntities, this._dynamicFilterValue);
    this._saveEnergyToggleStates();
  }

  _applyRemovalFilter(entities: EntityInfo[]): EntityInfo[] {
    if (!this.config?.entity_removal_filter || this.config.entity_removal_filter.trim() === '') {
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

  _handleFilterInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    this._dynamicFilterValue = target.value;

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
    const persistenceEnabled = this.config?.persist_selection ?? true;
    const savedStates = persistenceEnabled ? loadToggleStates('energy-dashboard-power-toggle-states') : null;

    if (savedStates && Object.keys(savedStates).length > 0) {
      this.entityToggleStates = savedStates;
    } else {
      const toggleStates: Record<string, boolean> = {};
      const count = this.config?.auto_select_count ?? 6;
      let visibleEntities = this._applyRemovalFilter(entities);
      visibleEntities = visibleEntities.sort((a, b) => Math.abs(b.powerValue ?? 0) - Math.abs(a.powerValue ?? 0));
      entities.forEach(entity => {
        toggleStates[entity.entityId] = false;
      });
      visibleEntities.slice(0, count).forEach(entity => {
        toggleStates[entity.entityId] = true;
      });
      this.entityToggleStates = toggleStates;
    }
  }

  _initializeEnergyToggleStates(entities: EntityInfo[]) {
    const persistenceEnabled = this.config?.persist_selection ?? true;
    const savedStates = persistenceEnabled ? loadToggleStates('energy-dashboard-energy-toggle-states') : null;

    if (savedStates && Object.keys(savedStates).length > 0) {
      this.energyEntityToggleStates = savedStates;
    } else {
      const toggleStates: Record<string, boolean> = {};
      const count = this.config?.auto_select_count ?? 6;
      let visibleEntities = this._applyRemovalFilter(entities);
      visibleEntities = visibleEntities.sort((a, b) => Math.abs(b.energyValue ?? 0) - Math.abs(a.energyValue ?? 0));
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

  _resetToPowerDefaultEntities = () => {
    const entities = getPowerEntities(this._hass);
    let visibleEntities = this._applyRemovalFilter(entities);
    const toggleStates: Record<string, boolean> = {};
    const count = this.config?.auto_select_count ?? 6;
    visibleEntities = visibleEntities.sort((a, b) => Math.abs(b.powerValue ?? 0) - Math.abs(a.powerValue ?? 0));
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
  }

  _clearAllPowerEntities = () => {
    const entities = getPowerEntities(this._hass);
    const newToggleStates: Record<string, boolean> = {};

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
    const entities = getEnergyEntities(this._hass);
    let visibleEntities = this._applyRemovalFilter(entities);
    const toggleStates: Record<string, boolean> = {};
    const count = this.config?.auto_select_count ?? 6;
    visibleEntities = visibleEntities.sort((a, b) => Math.abs(b.energyValue ?? 0) - Math.abs(a.energyValue ?? 0));
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
  }

  _clearAllEnergyEntities = () => {
    const entities = getEnergyEntities(this._hass);
    const newToggleStates: Record<string, boolean> = {};

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
      this.config.persist_selection = !this.config.persist_selection;

      this._savePersistenceState(this.config.persist_selection);

      if (!this.config.persist_selection) {
        localStorage.removeItem('energy-dashboard-power-toggle-states');
        localStorage.removeItem('energy-dashboard-energy-toggle-states');

        this._initialized = false;
        this._energyInitialized = false;
      } else {
        this._savePowerToggleStates();
        this._saveEnergyToggleStates();
      }

      this._updateEntities();
      this._updateContent();
    }
  }

  _loadPersistenceState(): boolean {
    try {
      const stored = localStorage.getItem('energy-dashboard-persistence-toggle');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  }

  _savePersistenceState(persist: boolean): void {
    try {
      localStorage.setItem('energy-dashboard-persistence-toggle', String(persist));
    } catch (e) {
      console.error("Failed to save persistence state:", e);
    }
  }

  _saveViewMode(mode: 'power' | 'energy'): void {
    try {
      localStorage.setItem('energy-dashboard-view-mode', mode);
      if (this.config) {
        this.config.view_mode = mode;
      }
      this._viewMode = mode;
    } catch (e) {
      console.error("Failed to save view mode:", e);
    }
  }

  _loadViewMode(): 'power' | 'energy' {
    try {
      const stored = localStorage.getItem('energy-dashboard-view-mode');
      return (stored === 'power' || stored === 'energy') ? stored : 'power';
    } catch {
      return 'power';
    }
  }

  _toggleViewMode = () => {
    const newMode = this._viewMode === 'power' ? 'energy' : 'power';
    this._viewMode = newMode;
    this._saveViewMode(newMode);

    this._updateContent();

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
        
        this._powerEntitiesContainer!.style.display = '';
        this._energyEntitiesContainer!.style.display = 'none';
        scrollContainer.appendChild(this._powerEntitiesContainer!);
        card.appendChild(scrollContainer);
      } else {
        this._powerEntitiesContainer!.style.display = '';
        this._energyEntitiesContainer!.style.display = 'none';
        card.appendChild(this._powerEntitiesContainer!);
      }
      
      if (this._filteredPowerEntities.length > 0) {
        this._updateEntityButtons(this._powerEntitiesContainer!, this._filteredPowerEntities, this._togglePowerEntity, true);
      } else {
        this._powerEntitiesContainer!.innerHTML = '';
      }
    } else {
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
        
        this._powerEntitiesContainer!.style.display = 'none';
        this._energyEntitiesContainer!.style.display = '';
        scrollContainer.appendChild(this._energyEntitiesContainer!);
        card.appendChild(scrollContainer);
      } else {
        this._powerEntitiesContainer!.style.display = 'none';
        this._energyEntitiesContainer!.style.display = '';
        card.appendChild(this._energyEntitiesContainer!);
      }
      
      if (this._filteredEnergyEntities.length > 0) {
        this._updateEntityButtons(this._energyEntitiesContainer!, this._filteredEnergyEntities, this._toggleEnergyEntity, false);
      } else {
        this._energyEntitiesContainer!.innerHTML = '';
      }
    }

    requestAnimationFrame(() => {
      this._forceRecalculation(card as HTMLElement);

      setTimeout(() => {
        const controlButtonsContainers = Array.from(this._root.querySelectorAll('.control-buttons'));
        controlButtonsContainers.forEach(container => {
          this._equalizeButtonHeights(container as HTMLElement);
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

  _updateEntityButtons(container: HTMLElement, entities: EntityInfo[], onClick: (e: Event) => void, isPower: boolean) {
    const existingItems: Record<string, HTMLElement> = {};
    Array.from(container.children).forEach(child => {
      const el = child as HTMLElement;
      if (el.dataset && el.dataset.entity) {
        existingItems[el.dataset.entity] = el;
      }
    });
    const usedNodes = new Set<string>();
    entities.forEach(entity => {
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
    Object.keys(existingItems).forEach(entityId => {
      if (!usedNodes.has(entityId)) {
        container.removeChild(existingItems[entityId]);
      }
    });
  }

  _setRefreshRate(rate: 'off' | '10s' | '30s') {
    if (!this.config) return;

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
    this._clearRefreshInterval();

    if (this.config?.refresh_rate && this.config.refresh_rate !== 'off') {
      const intervalMs = this.config.refresh_rate === '10s' ? 10000 : 30000;
      this._refreshIntervalId = window.setInterval(() => {
        this._refreshNow();
      }, intervalMs);
    }
  }
}

customElements.define('energy-dashboard-entity-card', EnergyDashboardEntityCard);