/**
 * Main component for the Energy Dashboard Chart Card.
 * Renders power and energy charts, handles user interaction, and manages chart configuration.
 * Designed for Home Assistant custom dashboards.
 *
 * Key responsibilities:
 * - Display power/energy charts with configurable options
 * - Handle refresh, time range, and Y-axis controls
 * - Sync with entity selection from the entity card
 * - Manage chart state and updates
 */

import { createStyles, cardStyles } from './styles';
import { loadToggleStates } from './entity-utils';
import { EnergyDashboardChartConfig, getDefaultChartConfig } from './energy-dashboard-chart-config';

export class EnergyDashboardChartCard extends HTMLElement {
  private _hass: any;
  config?: EnergyDashboardChartConfig;
  private _root: ShadowRoot;
  private _powerChartEl: HTMLElement | null = null;
  private _energyChartEl: HTMLElement | null = null;
  private _updateTimer: number | null = null;
  private _powerEntities: string[] = [];
  private _energyEntities: string[] = [];
  private _isLoading: boolean = true;
  private _apexChartCardRegistered: boolean | null = null;
  private _currentRefreshInterval: number = 30;
  private _currentTimeRangeHours: number = 24;
  private _viewMode: 'power' | 'energy' = 'power';

  static get cardType() {
    return 'energy-dashboard-chart-card';
  }

  static get displayName() {
    return 'Energy Dashboard Chart';
  }

  static get description() {
    return 'Chart companion for the Energy Dashboard Entity Card';
  }

  static get icon() {
    return 'mdi:chart-line';
  }

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.appendChild(createStyles(cardStyles));
    const card = document.createElement('ha-card');
    this._root.appendChild(card);
  }

  private _loadViewMode(): 'power' | 'energy' {
    try {
      const stored = localStorage.getItem('energy-dashboard-view-mode');
      return (stored === 'power' || stored === 'energy') ? stored : 'power';
    } catch {
      return 'power';
    }
  }

  connectedCallback() {
    this._viewMode = this._loadViewMode();
    window.addEventListener('view-mode-changed', this._handleViewModeChange as EventListener);
    this._loadSelectedEntities();
    this._checkApexChartsRegistration();
    this._updateContent();
    this._stopUpdateInterval();
    setTimeout(() => {
      if (this._currentRefreshInterval > 0) {
        this._startUpdateInterval();
      }
    }, 1000);
  }

  disconnectedCallback() {
    this._stopUpdateInterval();
    window.removeEventListener('view-mode-changed', this._handleViewModeChange as EventListener);
  }

  private _handleViewModeChange = (event: CustomEvent) => {
    if (event.detail && event.detail.mode) {
      this._viewMode = event.detail.mode;
      this._updateContent();
    }
  }

  setConfig(config: Partial<EnergyDashboardChartConfig>) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
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
      title: config.title ?? 'Energy Dashboard Chart',
      show_header: config.show_header ?? true,
      show_state: config.show_state ?? true,
      show_toggle: config.show_toggle ?? true,
      auto_select_count: config.auto_select_count ?? 6,
      max_height: config.max_height ?? 400,
      show_energy_section: config.show_energy_section ?? true,
      energy_auto_select_count: config.energy_auto_select_count ?? 6,
      update_interval: config.update_interval ?? 30,
      y_axis_max_presets: config.y_axis_max_presets ?? [500, 3000, 9000],
    } as EnergyDashboardChartConfig;
    this._currentRefreshInterval = this.config.update_interval ?? 30;
    this._currentTimeRangeHours = this.config.hours_to_show ?? 24;
    this._loadSelectedEntities();
    this._isLoading = true;
    this._checkApexChartsRegistration();
  }

  static getConfigElement() {
    return document.createElement('energy-dashboard-chart-card-editor');
  }

  static getStubConfig() {
    return {
      ...getDefaultChartConfig(),
      title: 'Energy Dashboard Chart',
      show_header: true,
      show_energy_section: true,
    };
  }

  getCardSize() {
    return this.config?.chart_height ? Math.ceil(this.config.chart_height / 50) : 6;
  }

  set hass(hass: any) {
    const firstUpdate = !this._hass;
    this._hass = hass;
    if (firstUpdate) {
      this._isLoading = false;
      this._updateContent();
    }
  }

  get hass() {
    return this._hass;
  }

  private _loadSelectedEntities() {
    const powerToggleStates = loadToggleStates('energy-dashboard-power-toggle-states');
    const energyToggleStates = loadToggleStates('energy-dashboard-energy-toggle-states');
    if (powerToggleStates) {
      this._powerEntities = Object.keys(powerToggleStates).filter(
        entityId => powerToggleStates[entityId]
      );
    }
    if (energyToggleStates) {
      this._energyEntities = Object.keys(energyToggleStates).filter(
        entityId => energyToggleStates[entityId]
      );
    }
  }

  private _startUpdateInterval() {
    this._stopUpdateInterval();
    const seconds = this._currentRefreshInterval;
    if (seconds > 0) {
      this._updateTimer = window.setInterval(() => {
        this._updateCharts();
      }, seconds * 1000);
    }
  }

  private _stopUpdateInterval() {
    if (this._updateTimer !== null) {
      window.clearInterval(this._updateTimer);
      this._updateTimer = null;
    }
  }

  private _generateApexchartsConfig(entities: string[], isEnergy: boolean) {
    if (!this.config || !entities.length || !this._hass) return null;
    const options = this.config.chart_options;
    const chartType = 'line';
    const hoursToShow = this.config.hours_to_show || 24;
    const showPoints = this.config.show_points || false;
    const showLegend = this.config.show_legend !== false;
    const smoothCurve = this.config.smooth_curve !== false;
    const strokeWidth = this.config.stroke_width || 2;
    const series = entities.map(entityId => ({
      entity: entityId,
      name: this._hass.states[entityId]?.attributes?.friendly_name || entityId
    }));
    let yMin = options?.y_axis?.min;
    let yMax = options?.y_axis?.max;
    let yTitle = options?.y_axis?.title || (isEnergy ? 'Energy (kWh)' : 'Power (W)');
    const decimals = options?.y_axis?.decimals !== undefined ? options.y_axis.decimals : (isEnergy ? 2 : 0);
    const apexChartCardConfig = {
      type: 'custom:apexcharts-card',
      header: { show: false },
      graph_span: `${hoursToShow}h`,
      chart_type: chartType,
      series,
      yaxis: [{
        ...(typeof yMin !== 'undefined' ? { min: yMin } : {}),
        ...(typeof yMax !== 'undefined' ? { max: yMax } : {}),
        decimals: decimals
      }],
      apex_config: {
        chart: {
          height: this.config.chart_height || 300,
          animations: { enabled: false },
          toolbar: {
            show: true,
            tools: {
              download: true,
              selection: true,
              zoom: true,
              zoomin: true,
              zoomout: true,
              pan: true,
              reset: true
            }
          }
        },
        yaxis: [{
          title: { 
            text: yTitle || '',
            style: {
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--primary-text-color, #000)'
            }
          },
          labels: { 
            formatter: (val: number) => val.toFixed(decimals),
            style: {
              fontSize: '11px',
              fontFamily: 'Helvetica, Arial, sans-serif',
              color: 'var(--secondary-text-color, #666)'
            }
          },
          axisTicks: {
            show: true,
            color: 'var(--divider-color, #e0e0e0)',
            width: 1
          },
          axisBorder: {
            show: true,
            color: 'var(--divider-color, #e0e0e0)',
            width: 1
          },
          crosshairs: {
            show: true,
            position: 'back',
            stroke: {
              color: 'var(--primary-color, #03a9f4)',
              width: 1,
              dashArray: 0
            }
          }
        }],
        grid: {
          show: true,
          borderColor: 'var(--divider-color, #e0e0e0)',
          strokeDashArray: 0,
          position: 'back',
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } },
          padding: { top: 0, right: 0, bottom: 0, left: 0 }
        },
        markers: { 
          size: showPoints ? 4 : 0,
          colors: ['var(--primary-color, #03a9f4)'],
          strokeColors: 'var(--card-background-color, #fff)',
          strokeWidth: 2
        },
        stroke: { 
          curve: smoothCurve ? 'smooth' : 'straight', 
          width: strokeWidth,
          lineCap: 'round'
        },
        legend: { 
          show: showLegend,
          position: 'bottom',
          fontSize: '12px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          labels: { colors: 'var(--primary-text-color, #000)' }
        },
        tooltip: {
          theme: 'light',
          style: {
            fontSize: '12px',
            fontFamily: 'Helvetica, Arial, sans-serif'
          }
        },
        states: {
          hover: { filter: { type: 'lighten', value: 0.1 } },
          active: { filter: { type: 'darken', value: 0.35 } }
        }
      }
    };
    return apexChartCardConfig;
  }

  private _createChart(isEnergy: boolean) {
    if (this._isLoading) {
      return this._createLoadingIndicator();
    }
    const entities = isEnergy ? this._energyEntities : this._powerEntities;
    if (!entities || entities.length === 0) {
      return this._createEmptyCard(isEnergy);
    }
    if (!this._hass) {
      return this._createLoadingIndicator();
    }
    const chartConfig = this._generateApexchartsConfig(entities, isEnergy);
    if (!chartConfig) {
      return this._createErrorMessage(
        `Failed to generate chart configuration for ${isEnergy ? 'energy' : 'power'} chart`,
        ['Check that all required entities exist in Home Assistant', 
         'Refresh the page and try again']
      );
    }
    const chartElement = document.createElement('div');
    chartElement.className = isEnergy ? 'energy-chart-container' : 'power-chart-container';
    chartElement.style.width = '100%';
    chartElement.style.marginBottom = '16px';
    chartElement.style.position = 'relative';
    chartElement.style.minHeight = `${this.config?.chart_height || 300}px`;
    try {
      if (this._apexChartCardRegistered === false) {
        return this._createErrorMessage(
          'The apexcharts-card integration is not installed',
          [
            'Install the apexcharts-card integration from HACS',
            'Make sure apexcharts-card is correctly loaded in your Home Assistant instance',
            'Refresh the page after installation to load the custom element'
          ]
        );
      }
      const apexCard = document.createElement('apexcharts-card') as HTMLElement;
      try {
        (apexCard as any).setConfig(chartConfig);
        (apexCard as any).hass = this._hass;
      } catch (configError) {
        return this._createErrorMessage(
          'Error configuring chart',
          ['The chart configuration is invalid', 
           'Check the console for more details']
        );
      }
      chartElement.appendChild(apexCard);
    } catch (err) {
      return this._createErrorMessage(
        `Error: ${err instanceof Error ? err.message : 'Failed to create chart'}`,
        [
          'Check that apexcharts-card is installed correctly',
          'Make sure all entities exist in Home Assistant',
          'Check the console for more detailed error information'
        ]
      );
    }
    return chartElement;
  }

  private _createEmptyCard(isEnergy: boolean) {
    const container = document.createElement('div');
    container.className = 'empty-chart-container';
    container.style.padding = '16px';
    container.style.textAlign = 'center';
    container.style.color = 'var(--secondary-text-color)';
    container.style.height = `${(this.config?.chart_height || 300) - 32}px`;
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.flexDirection = 'column';
    container.style.border = '1px dashed var(--divider-color)';
    container.style.borderRadius = '8px';
    container.style.margin = '8px 16px';
    const icon = document.createElement('ha-icon');
    icon.setAttribute('icon', 'mdi:chart-line-variant');
    icon.style.marginBottom = '8px';
    icon.style.color = 'var(--secondary-text-color)';
    icon.style.width = '48px';
    icon.style.height = '48px';
    const message = document.createElement('div');
    message.textContent = `No ${isEnergy ? 'energy' : 'power'} entities selected. Please select entities in the Energy Dashboard Entity Card.`;
    container.appendChild(icon);
    container.appendChild(message);
    return container;
  }

  private _createLoadingIndicator(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'loading-container';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.height = `${this.config?.chart_height || 200}px`;
    container.style.width = '100%';
    container.style.transition = 'opacity 0.3s ease-in-out';
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
      <style>
        @keyframes spinner {
          to { transform: rotate(360deg); }
        }
        .loading-spinner:before {
          content: '';
          box-sizing: border-box;
          position: absolute;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2px solid var(--secondary-text-color);
          border-top-color: var(--primary-color);
          animation: spinner 0.8s linear infinite;
        }
      </style>
    `;
    spinner.style.position = 'relative';
    spinner.style.width = '30px';
    spinner.style.height = '30px';
    spinner.style.marginBottom = '16px';
    const text = document.createElement('div');
    text.textContent = 'Initializing chart...';
    text.style.color = 'var(--secondary-text-color)';
    text.style.fontSize = '0.9em';
    container.appendChild(spinner);
    container.appendChild(text);
    return container;
  }

  private _createErrorMessage(error: string, suggestions: string[]): HTMLElement {
    const container = document.createElement('div');
    container.className = 'error-container';
    container.style.padding = '16px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.height = `${(this.config?.chart_height || 200) - 32}px`;
    container.style.border = '1px dashed var(--error-color, red)';
    container.style.borderRadius = '8px';
    container.style.margin = '8px 16px';
    const icon = document.createElement('ha-icon');
    icon.setAttribute('icon', 'mdi:alert-circle-outline');
    icon.style.color = 'var(--error-color, red)';
    icon.style.width = '40px';
    icon.style.height = '40px';
    icon.style.marginBottom = '8px';
    const errorText = document.createElement('div');
    errorText.textContent = error;
    errorText.style.color = 'var(--error-color, red)';
    errorText.style.fontWeight = 'bold';
    errorText.style.marginBottom = '8px';
    const suggestionsList = document.createElement('ul');
    suggestionsList.style.color = 'var(--secondary-text-color)';
    suggestionsList.style.textAlign = 'left';
    suggestionsList.style.margin = '8px 0';
    suggestionsList.style.paddingLeft = '20px';
    suggestions.forEach(suggestion => {
      const item = document.createElement('li');
      item.textContent = suggestion;
      item.style.marginBottom = '4px';
      suggestionsList.appendChild(item);
    });
    container.appendChild(icon);
    container.appendChild(errorText);
    container.appendChild(suggestionsList);
    return container;
  }

  private _updateCharts() {
    if (!this._hass || this._isLoading || this._apexChartCardRegistered === false) {
      return;
    }
    this._loadSelectedEntities();
    const powerChartContainer = this._root.querySelector('.power-chart-placeholder');
    if (powerChartContainer) {
      const existingPowerChart = powerChartContainer.querySelector('apexcharts-card') as any;
      if (existingPowerChart) {
        const updatedChartConfig = this._generateApexchartsConfig(this._powerEntities, false);
        if (updatedChartConfig) {
          try {
            existingPowerChart.setConfig(updatedChartConfig);
            existingPowerChart.hass = this._hass;
          } catch (err) {}
        }
      } else {
        const newPowerChart = this._createChart(false);
        powerChartContainer.innerHTML = '';
        powerChartContainer.appendChild(newPowerChart);
        this._powerChartEl = newPowerChart;
      }
    } else if (!this._powerChartEl) {
      const card = this._root.querySelector('ha-card .chart-container');
      if (card) {
        const powerSectionTitle = card.querySelector('.section-title:not([data-energy])');
        if (powerSectionTitle) {
          const placeholder = document.createElement('div');
          placeholder.className = 'power-chart-placeholder';
          const newChart = this._createChart(false);
          placeholder.appendChild(newChart);
          powerSectionTitle.after(placeholder);
          this._powerChartEl = newChart;
        }
      }
    }
    const energyChartContainer = this._root.querySelector('.energy-chart-placeholder');
    if (this.config?.show_energy_section) {
      if (energyChartContainer) {
        const existingEnergyChart = energyChartContainer.querySelector('apexcharts-card') as any;
        if (existingEnergyChart) {
          const updatedChartConfig = this._generateApexchartsConfig(this._energyEntities, true);
          if (updatedChartConfig) {
            try {
              existingEnergyChart.setConfig(updatedChartConfig);
              existingEnergyChart.hass = this._hass;
            } catch (err) {}
          }
        } else {
          const newEnergyChart = this._createChart(true);
          energyChartContainer.innerHTML = '';
          energyChartContainer.appendChild(newEnergyChart);
          this._energyChartEl = newEnergyChart;
        }
      } else if (!this._energyChartEl) {
        const card = this._root.querySelector('ha-card .chart-container');
        if (card) {
          const energySectionTitle = card.querySelector('.section-title[data-energy]');
          if (energySectionTitle) {
            const placeholder = document.createElement('div');
            placeholder.className = 'energy-chart-placeholder';
            const newChart = this._createChart(true);
            placeholder.appendChild(newChart);
            energySectionTitle.after(placeholder);
            this._energyChartEl = newChart;
          }
        }
      }
    } else {
      energyChartContainer?.remove();
      this._energyChartEl = null;
      this._root.querySelector('.section-title[data-energy]')?.remove();
      this._root.querySelector('.section-separator')?.remove();
    }
  }

  private _renderSectionTitle(title: string, isEnergy: boolean = false): HTMLElement {
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'section-title';
    sectionTitle.textContent = title;
    if (isEnergy) {
      sectionTitle.dataset.energy = 'true';
    }
    sectionTitle.style.padding = '8px 16px';
    sectionTitle.style.fontSize = 'var(--section-title-font-size, 1rem)';
    sectionTitle.style.fontWeight = '500';
    return sectionTitle;
  }

  private _updateContent() {
    if (!this.config) {
      const card = this._root.querySelector('ha-card');
      if (card) {
        card.innerHTML = '<div class="empty-message">Card not configured</div>';
      }
      return;
    }
    const card = this._root.querySelector('ha-card') as HTMLElement;
    if (!card) return;
    card.innerHTML = '';
    card.style.paddingTop = '';
    if (this.config.show_header) {
      const header = document.createElement('div');
      header.className = 'card-header';
      header.textContent = this.config.title;
      card.appendChild(header);
    } else {
      card.style.paddingTop = 'var(--card-padding, 0px)';
    }
    if (this._isLoading) {
      const loadingIndicator = this._createLoadingIndicator();
      card.appendChild(loadingIndicator);
      return;
    }
    if (this._apexChartCardRegistered === false) {
      const errorMessage = this._createErrorMessage(
        'The apexcharts-card integration is not installed',
        [
          'Install the apexcharts-card integration from HACS',
          'Make sure apexcharts-card is correctly loaded in your Home Assistant instance',
          'Refresh the page after installation to load the custom element'
        ]
      );
      card.appendChild(errorMessage);
      return;
    }
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'controls-container';
    const createGroup = (labelText: string, controls: HTMLElement): HTMLElement => {
      const group = document.createElement('div');
      group.className = 'pill-group';
      group.style.display = 'flex';
      group.style.flexDirection = 'column';
      group.style.alignItems = 'center';
      group.style.margin = '0';
      group.style.padding = '0';
      const label = document.createElement('div');
      label.className = 'pill-label';
      label.textContent = labelText;
      label.style.textAlign = 'center';
      group.appendChild(label);
      group.appendChild(controls);
      return group;
    };
    const refreshControls = this._createRefreshRatePillControls();
    const timeRangeControls = this._createTimeRangeControls();
    const yAxisControls = this._createYAxisControls();
    [refreshControls, timeRangeControls, yAxisControls].forEach(row => {
      row.style.gap = '0';
      row.style.margin = '0';
      row.style.padding = '0';
    });
    controlsContainer.appendChild(createGroup('Refresh Rate', refreshControls));
    controlsContainer.appendChild(createGroup('Time Range', timeRangeControls));
    controlsContainer.appendChild(createGroup('Max Range', yAxisControls));
    card.appendChild(controlsContainer);
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.style.width = '100%';
    chartContainer.style.display = 'flex';
    chartContainer.style.flexDirection = 'column';
    chartContainer.style.marginTop = '8px';
    this._viewMode = this._loadViewMode();
    if (this._viewMode === 'power' || !this.config.show_energy_section) {
      chartContainer.appendChild(this._renderSectionTitle('Power Consumption'));
      const powerPlaceholder = document.createElement('div'); 
      powerPlaceholder.className = 'power-chart-placeholder';
      chartContainer.appendChild(powerPlaceholder);
      this._powerChartEl = null;
      this._energyChartEl = null;
    } else if (this._viewMode === 'energy' && this.config.show_energy_section) {
      chartContainer.appendChild(this._renderSectionTitle('Energy Consumption', true));
      const energyPlaceholder = document.createElement('div'); 
      energyPlaceholder.className = 'energy-chart-placeholder';
      chartContainer.appendChild(energyPlaceholder);
      this._energyChartEl = null;
      this._powerChartEl = null;
    }
    card.appendChild(chartContainer);
    setTimeout(() => this._updateCharts(), 0);
    setTimeout(() => this._startUpdateInterval(), 50);
    setTimeout(() => {
      this._updateRefreshRatePillControlsUI();
      this._updateTimeRangeControlsUI();
      this._updateYAxisControlsUI();
    }, 100);
  }

  private _setRefreshInterval(seconds: number) {
    if (this.config) {
      this.config.update_interval = seconds; 
    }
    this._currentRefreshInterval = seconds;
    this._updateRefreshRatePillControlsUI();
    this._stopUpdateInterval();
    this._updateCharts();
    this._startUpdateInterval();
  }

  private _setTimeRange(hours: number) {
    if (this.config) {
      this.config.hours_to_show = hours;
    }
    this._currentTimeRangeHours = hours;
    this._updateTimeRangeControlsUI();
    this._updateCharts();
  }

  private _manualRefresh() {
    this._updateCharts();
  }
  
  private _createRefreshRatePillControls(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'refresh-rate-controls pill-row';
    const manualBtn = document.createElement('button');
    manualBtn.className = 'pill-control refresh-rate-button manual-refresh';
    manualBtn.innerHTML = '<ha-icon icon="mdi:refresh"></ha-icon>';
    manualBtn.title = 'Manual Refresh';
    manualBtn.addEventListener('click', () => this._manualRefresh());
    container.appendChild(manualBtn);
    const offBtn = document.createElement('button');
    offBtn.className = 'pill-control refresh-rate-button';
    offBtn.textContent = 'Off';
    offBtn.dataset.rate = '0';
    offBtn.style.borderRadius = '0';
    offBtn.style.marginLeft = '-1px';
    offBtn.addEventListener('click', () => this._setRefreshInterval(0));
    container.appendChild(offBtn);
    const rates = [5, 15, 30, 60];
    rates.forEach((rate, idx) => {
      const btn = document.createElement('button');
      btn.className = 'pill-control refresh-rate-button';
      btn.textContent = `${rate}s`;
      btn.dataset.rate = rate.toString();
      btn.style.marginRight = '-1px';
      btn.style.borderRadius = idx === rates.length - 1 ? '0 16px 16px 0' : '0';
      btn.style.marginLeft = '-1px';
      btn.addEventListener('click', () => this._setRefreshInterval(rate));
      container.appendChild(btn);
    });
    this._updateRefreshRatePillControlsUI(container);
    return container;
  }

  private _updateRefreshRatePillControlsUI(container?: HTMLElement) {
    const controls = container || this._root.querySelector('.refresh-rate-controls');
    if (!controls) return;
    const buttons = controls.querySelectorAll('.refresh-rate-button');
    buttons.forEach(btn => {
      const button = btn as HTMLElement;
      button.classList.remove('active');
      button.style.backgroundColor = 'var(--card-background-color, white)';
      button.style.color = 'var(--primary-text-color, #212121)';
      button.style.borderColor = 'var(--divider-color, #e0e0e0)';
    });
    const activeRate = this._currentRefreshInterval.toString();
    const activeButton = Array.from(buttons).find(btn => {
      const button = btn as HTMLElement;
      return button.dataset.rate === activeRate;
    }) as HTMLElement | undefined;
    if (activeButton) {
      activeButton.classList.add('active');
      activeButton.style.backgroundColor = 'var(--primary-color, #03a9f4)';
      activeButton.style.color = 'var(--text-primary-color, #fff)';
      activeButton.style.borderColor = 'var(--primary-color, #03a9f4)';
    }
  }

  private _updateTimeRangeControlsUI(container?: HTMLElement) {
    const controls = container || this._root.querySelector('.time-range-controls');
    if (!controls) return;
    const buttons = controls.querySelectorAll('.time-range-button');
    buttons.forEach(btn => {
      const button = btn as HTMLElement;
      button.classList.remove('active');
      button.style.backgroundColor = 'var(--card-background-color, white)';
      button.style.color = 'var(--primary-text-color, #212121)';
      button.style.borderColor = 'var(--divider-color, #e0e0e0)';
    });
    const activeButton = controls.querySelector(`.time-range-button[data-hours="${this._currentTimeRangeHours}"]`) as HTMLElement;
    if (activeButton) {
      activeButton.classList.add('active');
      activeButton.style.backgroundColor = 'var(--primary-color, #03a9f4)';
      activeButton.style.color = 'var(--text-primary-color, #fff)';
      activeButton.style.borderColor = 'var(--primary-color, #03a9f4)';
    }
  }

  private _updateYAxisControlsUI(container?: HTMLElement) {
    const controls = container || this._root.querySelector('.y-axis-controls');
    if (!controls) return;
    const yAxis = this.config?.chart_options?.y_axis;
    const currentMax = yAxis && typeof yAxis.max !== 'undefined' ? yAxis.max : 'auto';
    const currentMaxStr = currentMax === undefined ? 'auto' : String(currentMax);
    const buttons = controls.querySelectorAll('.yaxis-button');
    buttons.forEach(btn => {
      const button = btn as HTMLElement;
      button.classList.remove('active');
      button.style.backgroundColor = 'var(--card-background-color, white)';
      button.style.color = 'var(--primary-text-color, #212121)';
      button.style.borderColor = 'var(--divider-color, #e0e0e0)';
    });
    const activeButton = controls.querySelector(`.yaxis-button[data-yaxis="${currentMaxStr}"]`) as HTMLElement;
    if (activeButton) {
      activeButton.classList.add('active');
      activeButton.style.backgroundColor = 'var(--primary-color, #03a9f4)';
      activeButton.style.color = 'var(--text-primary-color, #fff)';
      activeButton.style.borderColor = 'var(--primary-color, #03a9f4)';
    }
  }

  private _setYAxisMax(maxValue: string) {
    if (!this.config) return;
    if (!this.config.chart_options) this.config.chart_options = { y_axis: {} };
    if (!this.config.chart_options.y_axis) this.config.chart_options.y_axis = {};
    this.config.chart_options.y_axis.max = maxValue === 'auto' ? undefined : Number(maxValue);
    this._updateYAxisControlsUI();
    this._updateCharts();
  }

  private _createTimeRangeControls(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'time-range-controls pill-row';
    const timeRanges = [
      { label: '1h', hours: 1 },
      { label: '3h', hours: 3 },
      { label: '12h', hours: 12 },
      { label: '24h', hours: 24 },
      { label: '3d', hours: 72 },
      { label: '1w', hours: 168 }
    ];
    timeRanges.forEach((range, index) => {
      const btn = document.createElement('button');
      btn.className = 'pill-control time-range-button';
      btn.textContent = range.label;
      btn.dataset.hours = String(range.hours);
      btn.style.borderRadius =
        index === 0 ? '16px 0 0 16px' :
        index === timeRanges.length - 1 ? '0 16px 16px 0' : '0';
      btn.style.marginLeft = index > 0 ? '-1px' : '0';
      btn.style.minWidth = '36px';
      btn.style.height = '26px';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.fontSize = '0.95em';
      btn.style.letterSpacing = '0.01em';
      btn.style.padding = '0';
      btn.addEventListener('click', () => this._setTimeRange(range.hours));
      if (this._currentTimeRangeHours === range.hours) {
        btn.classList.add('active');
      }
      container.appendChild(btn);
    });
    return container;
  }

  private _createYAxisControls(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'y-axis-controls pill-row';
    const presets = this.config?.y_axis_max_presets || [500, 3000, 9000];
    const yAxisPresets = [
      { label: 'Auto', value: 'auto' },
      ...presets.map(v => ({ label: String(v), value: String(v) }))
    ];
    const yAxis = this.config?.chart_options?.y_axis;
    const currentMax = yAxis && typeof yAxis.max !== 'undefined' ? yAxis.max : 'auto';
    const currentMaxStr = currentMax === undefined ? 'auto' : String(currentMax);
    yAxisPresets.forEach((preset, index) => {
      const btn = document.createElement('button');
      btn.className = 'pill-control yaxis-button';
      btn.textContent = preset.label;
      btn.dataset.yaxis = preset.value;
      btn.style.borderRadius =
        index === 0 ? '16px 0 0 16px' :
        index === yAxisPresets.length - 1 ? '0 16px 16px 0' : '0';
      btn.style.marginLeft = index > 0 ? '-1px' : '0';
      btn.style.minWidth = '36px';
      btn.style.height = '26px';
      btn.addEventListener('click', () => this._setYAxisMax(preset.value));
      if (currentMaxStr === preset.value) {
        btn.classList.add('active');
      }
      container.appendChild(btn);
    });
    return container;
  }

  private _checkApexChartsRegistration() {
    const isRegistered = customElements.get('apexcharts-card') !== undefined;
    this._apexChartCardRegistered = !!isRegistered;
    if (!this._isLoading) {
      this._updateContent();
    }
  }
}

customElements.define('energy-dashboard-chart-card', EnergyDashboardChartCard);