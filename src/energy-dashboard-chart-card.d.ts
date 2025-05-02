import { EnergyDashboardChartConfig } from './energy-dashboard-chart-config';

export declare class EnergyDashboardChartCard extends HTMLElement {
    private _hass: any;
    config?: EnergyDashboardChartConfig;
    private _root: ShadowRoot;
    private _powerChartEl: HTMLElement | null;
    private _energyChartEl: HTMLElement | null;
    private _updateTimer: number | null;
    private _powerEntities: string[];
    private _energyEntities: string[];
    private _isLoading: boolean;
    private _apexChartCardRegistered: boolean | null;
    private _currentRefreshInterval: number;
    private _currentTimeRangeHours: number;
    private _viewMode: 'power' | 'energy';

    // Card picker properties
    static get cardType(): string;
    static get displayName(): string;
    static get description(): string;
    static get icon(): string;

    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    private _handleViewModeChange: (event: CustomEvent) => void;
    private _loadViewMode(): 'power' | 'energy';
    setConfig(config: Partial<EnergyDashboardChartConfig>): void;
    static getConfigElement(): HTMLElement;
    static getStubConfig(): Partial<EnergyDashboardChartConfig>;
    getCardSize(): number;
    set hass(hass: any);
    get hass(): any;
    private _loadSelectedEntities(): void;
    private _startUpdateInterval(): void;
    private _stopUpdateInterval(): void;
    private _generateApexchartsConfig(entities: string[], isEnergy: boolean): any | null;
    private _createChart(isEnergy: boolean): HTMLElement;
    private _createEmptyCard(isEnergy: boolean): HTMLElement;
    private _createLoadingIndicator(): HTMLElement;
    private _createErrorMessage(error: string, suggestions: string[]): HTMLElement;
    private _updateCharts(): void;
    private _renderSectionTitle(title: string, isEnergy?: boolean): HTMLElement;
    private _updateContent(): void;
    private _checkApexChartsRegistration(): void;
    private _setRefreshInterval(seconds: number): void;
    private _setTimeRange(hours: number): void;
    private _manualRefresh(): void;
    private _createRefreshRatePillControls(): HTMLElement;
    private _updateRefreshRatePillControlsUI(container?: HTMLElement): void;
    private _createTimeRangeControls(): HTMLElement;
    private _updateTimeRangeControlsUI(container?: HTMLElement): void;
    private _createYAxisControls(): HTMLElement;
    private _updateYAxisControlsUI(container?: HTMLElement): void;
    private _setYAxisMax(maxValue: string): void;
    private _createAveragingControls(): HTMLElement;
    private _updateAveragingControlsUI(container?: HTMLElement): void;
}