import { EnergyDashboardConfig } from './types';
import { createStyles, editorStyles } from './styles';

// Extend HTMLInputElement to include the configValue property
interface CustomHTMLInputElement extends HTMLInputElement {
  configValue?: string;
}

// Define a type for HA elements used in the editor
interface HaFormElement extends HTMLElement {
  label?: string;
  value?: string | number | boolean;
  type?: string;
  min?: string;
  max?: string;
  configValue?: string;
  checked?: boolean;
  helperText?: string;
  helperPersistent?: boolean;
  addEventListener(event: string, handler: (event: Event) => void): void;
}

export class EnergyDashboardEntityCardEditor extends HTMLElement {
  // Properties
  hass: any;
  config: EnergyDashboardConfig;
  private _root: ShadowRoot;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.appendChild(createStyles(editorStyles));
    
    // Initialize properties
    this.hass = undefined;
    this.config = undefined as unknown as EnergyDashboardConfig;

    // Create the form container
    const form = document.createElement('div');
    form.className = 'form';
    this._root.appendChild(form);
  }

  // Called when the element is added to the DOM
  connectedCallback() {
    this._updateForm();
  }

  setConfig(config: EnergyDashboardConfig) {
    this.config = {
      // First spread the provided config
      ...config,
      // Then apply defaults for any missing properties
      show_header: config.show_header !== undefined ? config.show_header : true,
      show_state: config.show_state !== undefined ? config.show_state : true,
      show_toggle: config.show_toggle !== undefined ? config.show_toggle : true,
      auto_select_count: config.auto_select_count !== undefined ? config.auto_select_count : 6,
      max_height: config.max_height !== undefined ? config.max_height : 400, // Default to ~15 entities
      energy_auto_select_count: config.energy_auto_select_count !== undefined ? config.energy_auto_select_count : 6,
      persist_selection: config.persist_selection !== undefined ? config.persist_selection : true,
      title: config.title !== undefined ? config.title : 'Energy Dashboard',
    };
    this._updateForm();
  }

  valueChanged = (ev: Event) => {
    if (!this.config) return;
    
    const target = ev.target as CustomHTMLInputElement;
    const configValue = target.configValue;
    if (!configValue) return;

    let newValue;
    if (typeof target.checked === 'boolean') {
      newValue = target.checked;
    } else if (target.value !== undefined) {
      if (target.type === 'number') {
        newValue = Number(target.value);
      } else {
        newValue = target.value;
      }
    }

    if (this.config[configValue] === newValue) return;

    const newConfig = {
      ...this.config,
      [configValue]: newValue
    };

    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true
    }));
  }

  private _updateForm() {
    if (!this.config) return;

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
    const titleField = document.createElement('ha-textfield') as HaFormElement;
    titleField.className = 'value';
    titleField.label = 'Title';
    titleField.value = this.config.title || '';
    titleField.configValue = 'title';
    titleField.addEventListener('change', this.valueChanged);
    titleRow.appendChild(titleField);
    form.appendChild(titleRow);

    // Show Header toggle
    const headerRow = this._createRow();
    const headerSwitch = document.createElement('ha-switch') as HaFormElement;
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
    const stateSwitch = document.createElement('ha-switch') as HaFormElement;
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
    const toggleSwitch = document.createElement('ha-switch') as HaFormElement;
    toggleSwitch.checked = this.config.show_toggle !== false;
    toggleSwitch.configValue = 'show_toggle';
    toggleSwitch.addEventListener('change', this.valueChanged);
    const toggleLabel = document.createElement('div');
    toggleLabel.textContent = 'Allow Toggling';
    toggleRow.appendChild(toggleSwitch);
    toggleRow.appendChild(toggleLabel);
    form.appendChild(toggleRow);

    // Add Persist Selection toggle
    const persistSelectionRow = this._createRow();
    const persistSelectionSwitch = document.createElement('ha-switch') as HaFormElement;
    persistSelectionSwitch.checked = this.config.persist_selection !== false;
    persistSelectionSwitch.configValue = 'persist_selection';
    persistSelectionSwitch.addEventListener('change', this.valueChanged);
    const persistSelectionLabel = document.createElement('div');
    persistSelectionLabel.textContent = 'Remember Selection';
    persistSelectionRow.appendChild(persistSelectionSwitch);
    persistSelectionRow.appendChild(persistSelectionLabel);
    form.appendChild(persistSelectionRow);

    // Auto-select Count field
    const autoSelectRow = this._createRow();
    const autoSelectField = document.createElement('ha-textfield') as HaFormElement;
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
    const energyAutoSelectField = document.createElement('ha-textfield') as HaFormElement;
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

    // Max Height field
    const maxHeightRow = this._createRow();
    const maxHeightField = document.createElement('ha-textfield') as HaFormElement;
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

  private _createRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'row';
    return row;
  }
}

// Register the editor with the custom elements registry
customElements.define('energy-dashboard-entity-card-editor', EnergyDashboardEntityCardEditor);