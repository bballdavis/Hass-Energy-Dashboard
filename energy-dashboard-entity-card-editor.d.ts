/**
 * Editor component for the Energy Dashboard Entity Card.
 * Provides a UI for users to configure entity card options in Home Assistant.
 * Handles form rendering, validation, and config change events.
 */
import { EnergyDashboardConfig } from './types';
export declare class EnergyDashboardEntityCardEditor extends HTMLElement {
    hass: any;
    config: EnergyDashboardConfig;
    private _root;
    constructor();
    connectedCallback(): void;
    setConfig(config: EnergyDashboardConfig): void;
    valueChanged: (ev: Event) => void;
    private _updateForm;
    private _createRow;
}
