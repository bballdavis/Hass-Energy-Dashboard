/**
 * Editor component for the Energy Dashboard Chart Card.
 * Provides a UI for users to configure chart options in Home Assistant.
 * Handles form rendering, validation, and config change events.
 */
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
