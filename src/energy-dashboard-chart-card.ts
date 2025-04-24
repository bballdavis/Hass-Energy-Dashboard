import { createStyles, cardStyles } from './styles';
import { loadToggleStates } from './entity-utils';
import { EnergyDashboardChartConfig, getDefaultChartConfig } from './energy-dashboard-chart-config';

export class EnergyDashboardChartCard extends HTMLElement {
  // Properties
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
  private _currentRefreshInterval: number = 30; // Default to 30 seconds
  private _currentTimeRangeHours: number = 24; // Default to 24 hours

  // Define card name and icon for card picker
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
    
    // Create the card element
    const card = document.createElement('ha-card');
    this._root.appendChild(card);
  }

  // Called when the element is added to the DOM
  connectedCallback() {
    this._loadSelectedEntities();
    this._checkApexChartsRegistration();
    
    // First update the content without starting the timer
    this._updateContent();
    
    // Cancel and reset any existing timers and configuration
    this._stopUpdateInterval();
    
    // Wait until the content is fully loaded before starting timers
    // This ensures all chart elements have properly initialized
    setTimeout(() => {
      // Only start the update timer if explicitly set
      if (this._currentRefreshInterval > 0) {
        this._startUpdateInterval();
      }
    }, 1000); // Longer timeout to ensure everything is properly loaded
  }

  disconnectedCallback() {
    this._stopUpdateInterval();
  }

  // Home Assistant specific method to set config
  setConfig(config: Partial<EnergyDashboardChartConfig>) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    
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
      // Set update_interval default to 30 seconds if not specified
      update_interval: config.update_interval ?? 30,
    } as EnergyDashboardChartConfig;
    
    // Set the current refresh interval from config
    this._currentRefreshInterval = this.config.update_interval ?? 30;
    this._currentTimeRangeHours = this.config.hours_to_show ?? 24;
    
    this._loadSelectedEntities();
    this._isLoading = true;
    this._checkApexChartsRegistration();
  }

  // Home Assistant specific methods
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

  // Called when Home Assistant updates
  set hass(hass: any) {
    const firstUpdate = !this._hass;
    this._hass = hass;
    
    if (firstUpdate) {
      // When we get hass for the first time, end the loading state
      this._isLoading = false;
      this._updateContent();
    }
  }

  get hass() {
    return this._hass;
  }

  private _loadSelectedEntities() {
    // Load the toggle states from localStorage to get the entities selected in the entity card
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
    this._stopUpdateInterval(); // Ensure no duplicate timers

    const seconds = this._currentRefreshInterval;

    if (seconds > 0) {
      this._updateTimer = window.setInterval(() => {
        console.log(`Timer triggered: Refreshing charts (Interval: ${seconds}s)`);
        this._updateCharts();
      }, seconds * 1000);
      console.log(`Update timer started with interval: ${seconds}s`);
    } else {
      console.log('Update timer not started (interval is 0).');
    }
  }

  private _stopUpdateInterval() {
    if (this._updateTimer !== null) {
      window.clearInterval(this._updateTimer);
      this._updateTimer = null;
      console.log('Update timer stopped.');
    }
  }

  private _generateApexchartsConfig(entities: string[], isEnergy: boolean) {
    if (!this.config || !entities.length || !this._hass) return null;

    const options = isEnergy
      ? this.config.energy_chart_options
      : this.config.power_chart_options;

    const chartType = this.config.chart_type || 'line';
    const hoursToShow = this.config.hours_to_show || 24;
    const showPoints = this.config.show_points || false;
    const showLegend = this.config.show_legend !== false;
    const smoothCurve = this.config.smooth_curve !== false;

    // Strictly minimal series config matching apexcharts-card schema
    const series = entities.map(entityId => ({
      entity: entityId,
      name: this._hass.states[entityId]?.attributes?.friendly_name || entityId
    }));

    // --- Y Axis Auto-Range Logic ---
    let yMin = options?.y_axis?.min;
    let yMax = options?.y_axis?.max;
    let yTitle = isEnergy ? 'Energy (kWh)' : 'Power (W)';
    if (options?.y_axis?.title) yTitle = options.y_axis.title;

    // Only auto-range if min/max are not set in config
    if (typeof yMin === 'undefined' || typeof yMax === 'undefined') {
      let values: number[] = [];
      for (const entityId of entities) {
        const state = this._hass.states[entityId]?.state;
        const num = Number(state);
        if (!isNaN(num)) values.push(num);
      }
      if (values.length > 0) {
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        
        // Set minimum to 0 for power, or round down to nearest 100 for energy
        yMin = isEnergy ? Math.floor(minVal / 100) * 100 : 0;
        
        // Round up to next 100 and add 100 more for better visualization
        yMax = Math.ceil(maxVal / 100) * 100 + 100;
      } else {
        yMin = 0;
        yMax = 200; // Default to 0-200 range if no data
      }
    }

    // Calculate grid intervals to ensure major lines at intervals of 100
    const range = yMax - yMin;
    const tickAmount = Math.ceil(range / 100) * 2; // Major lines every 100, minor every 50

    // Minimal config object matching apexcharts-card schema
    const apexChartCardConfig = {
      type: 'custom:apexcharts-card',
      header: {
        show: false
      },
      graph_span: `${hoursToShow}h`,
      chart_type: chartType,
      series,
      yaxis: [{
        min: yMin,
        max: yMax,
        decimals: 0 // Always use whole numbers
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
          tickAmount,
          title: { text: yTitle },
          labels: { 
            formatter: (val: number) => val.toFixed(0)
          },
          axisTicks: {
            show: true
          },
          axisBorder: {
            show: true
          },
          grid: {
            show: true
          }
        }],
        grid: {
          show: true,
          borderColor: '#90A4AE30',
          strokeDashArray: 0,
          position: 'back',
          xaxis: {
            lines: {
              show: false
            }
          },
          yaxis: {
            lines: {
              show: true
            }
          }
        },
        markers: { size: showPoints ? 4 : 0 },
        stroke: { curve: smoothCurve ? 'smooth' : 'straight', width: 2 },
        legend: { show: showLegend }
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
        console.error('Error configuring apexcharts-card:', configError);
        return this._createErrorMessage(
          'Error configuring chart',
          ['The chart configuration is invalid', 
           'Check the console for more details']
        );
      }
      
      chartElement.appendChild(apexCard);
    } catch (err) {
      console.error(`Error creating ${isEnergy ? 'energy' : 'power'} chart:`, err);
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
    console.log("Executing _updateCharts: Updating chart elements.");
    if (!this._hass || this._isLoading || this._apexChartCardRegistered === false) {
      console.log("Skipping _updateCharts: Hass not ready, loading, or apexcharts-card not registered.");
      return;
    }

    // Always reload selected entities to ensure we have the latest selection
    this._loadSelectedEntities();

    const powerChartContainer = this._root.querySelector('.power-chart-placeholder');
    if (powerChartContainer) {
      // Check for existing apexcharts-card element
      const existingPowerChart = powerChartContainer.querySelector('apexcharts-card') as any;
      
      if (existingPowerChart) {
        console.log("Refreshing existing power chart.");
        
        // Generate updated chart config with latest entity selections
        const updatedChartConfig = this._generateApexchartsConfig(this._powerEntities, false);
        
        if (updatedChartConfig) {
          // Update the chart config with latest entity selections
          try {
            existingPowerChart.setConfig(updatedChartConfig);
            existingPowerChart.hass = this._hass;
          } catch (err) {
            console.warn("Failed to update chart config:", err);
          }
        }
      } else {
        console.log("Creating new power chart (no existing chart found).");
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
          console.log("Creating initial power chart (fallback).");
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
        // Check for existing apexcharts-card element
        const existingEnergyChart = energyChartContainer.querySelector('apexcharts-card') as any;
        
        if (existingEnergyChart) {
          console.log("Refreshing existing energy chart.");
          
          // Generate updated chart config with latest entity selections
          const updatedChartConfig = this._generateApexchartsConfig(this._energyEntities, true);
          
          if (updatedChartConfig) {
            // Update the chart config with latest entity selections
            try {
              existingEnergyChart.setConfig(updatedChartConfig);
              existingEnergyChart.hass = this._hass;
            } catch (err) {
              console.warn("Failed to update chart config:", err);
            }
          }
        } else {
          console.log("Creating new energy chart (no existing chart found).");
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
            console.log("Creating initial energy chart (fallback).");
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

    const card = this._root.querySelector('ha-card');
    if (!card) return;

    card.innerHTML = '';

    if (this.config.show_header) {
      const header = document.createElement('div');
      header.className = 'card-header';
      header.textContent = this.config.title;
      card.appendChild(header);
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
    
    const refreshControls = this._createRefreshControls();
    card.appendChild(refreshControls);

    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.style.width = '100%';
    chartContainer.style.display = 'flex';
    chartContainer.style.flexDirection = 'column';
    
    chartContainer.appendChild(this._renderSectionTitle('Power Consumption'));
    const powerPlaceholder = document.createElement('div'); 
    powerPlaceholder.className = 'power-chart-placeholder';
    chartContainer.appendChild(powerPlaceholder);
    this._powerChartEl = null;
    
    if (this.config.show_energy_section) {
      const separator = document.createElement('div');
      separator.className = 'section-separator';
      separator.style.margin = '16px 8px';
      chartContainer.appendChild(separator);
      
      chartContainer.appendChild(this._renderSectionTitle('Energy Consumption', true));
      const energyPlaceholder = document.createElement('div'); 
      energyPlaceholder.className = 'energy-chart-placeholder';
      chartContainer.appendChild(energyPlaceholder);
      this._energyChartEl = null;
    } else {
      this._energyChartEl = null;
    }
    
    card.appendChild(chartContainer);

    setTimeout(() => this._updateCharts(), 0);
    setTimeout(() => this._startUpdateInterval(), 50);
  }

  private _checkApexChartsRegistration() {
    if (this._apexChartCardRegistered !== null) return;

    this._isLoading = true;

    setTimeout(() => {
      this._apexChartCardRegistered = !!customElements.get('apexcharts-card');
      console.log(`ApexCharts registration check: ${this._apexChartCardRegistered}`);
      this._isLoading = false;
      this._updateContent();
    }, 500);
  }

  private _setRefreshInterval(seconds: number) {
    console.log(`Setting refresh interval to: ${seconds} seconds`);
    if (this.config) {
      this.config.update_interval = seconds; 
    }
    this._currentRefreshInterval = seconds;
    this._updateRefreshControlsUI();

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
    console.log("Manual refresh triggered.");
    this._updateCharts();
  }
  
  private _createRefreshControls(): HTMLElement {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'refresh-controls';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.justifyContent = 'space-between';
    controlsContainer.style.alignItems = 'center';
    controlsContainer.style.padding = '0 16px 8px';
    controlsContainer.style.gap = '8px';

    // --- Refresh Rate Controls ---
    const refreshTitle = document.createElement('div');
    refreshTitle.className = 'refresh-title';
    refreshTitle.textContent = 'Refresh Rate:';
    refreshTitle.style.fontWeight = '500';
    refreshTitle.style.fontSize = '0.9em';
    refreshTitle.style.marginRight = '8px';

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'buttons-container';
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.justifyContent = 'flex-end';
    buttonsContainer.style.alignItems = 'center';
    buttonsContainer.style.gap = '8px';

    // --- Time Range Controls ---
    const timeRangeTitle = document.createElement('div');
    timeRangeTitle.className = 'time-range-title';
    timeRangeTitle.textContent = 'Time Range:';
    timeRangeTitle.style.fontWeight = '500';
    timeRangeTitle.style.fontSize = '0.9em';
    timeRangeTitle.style.marginRight = '8px';

    const timeRangeContainer = document.createElement('div');
    timeRangeContainer.className = 'time-range-container';
    timeRangeContainer.style.display = 'flex';
    timeRangeContainer.style.justifyContent = 'flex-end';
    timeRangeContainer.style.alignItems = 'center';
    timeRangeContainer.style.gap = '8px';

    // Helper for both controls
    const createButton = (text: string, title: string, value?: string, isTimeRange?: boolean) => {
      const button = document.createElement('button');
      button.style.padding = '4px 8px';
      button.style.borderRadius = '4px';
      button.style.border = '1px solid var(--divider-color)';
      button.style.backgroundColor = 'var(--secondary-background-color)';
      button.style.color = 'var(--primary-text-color)';
      button.style.cursor = 'pointer';
      button.style.display = 'flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      button.style.transition = 'all 0.2s ease-in-out';
      button.style.minHeight = '32px';
      button.style.fontSize = '0.9em';
      button.title = title;
      if (text.includes('<ha-icon')) {
        const iconWrapper = document.createElement('div');
        iconWrapper.innerHTML = text;
        while (iconWrapper.firstChild) {
          button.appendChild(iconWrapper.firstChild);
        }
      } else {
        button.textContent = text;
      }
      if (isTimeRange && value !== undefined) {
        button.className = 'time-range-button control-button';
        button.dataset.hours = value;
        button.addEventListener('click', () => this._setTimeRange(Number(value)));
      } else if (!isTimeRange && value !== undefined) {
        button.className = 'interval-button control-button';
        button.dataset.seconds = value;
        button.addEventListener('click', () => this._setRefreshInterval(Number(value)));
      } else {
        button.className = 'refresh-button control-button';
        button.addEventListener('click', () => this._manualRefresh());
      }
      return button;
    };

    // Refresh rate buttons
    const refreshButton = createButton('<ha-icon icon="mdi:refresh"></ha-icon>', 'Refresh now');
    refreshButton.style.minWidth = '36px';
    refreshButton.style.width = '36px';
    const offButton = createButton('Off', 'Disable automatic refresh', '0');
    const sec15Button = createButton('15s', 'Refresh every 15 seconds', '15');
    const sec30Button = createButton('30s', 'Refresh every 30 seconds', '30');
    const sec60Button = createButton('60s', 'Refresh every 60 seconds', '60');
    buttonsContainer.appendChild(refreshButton);
    buttonsContainer.appendChild(offButton);
    buttonsContainer.appendChild(sec15Button);
    buttonsContainer.appendChild(sec30Button);
    buttonsContainer.appendChild(sec60Button);

    // Time range buttons (1h, 3h, 12h, 24h, 3d, 1w)
    const timeRanges = [
      { label: '1h', hours: 1 },
      { label: '3h', hours: 3 },
      { label: '12h', hours: 12 },
      { label: '24h', hours: 24 },
      { label: '3d', hours: 72 },
      { label: '1w', hours: 168 }
    ];
    timeRanges.forEach(range => {
      const btn = createButton(range.label, `Show last ${range.label}`, String(range.hours), true);
      timeRangeContainer.appendChild(btn);
    });

    // Layout: put both controls on the same line
    controlsContainer.appendChild(refreshTitle);
    controlsContainer.appendChild(buttonsContainer);
    controlsContainer.appendChild(timeRangeTitle);
    controlsContainer.appendChild(timeRangeContainer);

    this._updateRefreshControlsUI(buttonsContainer);
    this._updateTimeRangeControlsUI(timeRangeContainer);

    return controlsContainer;
  }

  private _updateRefreshControlsUI(container?: HTMLElement) {
    const controls = container || this._root.querySelector('.buttons-container');
    if (!controls) return;
    const buttons = controls.querySelectorAll('.interval-button');
    buttons.forEach(btn => {
      const button = btn as HTMLElement;
      button.style.backgroundColor = 'var(--secondary-background-color)';
      button.style.color = 'var(--primary-text-color)';
      button.style.borderColor = 'var(--divider-color)';
    });
    const activeButton = controls.querySelector(`.interval-button[data-seconds="${this._currentRefreshInterval}"]`) as HTMLElement;
    if (activeButton) {
      activeButton.style.backgroundColor = 'var(--primary-color)';
      activeButton.style.color = 'var(--text-primary-color)';
      activeButton.style.borderColor = 'var(--primary-color)';
    }
  }

  private _updateTimeRangeControlsUI(container?: HTMLElement) {
    const controls = container || this._root.querySelector('.time-range-container');
    if (!controls) return;
    const buttons = controls.querySelectorAll('.time-range-button');
    buttons.forEach(btn => {
      const button = btn as HTMLElement;
      button.style.backgroundColor = 'var(--secondary-background-color)';
      button.style.color = 'var(--primary-text-color)';
      button.style.borderColor = 'var(--divider-color)';
    });
    const activeButton = controls.querySelector(`.time-range-button[data-hours="${this._currentTimeRangeHours}"]`) as HTMLElement;
    if (activeButton) {
      activeButton.style.backgroundColor = 'var(--primary-color)';
      activeButton.style.color = 'var(--text-primary-color)';
      activeButton.style.borderColor = 'var(--primary-color)';
    }
  }
}

customElements.define('energy-dashboard-chart-card', EnergyDashboardChartCard);