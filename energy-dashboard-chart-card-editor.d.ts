import { EnergyDashboardChartConfig } from './energy-dashboard-chart-config';
export declare class EnergyDashboardChartCardEditor extends HTMLElement {
    hass: any;
    config?: EnergyDashboardChartConfig;
    private _root;
    constructor();
    connectedCallback(): void;
    setConfig(config: Partial<EnergyDashboardChartConfig>): void;
    valueChanged: (ev: Event) => void;
    private _updateForm;
    private _createRow;
    private _addSectionTitle;
}
