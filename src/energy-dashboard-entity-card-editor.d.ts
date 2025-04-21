import { LitElement } from 'lit';
import { EnergyDashboardConfig } from './types';
export declare class EnergyDashboardEntityCardEditor extends LitElement {
    hass: any;
    config: EnergyDashboardConfig;
    static get properties(): {
        hass: {
            type: ObjectConstructor;
        };
        config: {
            type: ObjectConstructor;
        };
    };
    constructor();
    static get styles(): import("lit").CSSResult;
    setConfig(config: EnergyDashboardConfig): void;
    valueChanged(ev: Event): void;
    render(): import("lit-html").TemplateResult<1>;
}
