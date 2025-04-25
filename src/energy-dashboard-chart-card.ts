import { createStyles, cardStyles } from './styles';
import { loadToggleStates, getEntityColor } from './entity-utils';
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
  private _viewMode: 'power' | 'energy' = 'power'; // Default to power view

  // Custom event type definition for view mode changes
  private _viewModeChangeEvent: string = 'view-mode-changed';
  
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
    window.addEventListener(this._viewModeChangeEvent, this._handleViewModeChange as EventListener);
    
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
    window.removeEventListener(this._viewModeChangeEvent, this._handleViewModeChange as EventListener);
  }

  // Handle view mode changes from entity card
  private _handleViewModeChange = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail && customEvent.detail.mode) {
      this._viewMode = customEvent.detail.mode;
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

    const chartType = this.config.chart_type || 'line';
    const showPoints = this.config.show_points || false;
    const showLegend = this.config.show_legend !== false;
    const smoothCurve = this.config.smooth_curve !== false;

    // Validate entities
    if (!Array.isArray(entities) || entities.length === 0) {
      console.error('Invalid or empty entities array:', entities);
      return null;
    }

    // Map entities to series data with proper validation
    const validEntities = entities.filter(entityId => {
      if (!entityId || typeof entityId !== 'string') {
        console.warn('Invalid entity ID found:', entityId);
        return false;
      }
      if (!this._hass.states[entityId]) {
        console.warn(`Entity ${entityId} not found in Home Assistant states.`);
        return false;
      }
      return true;
    });

    if (validEntities.length === 0) {
      console.error('No valid entities found after filtering.');
      return null;
    }

    // --- Y Axis Auto-Range Logic ---
    let yMin = options?.y_axis?.min;
    let yMax = options?.y_axis?.max;
    let yTitle = isEnergy ? 'Energy (kWh)' : 'Power (W)';
    if (options?.y_axis?.title) yTitle = options.y_axis.title;

    // Set minimum to 0 for power (if not specified in config)
    if (typeof yMin === 'undefined') {
      yMin = 0;
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

    // Create the entity series configuration for apexcharts-card
    const seriesConfig = validEntities.map(entityId => {
      const state = this._hass.states[entityId];
      const entityColor = getEntityColor(entityId);
      
      return {
        entity: entityId,
        name: state.attributes?.friendly_name || entityId,
        type: chartType,
        stroke_width: 2,
        curve: smoothCurve ? 'smooth' : 'straight',
        color: entityColor,
        show: {
          in_header: false,
          in_legend: true,
          in_chart: true
        },
        // Remove extend_to_end - not compatible with v2.1.2
        offset: '0', // Change to string type
        group_by: {
          duration: '1h',
          func: 'avg'
        }
      };
    });

    // Ensure hours_to_show is a valid number and fallback to 24
    const hoursToShow = typeof this.config.hours_to_show === 'number' && this.config.hours_to_show > 0 ? this.config.hours_to_show : 24;

    // Create apexcharts-card compatible config object
    const apexChartCardConfig = {
      type: 'custom:apexcharts-card',
      chart_type: chartType,
      header: { show: false, title: isEnergy ? 'Energy Consumption' : 'Power Consumption', show_states: false },
      span: {
        start: 'hour',
        offset: `-${hoursToShow}h`,
        end: 'hour'
      },
      all_series_config: {
        stroke_width: 2,
        curve: smoothCurve ? 'smooth' : 'straight',
        show: { in_header: false },
        group_by: { duration: '1h', func: 'avg' }
      },
      series: seriesConfig,
      apex_config: {
        chart: {
          height: this.config.chart_height || 300,
          animations: { enabled: false },
          background: 'transparent',
          fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
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
        colors: validEntities.map(entityId => getEntityColor(entityId)),
        stroke: {
          curve: smoothCurve ? 'smooth' : 'straight',
          width: 2,
          lineCap: 'round',
        },
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
          shape: 'circle',
          strokeColors: ['var(--card-background-color, #fff)'],
          strokeWidth: 2,
          hover: {
            size: showPoints ? 6 : 4
          }
        },
        tooltip: {
          shared: true,
          intersect: false,
          theme: 'light',
          x: {
            format: 'MMM dd, HH:mm:ss'
          }
        },
        legend: {
          show: showLegend,
          position: 'bottom',
          horizontalAlign: 'center',
          fontSize: '12px',
          fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
          offsetY: 8,
          itemMargin: {
            horizontal: 8,
            vertical: 4
          },
          labels: {
            colors: 'var(--primary-text-color, #000)'
          },
          onItemHover: {
            highlightDataSeries: true
          },
          onItemClick: {
            toggleDataSeries: true
          }
        },
        xaxis: {
          type: 'datetime',
          labels: {
            style: {
              fontSize: '11px',
              fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
              color: 'var(--secondary-text-color, #666)'
            },
            format: 'HH:mm'
          },
          axisBorder: {
            show: true,
            color: 'var(--divider-color, #e0e0e0)',
            height: 1,
          },
          axisTicks: {
            show: true,
            color: 'var(--divider-color, #e0e0e0)'
          },
          tooltip: {
            enabled: true
          }
        },
        yaxis: {
          min: yMin,
          max: yMax,
          tickAmount: tickAmount,
          forceNiceScale: true,
          decimalsInFloat: decimals,
          labels: {
            formatter: (val: number) => val.toFixed(decimals),
            style: {
              fontSize: '11px',
              fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
              color: 'var(--secondary-text-color, #666)'
            }
          },
          title: {
            text: yTitle,
            style: {
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--primary-text-color, #000)'
            }
          }
        },
        responsive: [{
          breakpoint: 1000,
          options: {
            chart: {
              height: this.config.chart_height || 300
            },
            legend: {
              position: 'bottom',
              offsetY: 0
            }
          }
        }]
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

      // Ensure the DOM is ready before applying the configuration
      setTimeout(() => {
        try {
          if (typeof (apexCard as any).setConfig === 'function') {
            (apexCard as any).setConfig(chartConfig);
          } else {
            throw new Error('setConfig method is not available on apexcharts-card');
          }

          (apexCard as any).hass = this._hass;
        } catch (configError) {
          console.error('Error configuring apexcharts-card:', configError);
          chartElement.appendChild(
            this._createErrorMessage(
              'Error configuring chart',
              ['The chart configuration is invalid', 
               'Check the console for more details']
            )
          );
        }
      }, 0); // Delay to ensure DOM readiness

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
    
    const refreshControls = this._createRefreshControls();
    card.appendChild(refreshControls);

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
  }

  private _checkApexChartsRegistration() {
    if (this._apexChartCardRegistered !== null) return;

    this._isLoading = true;
    
    // Track retry attempts
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 1000; // 1 second between retries
    
    const checkRegistration = () => {
      // Check if apexcharts-card is registered as a custom element
      const isRegistered = !!customElements.get('apexcharts-card');
      console.log(`ApexCharts registration check: ${isRegistered} (attempt ${retryCount + 1})`);
      
      if (isRegistered) {
        // Success! Component is registered
        this._apexChartCardRegistered = true;
        this._isLoading = false;
        this._updateContent();
      } else if (retryCount < maxRetries) {
        // Not registered yet, retry after delay
        retryCount++;
        setTimeout(checkRegistration, retryDelay);
      } else {
        // Max retries reached, give up and show error
        console.error("apexcharts-card not found after multiple attempts");
        this._apexChartCardRegistered = false;
        this._isLoading = false;
        this._updateContent(); // This will show error message about missing dependency
      }
    };
    
    // Start the registration check process
    checkRegistration();
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
    controlsContainer.style.padding = '0 16px';
    controlsContainer.style.marginTop = '8px';  // Match entity card mode toggle container
    controlsContainer.style.marginBottom = '8px';  // Match entity card mode toggle container
    controlsContainer.style.gap = '8px';
    controlsContainer.style.flexWrap = 'wrap'; // Allow wrapping

    // --- Refresh Rate Controls ---
    const refreshTitle = document.createElement('div');
    refreshTitle.className = 'refresh-title';
    refreshTitle.textContent = 'Refresh Rate:';
    refreshTitle.style.fontWeight = '500';
    refreshTitle.style.fontSize = '0.9em';
    refreshTitle.style.marginRight = '8px';
    refreshTitle.style.whiteSpace = 'nowrap'; // Prevent text wrapping

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'buttons-container';
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.justifyContent = 'flex-end';
    buttonsContainer.style.alignItems = 'center';
    buttonsContainer.style.gap = '0'; // Remove gap between buttons
    buttonsContainer.style.flexShrink = '0'; // Prevent shrinking

    // --- Time Range Controls ---
    const timeRangeTitle = document.createElement('div');
    timeRangeTitle.className = 'time-range-title';
    timeRangeTitle.textContent = 'Time Range:';
    timeRangeTitle.style.fontWeight = '500';
    timeRangeTitle.style.fontSize = '0.9em';
    timeRangeTitle.style.marginRight = '8px';
    timeRangeTitle.style.marginLeft = '8px'; // Add left margin
    timeRangeTitle.style.whiteSpace = 'nowrap'; // Prevent text wrapping

    const timeRangeContainer = document.createElement('div');
    timeRangeContainer.className = 'time-range-container';
    timeRangeContainer.style.display = 'flex';
    timeRangeContainer.style.justifyContent = 'flex-end';
    timeRangeContainer.style.alignItems = 'center';
    timeRangeContainer.style.gap = '0'; // Remove gap between buttons
    timeRangeContainer.style.flexShrink = '0'; // Prevent shrinking

    // --- Max Range Controls ---
    const maxRangeTitle = document.createElement('div');
    maxRangeTitle.className = 'y-axis-title';
    maxRangeTitle.textContent = 'Max Range:';
    maxRangeTitle.style.fontWeight = '500';
    maxRangeTitle.style.fontSize = '0.9em';
    maxRangeTitle.style.marginRight = '8px';
    maxRangeTitle.style.marginLeft = '8px'; // Add left margin
    maxRangeTitle.style.whiteSpace = 'nowrap'; // Prevent text wrapping

    const maxRangeContainer = document.createElement('div');
    maxRangeContainer.className = 'y-axis-container';
    maxRangeContainer.style.display = 'flex';
    maxRangeContainer.style.justifyContent = 'flex-end';
    maxRangeContainer.style.alignItems = 'center';
    maxRangeContainer.style.gap = '0'; // Remove gap between buttons
    maxRangeContainer.style.flexShrink = '0'; // Prevent shrinking

    // Helper for all controls
    const createButton = (text: string, title: string, value?: string, controlType?: 'time' | 'refresh' | 'yaxis', index?: number, total?: number) => {
      const button = document.createElement('button');
      button.style.padding = '4px 8px';
      button.style.border = '1px solid var(--divider-color)';
      button.style.backgroundColor = 'var(--secondary-background-color)';
      button.style.color = 'var(--primary-text-color)';
      button.style.cursor = 'pointer';
      button.style.display = 'flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      button.style.transition = 'all 0.2s ease-in-out';
      button.style.height = 'var(--button-height, 32px)';
      button.style.minHeight = 'var(--button-height, 32px)';
      button.style.fontSize = '0.9em';
      button.style.margin = '0';
      button.style.position = 'relative';
      button.style.boxSizing = 'border-box'; // Important to include borders in size
      button.style.whiteSpace = 'nowrap'; // Prevent text wrapping
      
      // Set minimum width to accommodate at least 5 characters
      if (!text.includes('<ha-icon')) {
        button.style.minWidth = '40px'; // Minimum width for text buttons
      }
      
      // Handle button border radius based on position
      if (index !== undefined && total !== undefined) {
        // First button - round left corners only
        if (index === 0) {
          button.style.borderRadius = '4px 0 0 4px';
        } 
        // Last button - round right corners only
        else if (index === total - 1) {
          button.style.borderRadius = '0 4px 4px 0';
        } 
        // Middle buttons - no rounded corners
        else {
          button.style.borderRadius = '0';
        }
        
        // Apply negative margin to every button except first to overlap borders
        if (index > 0) {
          button.style.marginLeft = '-1px';
        }
      } else {
        // Default for refresh button
        button.style.borderRadius = '4px';
      }
      
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
      
      if (controlType === 'time' && value !== undefined) {
        button.className = 'time-range-button control-button';
        button.dataset.hours = value;
        button.addEventListener('click', () => this._setTimeRange(Number(value)));
      } else if (controlType === 'refresh' && value !== undefined) {
        button.className = 'interval-button control-button';
        button.dataset.seconds = value;
        button.addEventListener('click', () => this._setRefreshInterval(Number(value)));
      } else if (controlType === 'yaxis' && value !== undefined) {
        button.className = 'yaxis-button control-button';
        button.dataset.yaxis = value;
        button.addEventListener('click', () => this._setYAxisMax(value));
      } else {
        button.className = 'refresh-button control-button';
        button.addEventListener('click', () => this._manualRefresh());
      }
      
      return button;
    };

    // Refresh rate buttons
    const refreshButton = createButton('<ha-icon icon="mdi:refresh"></ha-icon>', 'Refresh now');
    refreshButton.style.minWidth = '32px'; 
    refreshButton.style.width = '32px';
    refreshButton.style.marginRight = '4px'; // Add space between refresh and interval buttons
    refreshButton.style.display = 'flex'; // Ensure flex display for proper centering
    refreshButton.style.alignItems = 'center'; // Ensure vertical centering
    refreshButton.style.justifyContent = 'center'; // Ensure horizontal centering
    // Fix the icon size and positioning
    const refreshIcon = refreshButton.querySelector('ha-icon');
    if (refreshIcon) {
      (refreshIcon as HTMLElement).style.margin = '0'; // Remove any margin
      (refreshIcon as HTMLElement).style.display = 'flex'; // Use flex for proper centering
      (refreshIcon as HTMLElement).style.alignItems = 'center'; 
      (refreshIcon as HTMLElement).style.justifyContent = 'center';
    }
    
    // Make interval buttons as a single connected group
    const refreshOptions = [
      { text: 'Off', title: 'Disable automatic refresh', value: '0' },
      { text: '15s', title: 'Refresh every 15 seconds', value: '15' },
      { text: '30s', title: 'Refresh every 30 seconds', value: '30' },
      { text: '60s', title: 'Refresh every 60 seconds', value: '60' }
    ];
    
    refreshOptions.forEach((option, index) => {
      const btn = createButton(option.text, option.title, option.value, 'refresh', index, refreshOptions.length);
      // Ensure buttons are wide enough for their content
      if (option.text === 'Off') {
        btn.style.minWidth = '36px'; // Minimum width for "Off"
      } else {
        btn.style.minWidth = '40px'; // Minimum width for other options
      }
      buttonsContainer.appendChild(btn);
    });
    
    buttonsContainer.insertBefore(refreshButton, buttonsContainer.firstChild);

    // Time range buttons with minimum width to prevent wrapping
    const timeRanges = [
      { label: '1h', hours: 1 },
      { label: '3h', hours: 3 },
      { label: '12h', hours: 12 },
      { label: '24h', hours: 24 },
      { label: '3d', hours: 72 },
      { label: '1w', hours: 168 }
    ];
    timeRanges.forEach((range, index) => {
      const btn = createButton(
        range.label, 
        `Show last ${range.label}`, 
        String(range.hours), 
        'time',
        index,
        timeRanges.length
      );
      // Set consistent min-width to prevent wrapping
      btn.style.minWidth = '36px';
      // Do NOT override height here to ensure it uses CSS variable
      timeRangeContainer.appendChild(btn);
    });

    // Y-axis preset buttons with minimum width to prevent wrapping
    const yAxisPresets = [
      { label: 'Auto', value: 'auto' },
      { label: '500', value: '500' },
      { label: '2000', value: '2000' },
      { label: '3000', value: '3000' }
    ];
    yAxisPresets.forEach((preset, index) => {
      const btn = createButton(
        preset.label, 
        preset.value === 'auto' ? 'Automatic Y-axis scaling' : `Set Y-axis maximum to ${preset.value}`,
        preset.value,
        'yaxis',
        index,
        yAxisPresets.length
      );
      // Set width based on content
      if (preset.label === 'Auto') {
        btn.style.minWidth = '45px'; // Wider for "Auto"
      } else if (preset.label === '2000' || preset.label === '3000') {
        btn.style.minWidth = '45px'; // Wider for 4-digit numbers
      } else {
        btn.style.minWidth = '40px'; // Standard width for other buttons
      }
      // Do NOT override height here to ensure it uses CSS variable
      maxRangeContainer.appendChild(btn);
    });

    // Create control groups that can wrap properly
    const refreshGroup = document.createElement('div');
    refreshGroup.className = 'refresh-group';
    refreshGroup.style.display = 'flex';
    refreshGroup.style.alignItems = 'center';
    refreshGroup.style.margin = '4px 0';
    refreshGroup.style.whiteSpace = 'nowrap'; // Keep group items on same line
    refreshGroup.style.flexShrink = '0'; // Don't shrink the group
    refreshGroup.appendChild(refreshTitle);
    refreshGroup.appendChild(buttonsContainer);
    
    const timeRangeGroup = document.createElement('div');
    timeRangeGroup.className = 'time-range-group';
    timeRangeGroup.style.display = 'flex';
    timeRangeGroup.style.alignItems = 'center';
    timeRangeGroup.style.margin = '4px 0';
    timeRangeGroup.style.whiteSpace = 'nowrap'; // Keep group items on same line
    timeRangeGroup.style.flexShrink = '0'; // Don't shrink the group
    timeRangeGroup.appendChild(timeRangeTitle);
    timeRangeGroup.appendChild(timeRangeContainer);
    
    const maxRangeGroup = document.createElement('div');
    maxRangeGroup.className = 'y-axis-group';
    maxRangeGroup.style.display = 'flex';
    maxRangeGroup.style.alignItems = 'center';
    maxRangeGroup.style.margin = '4px 0';
    maxRangeGroup.style.whiteSpace = 'nowrap'; // Keep group items on same line
    maxRangeGroup.style.flexShrink = '0'; // Don't shrink the group
    maxRangeGroup.appendChild(maxRangeTitle);
    maxRangeGroup.appendChild(maxRangeContainer);
    
    // Add a flex container for the controls that can wrap
    const controlsWrapper = document.createElement('div');
    controlsWrapper.className = 'controls-wrapper';
    controlsWrapper.style.display = 'flex';
    controlsWrapper.style.flexWrap = 'wrap';
    controlsWrapper.style.gap = '8px';
    controlsWrapper.style.width = '100%';
    controlsWrapper.style.justifyContent = 'flex-start';
    
    // Add the control groups to the wrapper
    controlsWrapper.appendChild(refreshGroup);
    controlsWrapper.appendChild(timeRangeGroup);
    controlsWrapper.appendChild(maxRangeGroup);
    
    // Add the wrapper to the container
    controlsContainer.appendChild(controlsWrapper);

    this._updateRefreshControlsUI(buttonsContainer);
    this._updateTimeRangeControlsUI(timeRangeContainer);
    this._updateYAxisControlsUI(maxRangeContainer);

    return controlsContainer;
  }

  private _updateRefreshControlsUI(container?: HTMLElement) {
    const controls = container || this._root.querySelector('.buttons-container');
    if (!controls) return;
    const buttons = controls.querySelectorAll('.interval-button');
    buttons.forEach(btn => {
      const button = btn as HTMLElement;
      button.style.backgroundColor = 'var(--secondary-background-color, #f0f0f0)';
      button.style.color = 'var(--primary-text-color, #212121)';
      button.style.borderColor = 'var(--divider-color, #e0e0e0)';
    });
    const activeButton = controls.querySelector(`.interval-button[data-seconds="${this._currentRefreshInterval}"]`) as HTMLElement;
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
      button.style.backgroundColor = 'var(--secondary-background-color, #f0f0f0)';
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
      button.style.backgroundColor = 'var(--secondary-background-color, #f0f0f0)';
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
}

customElements.define('energy-dashboard-chart-card', EnergyDashboardChartCard);