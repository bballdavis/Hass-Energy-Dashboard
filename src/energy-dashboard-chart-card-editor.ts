import { EnergyDashboardChartConfig, getDefaultChartConfig } from './energy-dashboard-chart-config';
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
  options?: Array<{value: string, label: string}>;
  addEventListener(event: string, handler: (event: Event) => void): void;
}

export class EnergyDashboardChartCardEditor extends HTMLElement {
  // Properties
  hass: any;
  config?: EnergyDashboardChartConfig;
  private _root: ShadowRoot;

  constructor() {
    super();
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

  setConfig(config: Partial<EnergyDashboardChartConfig>) {
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
          ...defaultConfig.power_chart_options?.y_axis,
          ...(config.power_chart_options?.y_axis || {})
        }
      },
      energy_chart_options: {
        ...defaultConfig.energy_chart_options,
        ...(config.energy_chart_options || {}),
        y_axis: {
          ...defaultConfig.energy_chart_options?.y_axis,
          ...(config.energy_chart_options?.y_axis || {})
        }
      },
      // Add base EnergyDashboardConfig properties
      title: config.title ?? 'Energy Dashboard Chart',
      show_header: config.show_header ?? true,
      show_state: config.show_state ?? true,
      show_toggle: config.show_toggle ?? true,
      auto_select_count: config.auto_select_count ?? 6,
      max_height: config.max_height ?? 400,
      show_energy_section: config.show_energy_section ?? true,
      energy_auto_select_count: config.energy_auto_select_count ?? 6,
      show_legend: config.show_legend ?? true,
    } as EnergyDashboardChartConfig;
    
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

    // Handle nested properties like power_chart_options.y_axis.title
    if (configValue.includes('.')) {
      const parts = configValue.split('.');
      const newConfig = { ...this.config };
      let currentObj: any = newConfig;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!currentObj[part]) currentObj[part] = {};
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

    // SECTION: General Settings
    this._addSectionTitle(form as HTMLElement, 'General Settings');

    // Title field
    const titleRow = this._createRow();
    const titleField = document.createElement('ha-textfield') as HaFormElement;
    titleField.className = 'value';
    titleField.label = 'Title';
    titleField.value = this.config.title || 'Energy Dashboard Chart';
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

    // Show Energy Section toggle
    const energySectionRow = this._createRow();
    const energySectionSwitch = document.createElement('ha-switch') as HaFormElement;
    energySectionSwitch.checked = this.config.show_energy_section !== false;
    energySectionSwitch.configValue = 'show_energy_section';
    energySectionSwitch.addEventListener('change', this.valueChanged);
    const energySectionLabel = document.createElement('div');
    energySectionLabel.textContent = 'Show Energy Section';
    energySectionRow.appendChild(energySectionSwitch);
    energySectionRow.appendChild(energySectionLabel);
    form.appendChild(energySectionRow);

    // SECTION: Chart Settings
    this._addSectionTitle(form as HTMLElement, 'Chart Settings');

    // Chart Type dropdown
    const chartTypeRow = this._createRow();
    const chartTypeField = document.createElement('ha-select') as HaFormElement;
    chartTypeField.className = 'value';
    chartTypeField.label = 'Chart Type';
    chartTypeField.configValue = 'chart_type';
    
    // Set options for the chart type dropdown
    chartTypeField.options = [
      { value: 'line', label: 'Line' },
      { value: 'area', label: 'Area' },
      { value: 'bar', label: 'Bar' }
    ];
    
    chartTypeField.value = this.config.chart_type || 'line';
    chartTypeField.addEventListener('change', this.valueChanged);
    chartTypeRow.appendChild(chartTypeField);
    form.appendChild(chartTypeRow);

    // Chart Height field
    const chartHeightRow = this._createRow();
    const chartHeightField = document.createElement('ha-textfield') as HaFormElement;
    chartHeightField.className = 'value';
    chartHeightField.label = 'Chart Height (pixels)';
    chartHeightField.type = 'number';
    chartHeightField.min = '100';
    chartHeightField.max = '1000';
    chartHeightField.value = String(this.config.chart_height || 300);
    chartHeightField.configValue = 'chart_height';
    chartHeightField.addEventListener('change', this.valueChanged);
    chartHeightRow.appendChild(chartHeightField);
    form.appendChild(chartHeightRow);

    // Hours to Show field
    const hoursToShowRow = this._createRow();
    const hoursToShowField = document.createElement('ha-textfield') as HaFormElement;
    hoursToShowField.className = 'value';
    hoursToShowField.label = 'Hours to Show';
    hoursToShowField.type = 'number';
    hoursToShowField.min = '1';
    hoursToShowField.max = '168'; // 7 days
    hoursToShowField.value = String(this.config.hours_to_show || 24);
    hoursToShowField.configValue = 'hours_to_show';
    hoursToShowField.addEventListener('change', this.valueChanged);
    hoursToShowRow.appendChild(hoursToShowField);
    form.appendChild(hoursToShowRow);

    // Show Points toggle
    const showPointsRow = this._createRow();
    const showPointsSwitch = document.createElement('ha-switch') as HaFormElement;
    showPointsSwitch.checked = this.config.show_points === true;
    showPointsSwitch.configValue = 'show_points';
    showPointsSwitch.addEventListener('change', this.valueChanged);
    const showPointsLabel = document.createElement('div');
    showPointsLabel.textContent = 'Show Data Points';
    showPointsRow.appendChild(showPointsSwitch);
    showPointsRow.appendChild(showPointsLabel);
    form.appendChild(showPointsRow);

    // Smooth Curve toggle
    const smoothCurveRow = this._createRow();
    const smoothCurveSwitch = document.createElement('ha-switch') as HaFormElement;
    smoothCurveSwitch.checked = this.config.smooth_curve !== false;
    smoothCurveSwitch.configValue = 'smooth_curve';
    smoothCurveSwitch.addEventListener('change', this.valueChanged);
    const smoothCurveLabel = document.createElement('div');
    smoothCurveLabel.textContent = 'Smooth Curve';
    smoothCurveRow.appendChild(smoothCurveSwitch);
    smoothCurveRow.appendChild(smoothCurveLabel);
    form.appendChild(smoothCurveRow);

    // Show Legend toggle
    const showLegendRow = this._createRow();
    const showLegendSwitch = document.createElement('ha-switch') as HaFormElement;
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
    const customColorsSwitch = document.createElement('ha-switch') as HaFormElement;
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
    const aggregateField = document.createElement('ha-select') as HaFormElement;
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
    this._addSectionTitle(form as HTMLElement, 'Power Chart Y-Axis Settings');

    // Power Y-Axis Title
    const powerYTitleRow = this._createRow();
    const powerYTitleField = document.createElement('ha-textfield') as HaFormElement;
    powerYTitleField.className = 'value';
    powerYTitleField.label = 'Y-Axis Title';
    powerYTitleField.value = this.config.power_chart_options?.y_axis?.title || 'Power';
    powerYTitleField.configValue = 'power_chart_options.y_axis.title';
    powerYTitleField.addEventListener('change', this.valueChanged);
    powerYTitleRow.appendChild(powerYTitleField);
    form.appendChild(powerYTitleRow);

    // Power Y-Axis Unit
    const powerYUnitRow = this._createRow();
    const powerYUnitField = document.createElement('ha-textfield') as HaFormElement;
    powerYUnitField.className = 'value';
    powerYUnitField.label = 'Y-Axis Unit';
    powerYUnitField.value = this.config.power_chart_options?.y_axis?.unit || 'W';
    powerYUnitField.configValue = 'power_chart_options.y_axis.unit';
    powerYUnitField.addEventListener('change', this.valueChanged);
    powerYUnitRow.appendChild(powerYUnitField);
    form.appendChild(powerYUnitRow);

    // Power Y-Axis Decimals
    const powerYDecimalsRow = this._createRow();
    const powerYDecimalsField = document.createElement('ha-textfield') as HaFormElement;
    powerYDecimalsField.className = 'value';
    powerYDecimalsField.label = 'Y-Axis Decimals';
    powerYDecimalsField.type = 'number';
    powerYDecimalsField.min = '0';
    powerYDecimalsField.max = '5';
    powerYDecimalsField.value = String(this.config.power_chart_options?.y_axis?.decimals ?? 1);
    powerYDecimalsField.configValue = 'power_chart_options.y_axis.decimals';
    powerYDecimalsField.addEventListener('change', this.valueChanged);
    powerYDecimalsRow.appendChild(powerYDecimalsField);
    form.appendChild(powerYDecimalsRow);

    // Power Y-Axis Min
    const powerYMinRow = this._createRow();
    const powerYMinField = document.createElement('ha-textfield') as HaFormElement;
    powerYMinField.className = 'value';
    powerYMinField.label = 'Y-Axis Minimum (empty for auto)';
    powerYMinField.type = 'number';
    powerYMinField.value = this.config.power_chart_options?.y_axis?.min !== undefined ? 
      String(this.config.power_chart_options.y_axis.min) : '';
    powerYMinField.configValue = 'power_chart_options.y_axis.min';
    powerYMinField.addEventListener('change', this.valueChanged);
    powerYMinRow.appendChild(powerYMinField);
    form.appendChild(powerYMinRow);

    // Power Y-Axis Max
    const powerYMaxRow = this._createRow();
    const powerYMaxField = document.createElement('ha-textfield') as HaFormElement;
    powerYMaxField.className = 'value';
    powerYMaxField.label = 'Y-Axis Maximum (empty for auto)';
    powerYMaxField.type = 'number';
    powerYMaxField.value = this.config.power_chart_options?.y_axis?.max !== undefined ? 
      String(this.config.power_chart_options.y_axis.max) : '';
    powerYMaxField.configValue = 'power_chart_options.y_axis.max';
    powerYMaxField.addEventListener('change', this.valueChanged);
    powerYMaxRow.appendChild(powerYMaxField);
    form.appendChild(powerYMaxRow);

    // Only show Energy Chart settings if energy section is enabled
    if (this.config.show_energy_section) {
      // SECTION: Energy Chart Settings
      this._addSectionTitle(form as HTMLElement, 'Energy Chart Y-Axis Settings');

      // Energy Y-Axis Title
      const energyYTitleRow = this._createRow();
      const energyYTitleField = document.createElement('ha-textfield') as HaFormElement;
      energyYTitleField.className = 'value';
      energyYTitleField.label = 'Y-Axis Title';
      energyYTitleField.value = this.config.energy_chart_options?.y_axis?.title || 'Energy';
      energyYTitleField.configValue = 'energy_chart_options.y_axis.title';
      energyYTitleField.addEventListener('change', this.valueChanged);
      energyYTitleRow.appendChild(energyYTitleField);
      form.appendChild(energyYTitleRow);

      // Energy Y-Axis Unit
      const energyYUnitRow = this._createRow();
      const energyYUnitField = document.createElement('ha-textfield') as HaFormElement;
      energyYUnitField.className = 'value';
      energyYUnitField.label = 'Y-Axis Unit';
      energyYUnitField.value = this.config.energy_chart_options?.y_axis?.unit || 'kWh';
      energyYUnitField.configValue = 'energy_chart_options.y_axis.unit';
      energyYUnitField.addEventListener('change', this.valueChanged);
      energyYUnitRow.appendChild(energyYUnitField);
      form.appendChild(energyYUnitRow);

      // Energy Y-Axis Decimals
      const energyYDecimalsRow = this._createRow();
      const energyYDecimalsField = document.createElement('ha-textfield') as HaFormElement;
      energyYDecimalsField.className = 'value';
      energyYDecimalsField.label = 'Y-Axis Decimals';
      energyYDecimalsField.type = 'number';
      energyYDecimalsField.min = '0';
      energyYDecimalsField.max = '5';
      energyYDecimalsField.value = String(this.config.energy_chart_options?.y_axis?.decimals ?? 2);
      energyYDecimalsField.configValue = 'energy_chart_options.y_axis.decimals';
      energyYDecimalsField.addEventListener('change', this.valueChanged);
      energyYDecimalsRow.appendChild(energyYDecimalsField);
      form.appendChild(energyYDecimalsRow);

      // Energy Y-Axis Min
      const energyYMinRow = this._createRow();
      const energyYMinField = document.createElement('ha-textfield') as HaFormElement;
      energyYMinField.className = 'value';
      energyYMinField.label = 'Y-Axis Minimum (empty for auto)';
      energyYMinField.type = 'number';
      energyYMinField.value = this.config.energy_chart_options?.y_axis?.min !== undefined ? 
        String(this.config.energy_chart_options.y_axis.min) : '';
      energyYMinField.configValue = 'energy_chart_options.y_axis.min';
      energyYMinField.addEventListener('change', this.valueChanged);
      energyYMinRow.appendChild(energyYMinField);
      form.appendChild(energyYMinRow);

      // Energy Y-Axis Max
      const energyYMaxRow = this._createRow();
      const energyYMaxField = document.createElement('ha-textfield') as HaFormElement;
      energyYMaxField.className = 'value';
      energyYMaxField.label = 'Y-Axis Maximum (empty for auto)';
      energyYMaxField.type = 'number';
      energyYMaxField.value = this.config.energy_chart_options?.y_axis?.max !== undefined ? 
        String(this.config.energy_chart_options.y_axis.max) : '';
      energyYMaxField.configValue = 'energy_chart_options.y_axis.max';
      energyYMaxField.addEventListener('change', this.valueChanged);
      energyYMaxRow.appendChild(energyYMaxField);
      form.appendChild(energyYMaxRow);
    }
  }

  private _createRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'row';
    return row;
  }

  private _addSectionTitle(parent: HTMLElement, title: string) {
    const titleEl = document.createElement('div');
    titleEl.className = 'title';
    titleEl.textContent = title;
    parent.appendChild(titleEl);
  }
}

// Register the editor with the custom elements registry
customElements.define('energy-dashboard-chart-card-editor', EnergyDashboardChartCardEditor);