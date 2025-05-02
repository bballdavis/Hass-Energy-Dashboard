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
    const defaultConfig = getDefaultChartConfig();
    this.config = {
      ...defaultConfig,
      ...config,
      chart_options: {
        ...defaultConfig.chart_options,
        ...(config.chart_options || {}),
        y_axis: {
          ...defaultConfig.chart_options?.y_axis,
          ...(config.chart_options?.y_axis || {})
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
      y_axis_max_presets: config.y_axis_max_presets ?? [500, 3000, 9000],
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

    // Handle nested properties like chart_options.y_axis.title
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
    strokeWidthInput.step = '0.25';
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

    // SECTION: Y-Axis Settings
    this._addSectionTitle(form as HTMLElement, 'Y-Axis Settings');

    // Y-Axis Title
    const yTitleRow = this._createRow();
    const yTitleField = document.createElement('ha-textfield') as HaFormElement;
    yTitleField.className = 'value';
    yTitleField.label = 'Y-Axis Title';
    yTitleField.value = this.config.chart_options?.y_axis?.title || '';
    yTitleField.configValue = 'chart_options.y_axis.title';
    yTitleField.addEventListener('change', this.valueChanged);
    yTitleRow.appendChild(yTitleField);
    form.appendChild(yTitleRow);

    // Y-Axis Unit
    const yUnitRow = this._createRow();
    const yUnitField = document.createElement('ha-textfield') as HaFormElement;
    yUnitField.className = 'value';
    yUnitField.label = 'Y-Axis Unit';
    yUnitField.value = this.config.chart_options?.y_axis?.unit || '';
    yUnitField.configValue = 'chart_options.y_axis.unit';
    yUnitField.addEventListener('change', this.valueChanged);
    yUnitRow.appendChild(yUnitField);
    form.appendChild(yUnitRow);

    // Y-Axis Decimals
    const yDecimalsRow = this._createRow();
    const yDecimalsField = document.createElement('ha-textfield') as HaFormElement;
    yDecimalsField.className = 'value';
    yDecimalsField.label = 'Y-Axis Decimals';
    yDecimalsField.type = 'number';
    yDecimalsField.min = '0';
    yDecimalsField.max = '5';
    yDecimalsField.value = String(this.config.chart_options?.y_axis?.decimals ?? 1);
    yDecimalsField.configValue = 'chart_options.y_axis.decimals';
    yDecimalsField.addEventListener('change', this.valueChanged);
    yDecimalsRow.appendChild(yDecimalsField);
    form.appendChild(yDecimalsRow);

    // Y-Axis Min
    const yMinRow = this._createRow();
    const yMinField = document.createElement('ha-textfield') as HaFormElement;
    yMinField.className = 'value';
    yMinField.label = 'Y-Axis Minimum (empty for auto)';
    yMinField.type = 'number';
    yMinField.value = this.config.chart_options?.y_axis?.min !== undefined ? String(this.config.chart_options.y_axis.min) : '';
    yMinField.configValue = 'chart_options.y_axis.min';
    yMinField.addEventListener('change', this.valueChanged);
    yMinRow.appendChild(yMinField);
    form.appendChild(yMinRow);

    // Y-Axis Max
    const yMaxRow = this._createRow();
    const yMaxField = document.createElement('ha-textfield') as HaFormElement;
    yMaxField.className = 'value';
    yMaxField.label = 'Y-Axis Maximum (empty for auto)';
    yMaxField.type = 'number';
    yMaxField.value = this.config.chart_options?.y_axis?.max !== undefined ? String(this.config.chart_options.y_axis.max) : '';
    yMaxField.configValue = 'chart_options.y_axis.max';
    yMaxField.addEventListener('change', this.valueChanged);
    yMaxRow.appendChild(yMaxField);
    form.appendChild(yMaxRow);

    // Y-Axis Max Presets
    const yMaxPresetsRow = this._createRow();
    const yMaxPresetsLabel = document.createElement('div');
    yMaxPresetsLabel.textContent = 'Y-Axis Max Presets (comma separated)';
    const yMaxPresetsInput = document.createElement('input');
    yMaxPresetsInput.className = 'value';
    yMaxPresetsInput.type = 'text';
    yMaxPresetsInput.value = (this.config.y_axis_max_presets || [500, 3000, 9000]).join(', ');
    yMaxPresetsInput.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value;
      const arr = val.split(',').map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v));
      this.config = { ...this.config as EnergyDashboardChartConfig, y_axis_max_presets: arr };
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
    });
    yMaxPresetsRow.appendChild(yMaxPresetsLabel);
    yMaxPresetsRow.appendChild(yMaxPresetsInput);
    form.appendChild(yMaxPresetsRow);
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