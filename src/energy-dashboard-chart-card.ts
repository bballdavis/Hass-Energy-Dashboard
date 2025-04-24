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
    
    this._loadSelectedEntities();
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
    this._hass = hass;
    // Only update charts when hass is updated, entity list comes from localStorage
    this._updateCharts();
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

    if (this.config?.update_interval) {
      this._updateTimer = window.setInterval(
        () => this._updateCharts(),
        this.config.update_interval * 1000
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
    const entities = isEnergy ? this._energyEntities : this._powerEntities;
    const chartConfig = this._generateApexchartsConfig(entities, isEnergy);
    
    if (!chartConfig || !entities.length) {
      return this._createEmptyCard(isEnergy);
    }
    
    // Create the chart
    const chartElement = document.createElement('div');
    chartElement.className = isEnergy ? 'energy-chart-container' : 'power-chart-container';
    chartElement.style.width = '100%';
    chartElement.style.marginBottom = '16px';
    
    try {
      // Check if apexcharts-card is registered
      if (!customElements.get('apexcharts-card')) {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        errorMsg.style.color = 'var(--error-color, red)';
        errorMsg.style.padding = '16px';
        errorMsg.style.textAlign = 'center';
        errorMsg.textContent = 'Error: apexcharts-card is not installed or registered. Please make sure the integration is installed.';
        chartElement.appendChild(errorMsg);
        return chartElement;
      }
      
      // Create the apexcharts-card element
      const apexCard = document.createElement('apexcharts-card') as HTMLElement;
      
      // Set card config for apexcharts-card
      (apexCard as any).setConfig(chartConfig);
      
      // Pass hass object to the chart
      (apexCard as any).hass = this._hass;
      
      chartElement.appendChild(apexCard);
    } catch (err) {
      console.error('Error creating apexcharts-card:', err);
      const errorMsg = document.createElement('div');
      errorMsg.className = 'error-message';
      errorMsg.style.color = 'var(--error-color, red)';
      errorMsg.style.padding = '16px';
      errorMsg.style.textAlign = 'center';
      errorMsg.textContent = `Error: ${err instanceof Error ? err.message : 'Failed to create chart'}`;
      chartElement.appendChild(errorMsg);
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
}

// Register the card with the custom elements registry
customElements.define('energy-dashboard-chart-card', EnergyDashboardChartCard);