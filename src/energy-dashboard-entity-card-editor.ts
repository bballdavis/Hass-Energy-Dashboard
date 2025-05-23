/**
 * Editor component for the Energy Dashboard Entity Card.
 * Provides a UI for users to configure entity card options in Home Assistant.
 * Handles form rendering, validation, and config change events.
 */

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
      delete (this.config as any).energy_auto_select_count;
    }
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

    // Entity Removal Filter field
    const entityFilterRow = this._createRow();
    const entityFilterField = document.createElement('ha-textfield') as HaFormElement;
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

    // Enable Max Height toggle
    const enableMaxHeightRow = this._createRow();
    const enableMaxHeightSwitch = document.createElement('ha-switch') as HaFormElement;
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
    const maxHeightField = document.createElement('ha-textfield') as HaFormElement;
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

  private _createRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'row';
    return row;
  }
}

// Register the editor with the custom elements registry
customElements.define('energy-dashboard-entity-card-editor', EnergyDashboardEntityCardEditor);