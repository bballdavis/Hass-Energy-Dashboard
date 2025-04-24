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
    this._updateContent();
    this._startUpdateInterval();
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
    } as EnergyDashboardChartConfig;
    
    // Set the current refresh interval from config
    if (this.config.update_interval) {
      this._currentRefreshInterval = this.config.update_interval;
    }
    
    this._loadSelectedEntities();
    this._isLoading = true;
    this._checkApexChartsRegistration();
    this._updateContent();
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
    } else {
      // Only update charts when hass is updated, entity list comes from localStorage
      this._updateCharts();
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
    if (this._updateTimer !== null) {
      window.clearInterval(this._updateTimer);
    }

    // Set the current refresh interval from config
    if (this.config?.update_interval) {
      this._currentRefreshInterval = this.config.update_interval;
    }

    // Start the timer with the current refresh interval
    if (this._currentRefreshInterval > 0) {
      this._updateTimer = window.setInterval(
        () => this._updateCharts(),
        this._currentRefreshInterval * 1000
      );
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

    // Reinstate options to get y-axis config
    const options = isEnergy
      ? this.config.energy_chart_options
      : this.config.power_chart_options;

    const chartType = this.config.chart_type || 'line';
    const hoursToShow = this.config.hours_to_show || 24;
    const showPoints = this.config.show_points || false;
    const aggregateFunc = this.config.aggregate_func || 'avg'; // Keep aggregate func
    const showLegend = this.config.show_legend !== false;
    const smoothCurve = this.config.smooth_curve !== false;
    const updateInterval = (this.config.update_interval || 60).toString();

    // Build series configuration for apexcharts-card
    const series = entities.map(entityId => {
      const entityState = this._hass.states[entityId];
      const name = entityState?.attributes?.friendly_name || entityId;
      return {
        entity: entityId,
        name: name,
        type: chartType,
        stroke_width: 2,
        group_by: {
          func: aggregateFunc,
          duration: '1h' // Adjust duration as needed
        }
      };
    });

    // Create the configuration format for apexcharts-card
    const apexChartCardConfig: any = {
      // --- Top-level apexcharts-card specific config ---
      type: 'custom:apexcharts-card',
      header: {
        show: false,
      },
      graph_span: `${hoursToShow}h`, // Use graph_span
      chart_type: chartType,
      cache: true,
      stacked: false, // Set based on config if needed
      update_interval: updateInterval,

      // --- Top-level yaxis configuration ---
      yaxis: [
        {
          min: options?.y_axis?.min,
          max: options?.y_axis?.max,
          decimals: options?.y_axis?.decimals ?? (isEnergy ? 2 : 1),
        }
      ],

      // --- Standard ApexCharts options nested under apex_config ---
      apex_config: {
        chart: {
          height: this.config.chart_height || 300,
          toolbar: {
            show: true,
            tools: {
              download: true, selection: true, zoom: true,
              zoomin: true, zoomout: true, pan: true, reset: true
            }
          },
        },
        stroke: {
          curve: smoothCurve ? 'smooth' : 'straight'
        },
        markers: {
          size: showPoints ? 4 : 0
        },
        legend: {
          show: showLegend
        }
      },

      // --- Series Data ---
      series: series,
    };

    // Clean up potential undefined values from top-level yaxis
    if (apexChartCardConfig.yaxis[0].min === undefined) delete apexChartCardConfig.yaxis[0].min;
    if (apexChartCardConfig.yaxis[0].max === undefined) delete apexChartCardConfig.yaxis[0].max;
    if (apexChartCardConfig.yaxis[0].decimals === undefined) delete apexChartCardConfig.yaxis[0].decimals;

    return apexChartCardConfig;
  }

  private _createChart(isEnergy: boolean) {
    // If still loading, show loading indicator
    if (this._isLoading) {
      return this._createLoadingIndicator();
    }
    
    const entities = isEnergy ? this._energyEntities : this._powerEntities;
    
    // Check if we have any entities selected
    if (!entities || entities.length === 0) {
      return this._createEmptyCard(isEnergy);
    }
    
    // Check if hass is available
    if (!this._hass) {
      return this._createLoadingIndicator();
    }
    
    // Generate chart config
    const chartConfig = this._generateApexchartsConfig(entities, isEnergy);
    
    if (!chartConfig) {
      return this._createErrorMessage(
        `Failed to generate chart configuration for ${isEnergy ? 'energy' : 'power'} chart`,
        ['Check that all required entities exist in Home Assistant', 
         'Refresh the page and try again']
      );
    }
    
    // Create the chart container
    const chartElement = document.createElement('div');
    chartElement.className = isEnergy ? 'energy-chart-container' : 'power-chart-container';
    chartElement.style.width = '100%';
    chartElement.style.marginBottom = '16px';
    chartElement.style.position = 'relative';
    chartElement.style.minHeight = `${this.config?.chart_height || 300}px`;
    
    try {
      // Check if apexcharts-card is registered
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
      
      // Create the apexcharts-card element
      const apexCard = document.createElement('apexcharts-card') as HTMLElement;
      
      // Set card config for apexcharts-card
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
    
    // Spinner
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
    
    // Text
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
    
    // Error icon
    const icon = document.createElement('ha-icon');
    icon.setAttribute('icon', 'mdi:alert-circle-outline');
    icon.style.color = 'var(--error-color, red)';
    icon.style.width = '40px';
    icon.style.height = '40px';
    icon.style.marginBottom = '8px';
    
    // Error message
    const errorText = document.createElement('div');
    errorText.textContent = error;
    errorText.style.color = 'var(--error-color, red)';
    errorText.style.fontWeight = 'bold';
    errorText.style.marginBottom = '8px';
    
    // Suggestions list
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
    // Check if we need to reload selected entities
    this._loadSelectedEntities();
    
    // Power chart section
    if (this._powerChartEl) {
      const parent = this._powerChartEl.parentNode;
      if (parent) {
        const newPowerChart = this._createChart(false);
        parent.replaceChild(newPowerChart, this._powerChartEl);
        this._powerChartEl = newPowerChart;
      }
    }
    
    // Energy chart section
    if (this.config?.show_energy_section && this._energyChartEl) {
      const parent = this._energyChartEl.parentNode;
      if (parent) {
        const newEnergyChart = this._createChart(true);
        parent.replaceChild(newEnergyChart, this._energyChartEl);
        this._energyChartEl = newEnergyChart;
      }
    }
  }

  private _renderSectionTitle(title: string): HTMLElement {
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'section-title';
    sectionTitle.textContent = title;
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

    // Get the ha-card element
    const card = this._root.querySelector('ha-card');
    if (!card) return;

    // Clear previous content
    card.innerHTML = '';

    // Header
    if (this.config.show_header) {
      const header = document.createElement('div');
      header.className = 'card-header';
      header.textContent = this.config.title;
      card.appendChild(header);
    }

    // Loading state - show loading indicator for the whole card when initializing
    if (this._isLoading) {
      const loadingIndicator = this._createLoadingIndicator();
      card.appendChild(loadingIndicator);
      return;
    }

    // Check if apexcharts-card is available (after loading state has ended)
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
    
    // Add refresh controls before the charts
    const refreshControls = this._createRefreshControls();
    card.appendChild(refreshControls);

    // Container for both charts
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.style.width = '100%';
    chartContainer.style.display = 'flex';
    chartContainer.style.flexDirection = 'column';
    
    // Power chart section
    chartContainer.appendChild(this._renderSectionTitle('Power Consumption'));
    this._powerChartEl = this._createChart(false);
    chartContainer.appendChild(this._powerChartEl);
    
    // Energy chart section (if enabled)
    if (this.config.show_energy_section) {
      const separator = document.createElement('div');
      separator.className = 'section-separator';
      separator.style.margin = '16px 8px';
      chartContainer.appendChild(separator);
      
      chartContainer.appendChild(this._renderSectionTitle('Energy Consumption'));
      this._energyChartEl = this._createChart(true);
      chartContainer.appendChild(this._energyChartEl);
    }
    
    card.appendChild(chartContainer);
  }

  // Check if apexcharts-card is registered in the DOM
  private _checkApexChartsRegistration() {
    this._isLoading = true;
    this._updateContent();
    
    // Use setTimeout to give the browser a chance to register custom elements
    setTimeout(() => {
      // Try to check if the element is defined
      this._apexChartCardRegistered = !!customElements.get('apexcharts-card');
      this._isLoading = false;
      this._updateContent();
    }, 500);
  }

  private _setRefreshInterval(seconds: number) {
    this._currentRefreshInterval = seconds;
    this._stopUpdateInterval();
    
    if (seconds > 0) {
      this._updateTimer = window.setInterval(
        () => this._updateCharts(),
        seconds * 1000
      );
    }
    
    // Update the config so it persists
    if (this.config) {
      this.config.update_interval = seconds;
    }
    
    // Update the UI to reflect the current interval
    this._updateRefreshControlsUI();
  }
  
  private _manualRefresh() {
    this._updateCharts();
  }
  
  private _createRefreshControls(): HTMLElement {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'refresh-controls';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.justifyContent = 'flex-end';
    controlsContainer.style.padding = '0 16px 8px';
    controlsContainer.style.gap = '8px';
    
    // Manual refresh button
    const refreshButton = document.createElement('button');
    refreshButton.className = 'refresh-button control-button';
    refreshButton.innerHTML = '<ha-icon icon="mdi:refresh"></ha-icon>';
    refreshButton.title = 'Refresh now';
    refreshButton.addEventListener('click', () => this._manualRefresh());
    refreshButton.style.minWidth = '36px';
    refreshButton.style.width = '36px';
    
    // 15 seconds button
    const sec15Button = document.createElement('button');
    sec15Button.className = 'interval-button control-button';
    sec15Button.innerText = '15s';
    sec15Button.title = 'Refresh every 15 seconds';
    sec15Button.dataset.seconds = '15';
    sec15Button.addEventListener('click', () => this._setRefreshInterval(15));
    
    // 30 seconds button
    const sec30Button = document.createElement('button');
    sec30Button.className = 'interval-button control-button';
    sec30Button.innerText = '30s';
    sec30Button.title = 'Refresh every 30 seconds';
    sec30Button.dataset.seconds = '30';
    sec30Button.addEventListener('click', () => this._setRefreshInterval(30));
    
    // 60 seconds button
    const sec60Button = document.createElement('button');
    sec60Button.className = 'interval-button control-button';
    sec60Button.innerText = '60s';
    sec60Button.title = 'Refresh every 60 seconds';
    sec60Button.dataset.seconds = '60';
    sec60Button.addEventListener('click', () => this._setRefreshInterval(60));
    
    controlsContainer.appendChild(refreshButton);
    controlsContainer.appendChild(sec15Button);
    controlsContainer.appendChild(sec30Button);
    controlsContainer.appendChild(sec60Button);
    
    // Set initial active state
    this._updateRefreshControlsUI(controlsContainer);
    
    return controlsContainer;
  }
  
  private _updateRefreshControlsUI(container?: HTMLElement) {
    const controls = container || this._root.querySelector('.refresh-controls');
    if (!controls) return;
    
    // Clear active state from all buttons
    const buttons = controls.querySelectorAll('.interval-button');
    buttons.forEach(btn => {
      const button = btn as HTMLElement;
      button.classList.remove('active');
      button.style.backgroundColor = 'var(--secondary-background-color)';
      button.style.color = 'var(--primary-text-color)';
    });
    
    // Set active state for the current interval button
    const activeButton = controls.querySelector(`.interval-button[data-seconds="${this._currentRefreshInterval}"]`) as HTMLElement;
    if (activeButton) {
      activeButton.classList.add('active');
      activeButton.style.backgroundColor = 'var(--primary-color)';
      activeButton.style.color = 'var(--text-primary-color)';
    }
  }
}

// Register the card with the custom elements registry
customElements.define('energy-dashboard-chart-card', EnergyDashboardChartCard);