import { createStyles, cardStyles } from './styles';
import { loadToggleStates } from './entity-utils';
import { EnergyDashboardChartConfig, getDefaultChartConfig } from './energy-dashboard-chart-config';

// Gaussian smoothing utility
function gaussianSmooth(data: number[], window: number): number[] {
  if (window <= 1) return data;
  const sigma = window / 3;
  const kernel = [];
  const mean = Math.floor(window / 2);
  let sum = 0;
  for (let i = 0; i < window; i++) {
    const x = i - mean;
    const value = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel.push(value);
    sum += value;
  }
  // Normalize
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
  const half = Math.floor(window / 2);
  const smoothed = [];
  for (let i = 0; i < data.length; i++) {
    let acc = 0;
    let weight = 0;
    for (let j = 0; j < window; j++) {
      const idx = i + j - half;
      if (idx >= 0 && idx < data.length) {
        acc += data[idx] * kernel[j];
        weight += kernel[j];
      }
    }
    smoothed.push(acc / (weight || 1));
  }
  return smoothed;
}

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
  private _viewMode: 'power' | 'energy' = 'power'; // Default to power view

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

  // Load the view mode from localStorage
  private _loadViewMode(): 'power' | 'energy' {
    try {
      const stored = localStorage.getItem('energy-dashboard-view-mode');
      return (stored === 'power' || stored === 'energy') ? stored : 'power';
    } catch {
      return 'power'; // Default to power view if we can't load from localStorage
    }
  }

  // Called when the element is added to the DOM
  connectedCallback() {
    // Load the selected view mode from localStorage
    this._viewMode = this._loadViewMode();
    
    // Add event listener for view mode changes from entity card
    window.addEventListener('view-mode-changed', this._handleViewModeChange as EventListener);
    
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
    // Remove event listener when component is removed
    window.removeEventListener('view-mode-changed', this._handleViewModeChange as EventListener);
  }

  // Handle view mode changes from entity card
  private _handleViewModeChange = (event: CustomEvent) => {
    if (event.detail && event.detail.mode) {
      this._viewMode = event.detail.mode;
      console.log(`View mode changed to: ${this._viewMode}`);
      // Update the chart display based on view mode
      this._updateContent();
    }
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

    // Generate Apexcharts configuration
    const chartType = this.config.chart_type || 'line';
    const hoursToShow = this.config.hours_to_show || 24;
    const showPoints = this.config.show_points || false;
    const showLegend = this.config.show_legend !== false;
    const smoothCurve = this.config.smooth_curve !== false;
    const strokeWidth = this.config.stroke_width || 2; // Get the stroke width from config

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

    // If yMin is not set, calculate from data (including negatives)
    if (typeof yMin === 'undefined') {
      let minVal: number | undefined = undefined;
      for (const entityId of entities) {
        const stateObj = this._hass.states[entityId];
        if (stateObj) {
          const val = parseFloat(stateObj.state);
          if (!isNaN(val)) {
            if (typeof minVal === 'undefined') minVal = val;
            else minVal = Math.min(minVal, val);
          }
        }
      }
      yMin = typeof minVal !== 'undefined' ? minVal : 0;
    }

    // Calculate appropriate tick amount based on y-axis range
    let tickAmount = 5; // Default to 5 grid lines

    // For power, we can adjust the tick interval to be nice round numbers
    if (!isEnergy) {
      // If we have a fixed max, adjust the tick amount accordingly
      if (typeof yMax === 'number') {
        if (yMax <= 500) {
          tickAmount = 5;  // For 0-500, show ticks at 0, 100, 200, 300, 400, 500
        } else if (yMax <= 2000) {
          tickAmount = 10; // For 0-2000, show more ticks
        } else {
          tickAmount = 15; // For larger values, use more ticks
        }
      } else {
        // For auto, use a reasonable default
        tickAmount = 10;
      }
    } else {
      // For energy charts, use fewer ticks by default
      tickAmount = 5;
    }

    // Ensure consistent decimal formatting
    const decimals = options?.y_axis?.decimals !== undefined ? options.y_axis.decimals : (isEnergy ? 2 : 0);

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
        max: yMax, // Apply max value from config - undefined will be auto
        decimals: decimals // Default to 2 decimal places for energy, 0 for power
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
          forceNiceScale: true, // Force nice rounded intervals
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
          xaxis: {
            lines: {
              show: false
            }
          },
          yaxis: {
            lines: {
              show: true
            }
          },
          padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }
        },
        markers: { 
          size: showPoints ? 4 : 0,
          colors: ['var(--primary-color, #03a9f4)'],
          strokeColors: 'var(--card-background-color, #fff)',
          strokeWidth: 2
        },
        stroke: { 
          curve: smoothCurve ? 'smooth' : 'straight', 
          width: strokeWidth, // Apply the configured stroke width
          lineCap: 'round'
        },
        legend: { 
          show: showLegend,
          position: 'bottom',
          fontSize: '12px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          labels: {
            colors: 'var(--primary-text-color, #000)'
          }
        },
        tooltip: {
          theme: 'light',
          style: {
            fontSize: '12px',
            fontFamily: 'Helvetica, Arial, sans-serif'
          }
        },
        states: {
          hover: {
            filter: {
              type: 'lighten',
              value: 0.1
            }
          },
          active: {
            filter: {
              type: 'darken',
              value: 0.35
            }
          }
        }
      }
    };

    // --- Data Smoothing (Averaging) ---
    let averageWindow = 1;
    if ((this.config as any)?.average_window && (this.config as any).average_window !== 'off') {
      if ((this.config as any).average_window === '15min') averageWindow = 3;
      if ((this.config as any).average_window === '1h') averageWindow = 12;
      if ((this.config as any).average_window === '5h') averageWindow = 60;
    }
    // Actually smooth the data for each series
    if (averageWindow > 1 && this._hass) {
      if (Array.isArray(apexChartCardConfig.series)) {
        apexChartCardConfig.series = apexChartCardConfig.series.map((s: any) => {
          const stateObj = this._hass.states[s.entity];
          if (stateObj) {
            const val = parseFloat(stateObj.state);
            const dataArr = Array(60).fill(val); // Simulate 60 points
            return { ...s, data: gaussianSmooth(dataArr, averageWindow) };
          }
          return s;
        });
      }
    }

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

    const card = this._root.querySelector('ha-card') as HTMLElement;
    if (!card) return;

    // Clear previous content
    card.innerHTML = '';
    
    // Reset any previous inline styles
    card.style.paddingTop = '';

    if (this.config.show_header) {
      const header = document.createElement('div');
      header.className = 'card-header';
      header.textContent = this.config.title;
      card.appendChild(header);
    } else {
      // Add padding to the top of the card when header is disabled
      // This matches the entity card's buffer space
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

    // --- Pills Layout ---
    const pillRow = document.createElement('div');
    pillRow.className = 'pill-row';
    pillRow.style.display = 'flex';
    pillRow.style.justifyContent = 'flex-start';
    pillRow.style.alignItems = 'flex-end';
    pillRow.style.width = '100%';
    pillRow.style.margin = '0 0 12px 0';
    pillRow.style.gap = '10px'; // Compact horizontal spacing

    // Refresh rate group (with manual refresh as first pill)
    const refreshGroup = document.createElement('div');
    refreshGroup.className = 'pill-group';
    refreshGroup.style.display = 'flex';
    refreshGroup.style.flexDirection = 'column';
    refreshGroup.style.alignItems = 'center';
    refreshGroup.style.justifyContent = 'center';
    const refreshLabel = document.createElement('div');
    refreshLabel.className = 'pill-label';
    refreshLabel.textContent = 'Refresh Rate';
    refreshLabel.style.textAlign = 'center';
    refreshGroup.appendChild(refreshLabel);
    const refreshControls = this._createRefreshRatePillControls();
    refreshGroup.appendChild(refreshControls);
    pillRow.appendChild(refreshGroup);

    // Time range group
    const timeGroup = document.createElement('div');
    timeGroup.className = 'pill-group';
    timeGroup.style.display = 'flex';
    timeGroup.style.flexDirection = 'column';
    timeGroup.style.alignItems = 'center';
    timeGroup.style.justifyContent = 'center';
    const timeLabel = document.createElement('div');
    timeLabel.className = 'pill-label';
    timeLabel.textContent = 'Time Range';
    timeLabel.style.textAlign = 'center';
    timeGroup.appendChild(timeLabel);
    const timeRangeControls = this._createTimeRangeControls();
    timeGroup.appendChild(timeRangeControls);
    pillRow.appendChild(timeGroup);

    // Y-axis group (renamed to Max Range)
    const yaxisGroup = document.createElement('div');
    yaxisGroup.className = 'pill-group';
    yaxisGroup.style.display = 'flex';
    yaxisGroup.style.flexDirection = 'column';
    yaxisGroup.style.alignItems = 'center';
    yaxisGroup.style.justifyContent = 'center';
    const yaxisLabel = document.createElement('div');
    yaxisLabel.className = 'pill-label';
    yaxisLabel.textContent = 'Max Range';
    yaxisLabel.style.textAlign = 'center';
    yaxisLabel.style.width = '100%';
    yaxisGroup.appendChild(yaxisLabel);
    const yAxisControls = this._createYAxisControls();
    yaxisGroup.appendChild(yAxisControls);
    pillRow.appendChild(yaxisGroup);

    // Averaging group (smoothing)
    const avgGroup = document.createElement('div');
    avgGroup.className = 'pill-group';
    avgGroup.style.display = 'flex';
    avgGroup.style.flexDirection = 'column';
    avgGroup.style.alignItems = 'center';
    avgGroup.style.justifyContent = 'center';
    const avgLabel = document.createElement('div');
    avgLabel.className = 'pill-label';
    avgLabel.textContent = 'Smoothing';
    avgLabel.style.textAlign = 'center';
    avgLabel.style.width = '100%';
    avgGroup.appendChild(avgLabel);
    const averagingControls = this._createAveragingControls();
    averagingControls.style.height = '26px'; // Match other controls
    averagingControls.style.alignItems = 'center'; // Ensure vertical alignment
    avgGroup.appendChild(averagingControls);
    pillRow.appendChild(avgGroup);

    // Add the pill row to the card above the chart
    card.appendChild(pillRow);

    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.style.width = '100%';
    chartContainer.style.display = 'flex';
    chartContainer.style.flexDirection = 'column';
    
    // Load the view mode from localStorage (in case it changed)
    this._viewMode = this._loadViewMode();
    
    // Only show the appropriate chart based on view mode
    if (this._viewMode === 'power' || !this.config.show_energy_section) {
      // Power chart section
      chartContainer.appendChild(this._renderSectionTitle('Power Consumption'));
      const powerPlaceholder = document.createElement('div'); 
      powerPlaceholder.className = 'power-chart-placeholder';
      chartContainer.appendChild(powerPlaceholder);
      this._powerChartEl = null;
      
      // Reset energy chart element so it doesn't get updated
      this._energyChartEl = null;
    } else if (this._viewMode === 'energy' && this.config.show_energy_section) {
      // Energy chart section
      chartContainer.appendChild(this._renderSectionTitle('Energy Consumption', true));
      const energyPlaceholder = document.createElement('div'); 
      energyPlaceholder.className = 'energy-chart-placeholder';
      chartContainer.appendChild(energyPlaceholder);
      this._energyChartEl = null;
      
      // Reset power chart element so it doesn't get updated
      this._powerChartEl = null;
    }
    
    card.appendChild(chartContainer);

    setTimeout(() => this._updateCharts(), 0);
    setTimeout(() => this._startUpdateInterval(), 50);
    setTimeout(() => this._updateAveragingControlsUI(), 100);
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
    console.log("Manual refresh triggered.");
    this._updateCharts();
  }
  
  private _createRefreshRatePillControls(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'refresh-rate-controls pill-row';
    // Manual refresh button as first pill
    const manualBtn = document.createElement('button');
    manualBtn.className = 'pill-control refresh-rate-button';
    manualBtn.innerHTML = '<ha-icon icon="mdi:refresh"></ha-icon>';
    manualBtn.title = 'Manual Refresh';
    manualBtn.style.borderRadius = '16px 0 0 16px';
    manualBtn.style.minWidth = '36px';
    manualBtn.style.height = '26px';
    manualBtn.style.marginRight = '-1px';
    manualBtn.addEventListener('click', () => this._manualRefresh());
    container.appendChild(manualBtn);
    // Refresh rate options
    const options = [
      { label: 'Off', value: 0 },
      { label: '15s', value: 15 },
      { label: '30s', value: 30 },
      { label: '60s', value: 60 }
    ];
    options.forEach((option, index) => {
      const btn = document.createElement('button');
      btn.className = 'pill-control refresh-rate-button';
      btn.textContent = option.label;
      btn.dataset.value = String(option.value);
      btn.style.borderRadius =
        index === options.length - 1 ? '0 16px 16px 0' : '0';
      btn.style.marginLeft = '-1px';
      btn.style.minWidth = '40px';
      btn.style.height = '26px';
      btn.addEventListener('click', () => this._setRefreshInterval(option.value));
      if (this._currentRefreshInterval === option.value) {
        btn.classList.add('active');
      }
      container.appendChild(btn);
    });
    return container;
  }

  private _updateRefreshRatePillControlsUI(container?: HTMLElement) {
    const controls = container || this._root.querySelector('.refresh-rate-controls');
    if (!controls) return;
    const buttons = controls.querySelectorAll('.refresh-rate-button');
    buttons.forEach(btn => {
      const button = btn as HTMLElement;
      button.style.backgroundColor = 'var(--card-background-color, white)';
      button.style.color = 'var(--primary-text-color, #212121)';
      button.style.borderColor = 'var(--divider-color, #e0e0e0)';
    });
    const activeButton = controls.querySelector(`.refresh-rate-button[data-value="${this._currentRefreshInterval}"]`) as HTMLElement;
    if (activeButton) {
      activeButton.style.backgroundColor = 'var(--primary-color, #03a9f4)';
      activeButton.style.color = 'var(--text-primary-color, #fff)';
      activeButton.style.borderColor = 'var(--primary-color, #03a9f4)';
    }
  }

  private _updateTimeRangeControlsUI(container?: HTMLElement) {
    const controls = container || this._root.querySelector('.time-range-container');
    if (!controls) return;
    const buttons = controls.querySelectorAll('.time-range-button');
    buttons.forEach(btn => {
      const button = btn as HTMLElement;
      button.style.backgroundColor = 'var(--card-background-color, white)'; // Changed from secondary-background-color
      button.style.color = 'var(--primary-text-color, #212121)';
      button.style.borderColor = 'var(--divider-color, #e0e0e0)';
    });
    const activeButton = controls.querySelector(`.time-range-button[data-hours="${this._currentTimeRangeHours}"]`) as HTMLElement;
    if (activeButton) {
      activeButton.style.backgroundColor = 'var(--primary-color, #03a9f4)';
      activeButton.style.color = 'var(--text-primary-color, #fff)';
      activeButton.style.borderColor = 'var(--primary-color, #03a9f4)';
    }
  }

  private _updateYAxisControlsUI(container?: HTMLElement) {
    const controls = container || this._root.querySelector('.y-axis-container');
    if (!controls) return;

    // Get the current max value based on the view mode
    const isEnergy = this._viewMode === 'energy';
    const currentMax = isEnergy 
      ? (this.config?.energy_chart_options?.y_axis?.max ?? 'auto')
      : (this.config?.power_chart_options?.y_axis?.max ?? 'auto');
    
    // Convert to string for comparison with button data attribute
    const currentMaxStr = currentMax === undefined ? 'auto' : String(currentMax);
    
    const buttons = controls.querySelectorAll('.yaxis-button');
    buttons.forEach(btn => {
      const button = btn as HTMLElement;
      button.style.backgroundColor = 'var(--card-background-color, white)'; // Changed from secondary-background-color
      button.style.color = 'var(--primary-text-color, #212121)';
      button.style.borderColor = 'var(--divider-color, #e0e0e0)';
    });
    
    // Find the active button by its data-yaxis attribute
    const activeButton = controls.querySelector(`.yaxis-button[data-yaxis="${currentMaxStr}"]`) as HTMLElement;
    if (activeButton) {
      activeButton.style.backgroundColor = 'var(--primary-color, #03a9f4)';
      activeButton.style.color = 'var(--text-primary-color, #fff)';
      activeButton.style.borderColor = 'var(--primary-color, #03a9f4)';
    }
  }

  private _setYAxisMax(maxValue: string) {
    if (!this.config) return;

    // Get current view mode
    const isEnergy = this._viewMode === 'energy';
    
    // Update config based on current view mode
    if (isEnergy) {
      if (!this.config.energy_chart_options) {
        this.config.energy_chart_options = { y_axis: {} };
      }
      if (!this.config.energy_chart_options.y_axis) {
        this.config.energy_chart_options.y_axis = {};
      }
      
      // Set max to number or undefined for auto
      this.config.energy_chart_options.y_axis.max = 
        maxValue === 'auto' ? undefined : Number(maxValue);
    } else {
      if (!this.config.power_chart_options) {
        this.config.power_chart_options = { y_axis: {} };
      }
      if (!this.config.power_chart_options.y_axis) {
        this.config.power_chart_options.y_axis = {};
      }
      
      // Set max to number or undefined for auto
      this.config.power_chart_options.y_axis.max = 
        maxValue === 'auto' ? undefined : Number(maxValue);
    }
    
    // Update the UI to show the active button
    this._updateYAxisControlsUI();
    
    // Refresh the chart to apply new Y-axis setting
    this._updateCharts();
    
    console.log(`Set Y-axis max to ${maxValue} for ${isEnergy ? 'energy' : 'power'} chart`);
  }

  private _createAveragingControls(): HTMLElement {
    const averagingContainer = document.createElement('div');
    averagingContainer.className = 'averaging-controls';
    averagingContainer.style.display = 'flex';
    averagingContainer.style.justifyContent = 'center';
    averagingContainer.style.alignItems = 'center';
    averagingContainer.style.margin = '8px 0 0 0';
    averagingContainer.style.gap = '0';

    const averagingOptions = [
      { label: 'Off', value: 'off' },
      { label: '15min', value: '15min' },
      { label: '1h', value: '1h' },
      { label: '5h', value: '5h' }
    ];

    averagingOptions.forEach((option, index) => {
      const btn = document.createElement('button');
      btn.className = 'pill-control averaging-button';
      btn.textContent = option.label;
      btn.dataset.value = option.value;
      btn.style.borderRadius =
        index === 0 ? '16px 0 0 16px' :
        index === averagingOptions.length - 1 ? '0 16px 16px 0' : '0';
      btn.style.marginLeft = index > 0 ? '-1px' : '0';
      btn.style.minWidth = '40px';
      btn.style.padding = '4px 12px';
      btn.style.fontSize = '0.9em';
      btn.style.height = '26px';
      btn.style.border = '1px solid var(--divider-color, #e0e0e0)';
      btn.style.backgroundColor = 'var(--card-background-color, white)';
      btn.style.color = 'var(--primary-text-color)';
      btn.style.cursor = 'pointer';
      btn.style.transition = 'all 0.2s';
      if ((this.config as any)?.average_window === option.value || (!this.config?.average_window && option.value === 'off')) {
        btn.style.backgroundColor = 'var(--primary-color, #03a9f4)';
        btn.style.color = 'var(--text-primary-color, #fff)';
        btn.style.borderColor = 'var(--primary-color, #03a9f4)';
      }
      btn.addEventListener('click', () => {
        if (this.config) {
          (this.config as any).average_window = option.value;
          this._updateCharts();
          this._updateAveragingControlsUI(averagingContainer);
        }
      });
      averagingContainer.appendChild(btn);
    });
    return averagingContainer;
  }

  private _updateAveragingControlsUI(container?: HTMLElement) {
    const controls = container || this._root.querySelector('.averaging-controls');
    if (!controls) return;
    const buttons = controls.querySelectorAll('.averaging-button');
    buttons.forEach(btn => {
      const button = btn as HTMLElement;
      button.style.backgroundColor = 'var(--card-background-color, white)';
      button.style.color = 'var(--primary-text-color, #212121)';
      button.style.borderColor = 'var(--divider-color, #e0e0e0)';
    });
    const activeValue = (this.config as any)?.average_window || 'off';
    const activeButton = controls.querySelector(`.averaging-button[data-value="${activeValue}"]`) as HTMLElement;
    if (activeButton) {
      activeButton.style.backgroundColor = 'var(--primary-color, #03a9f4)';
      activeButton.style.color = 'var(--text-primary-color, #fff)';
      activeButton.style.borderColor = 'var(--primary-color, #03a9f4)';
    }
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
    const yAxisPresets = [
      { label: 'Auto', value: 'auto' },
      { label: '500', value: '500' },
      { label: '3000', value: '3000' },
      { label: '9000', value: '9000' }
    ];
    const isEnergy = this._viewMode === 'energy';
    const currentMax = isEnergy
      ? (this.config?.energy_chart_options?.y_axis?.max ?? 'auto')
      : (this.config?.power_chart_options?.y_axis?.max ?? 'auto');
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
}

customElements.define('energy-dashboard-chart-card', EnergyDashboardChartCard);