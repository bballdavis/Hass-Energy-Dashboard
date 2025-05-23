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
import { EnergyDashboardChartConfig } from './energy-dashboard-chart-config';
export declare class EnergyDashboardChartCard extends HTMLElement {
    private _hass;
    config?: EnergyDashboardChartConfig;
    private _root;
    private _powerChartEl;
    private _energyChartEl;
    private _updateTimer;
    private _powerEntities;
    private _energyEntities;
    private _isLoading;
    private _apexChartCardRegistered;
    private _currentRefreshInterval;
    private _currentTimeRangeHours;
    private _viewMode;
    static get cardType(): string;
    static get displayName(): string;
    static get description(): string;
    static get icon(): string;
    constructor();
    private _loadViewMode;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private _handleViewModeChange;
    setConfig(config: Partial<EnergyDashboardChartConfig>): void;
    static getConfigElement(): HTMLElement;
    static getStubConfig(): {
        title: string;
        show_header: boolean;
        show_energy_section: boolean;
        chart_height?: number | undefined;
        show_points?: boolean | undefined;
        smooth_curve?: boolean | undefined;
        stroke_width?: number | undefined;
        update_interval?: number | undefined;
        hours_to_show?: number | undefined;
        chart_options?: import("./energy-dashboard-chart-config").ChartOptions | undefined;
        use_custom_colors?: boolean | undefined;
        show_legend?: boolean | undefined;
        y_axis_max_presets?: number[] | undefined;
        show_state?: boolean | undefined;
        show_toggle?: boolean | undefined;
        auto_select_count?: number | undefined;
        max_height?: number | undefined;
        energy_auto_select_count?: number | undefined;
        persist_selection?: boolean | undefined;
        view_mode?: "power" | "energy" | undefined;
        entity_removal_filter?: string | undefined;
        refresh_rate?: "off" | "10s" | "30s" | undefined;
    };
    getCardSize(): number;
    set hass(hass: any);
    get hass(): any;
    private _loadSelectedEntities;
    private _startUpdateInterval;
    private _stopUpdateInterval;
    private _generateApexchartsConfig;
    private _createChart;
    private _createEmptyCard;
    private _createLoadingIndicator;
    private _createErrorMessage;
    private _updateCharts;
    private _renderSectionTitle;
    private _updateContent;
    private _setRefreshInterval;
    private _setTimeRange;
    private _manualRefresh;
    private _createRefreshRatePillControls;
    private _updateRefreshRatePillControlsUI;
    private _updateTimeRangeControlsUI;
    private _updateYAxisControlsUI;
    private _setYAxisMax;
    private _createTimeRangeControls;
    private _createYAxisControls;
    private _checkApexChartsRegistration;
}
