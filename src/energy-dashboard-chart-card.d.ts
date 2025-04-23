import { EnergyDashboardChartConfig } from './energy-dashboard-chart-config';

export declare class EnergyDashboardChartCard extends HTMLElement {
    private _hass: any;
    config?: EnergyDashboardChartConfig;
    private _root: ShadowRoot;
    private _powerChartEl: HTMLElement | null;
    private _energyChartEl: HTMLElement | null;
    private _entityToggleStates: Record<string, boolean>;
    private _energyEntityToggleStates: Record<string, boolean>;
    private _updateTimer: number | null;
    private _powerEntities: string[];
    private _energyEntities: string[];

    // Card picker properties
    static get cardType(): string;
    static get displayName(): string;
    static get description(): string;
    static get icon(): string;

    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
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
    private _updateCharts(): void;
    private _renderSectionTitle(title: string): HTMLElement;
    private _updateContent(): void;
}