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

// Define types for custom elements used in HA
interface HaSlider extends HTMLElement {
  min: string;
  max: string;
  step: string;
  value: string;
  style: CSSStyleDeclaration;
  addEventListener(event: string, handler: (event: Event) => void): void;
}

interface HaSwitch extends HTMLElement {
  checked: boolean;
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

    // SECTION: Chart Settings
    this._addSectionTitle(form as HTMLElement, 'Chart Settings');

    // Chart appearance options
    const chartAppearance = document.createElement('div');
    chartAppearance.innerHTML = '<div class="title">Chart Appearance</div>';
    
    // Chart Type
    const chartTypeRow = document.createElement('div');
    chartTypeRow.className = 'row';
    const chartTypeLabel = document.createElement('div');
    chartTypeLabel.textContent = 'Chart Type';
    
    const chartTypeSelect = document.createElement('select');
    chartTypeSelect.className = 'value';
    const chartTypes = ['line', 'area', 'bar'];
    chartTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.text = type.charAt(0).toUpperCase() + type.slice(1);
      option.selected = this.config?.chart_type === type;
      chartTypeSelect.appendChild(option);
    });
    chartTypeSelect.addEventListener('change', (e) => {
      this.config = { ...this.config as EnergyDashboardChartConfig, chart_type: (e.target as HTMLSelectElement).value };
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
    });
    
    chartTypeRow.appendChild(chartTypeLabel);
    chartTypeRow.appendChild(chartTypeSelect);
    chartAppearance.appendChild(chartTypeRow);
    
    // Chart Height
    const chartHeightRow = document.createElement('div');
    chartHeightRow.className = 'row';
    const chartHeightLabel = document.createElement('div');
    chartHeightLabel.textContent = 'Chart Height (px)';
    
    const chartHeightInput = document.createElement('input');
    chartHeightInput.className = 'value';
    chartHeightInput.type = 'number';
    chartHeightInput.min = '100';
    chartHeightInput.max = '1000';
    chartHeightInput.value = this.config?.chart_height?.toString() || '300';
    chartHeightInput.addEventListener('change', (e) => {
      this.config = { ...this.config as EnergyDashboardChartConfig, chart_height: Number((e.target as HTMLInputElement).value) };
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
    });
    
    chartHeightRow.appendChild(chartHeightLabel);
    chartHeightRow.appendChild(chartHeightInput);
    chartAppearance.appendChild(chartHeightRow);
    
    // Stroke Width slider
    const strokeWidthRow = document.createElement('div');
    strokeWidthRow.className = 'row';
    const strokeWidthLabel = document.createElement('div');
    strokeWidthLabel.textContent = 'Line Thickness';
    
    const strokeWidthContainer = document.createElement('div');
    strokeWidthContainer.className = 'value';
    strokeWidthContainer.style.display = 'flex';
    strokeWidthContainer.style.flexDirection = 'row';
    strokeWidthContainer.style.alignItems = 'center';
    
    const strokeWidthInput = document.createElement('ha-slider') as HaSlider;
    strokeWidthInput.min = '1';
    strokeWidthInput.max = '5';
    strokeWidthInput.step = '1';
    strokeWidthInput.value = (this.config?.stroke_width || 2).toString();
    strokeWidthInput.style.flex = '1';
    strokeWidthInput.addEventListener('change', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.config = { ...this.config as EnergyDashboardChartConfig, stroke_width: value };
      strokeWidthValueLabel.textContent = value.toString();
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
    });
    
    const strokeWidthValueLabel = document.createElement('span');
    strokeWidthValueLabel.textContent = (this.config?.stroke_width || 2).toString();
    strokeWidthValueLabel.style.minWidth = '20px';
    strokeWidthValueLabel.style.textAlign = 'right';
    strokeWidthValueLabel.style.marginLeft = '8px';
    
    strokeWidthContainer.appendChild(strokeWidthInput);
    strokeWidthContainer.appendChild(strokeWidthValueLabel);
    
    strokeWidthRow.appendChild(strokeWidthLabel);
    strokeWidthRow.appendChild(strokeWidthContainer);
    chartAppearance.appendChild(strokeWidthRow);
    
    // Show Points Toggle
    const showPointsRow = document.createElement('div');
    showPointsRow.className = 'row';
    const showPointsLabel = document.createElement('div');
    showPointsLabel.textContent = 'Show Data Points';
    
    const showPointsToggle = document.createElement('ha-switch') as HaSwitch;
    showPointsToggle.checked = this.config?.show_points || false;
    showPointsToggle.addEventListener('change', (e) => {
      this.config = { ...this.config as EnergyDashboardChartConfig, show_points: (e.target as HTMLInputElement).checked };
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
    });
    
    showPointsRow.appendChild(showPointsToggle);
    showPointsRow.appendChild(showPointsLabel);
    chartAppearance.appendChild(showPointsRow);
    
    // Smooth Curve Toggle
    const smoothCurveRow = document.createElement('div');
    smoothCurveRow.className = 'row';
    const smoothCurveLabel = document.createElement('div');
    smoothCurveLabel.textContent = 'Smooth Curve';
    
    const smoothCurveToggle = document.createElement('ha-switch') as HaSwitch;
    smoothCurveToggle.checked = this.config?.smooth_curve !== false; // True by default
    smoothCurveToggle.addEventListener('change', (e) => {
      this.config = { ...this.config as EnergyDashboardChartConfig, smooth_curve: (e.target as HTMLInputElement).checked };
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
    });
    
    smoothCurveRow.appendChild(smoothCurveToggle);
    smoothCurveRow.appendChild(smoothCurveLabel);
    chartAppearance.appendChild(smoothCurveRow);
    
    form.appendChild(chartAppearance);

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

    // SECTION: Energy Chart Settings - Always shown now
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