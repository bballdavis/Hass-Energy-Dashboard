import { LitElement, PropertyValues } from 'lit';
import { EntityInfo, EnergyDashboardConfig } from './types';
export declare class EnergyDashboardEntityCard extends LitElement {
    hass: any;
    config?: EnergyDashboardConfig;
    powerEntities: EntityInfo[];
    energyEntities: EntityInfo[];
    entityToggleStates: Record<string, boolean>;
    energyEntityToggleStates: Record<string, boolean>;
    private _initialized;
    private _energyInitialized;
    static get properties(): {
        hass: {
            type: ObjectConstructor;
        };
        config: {
            type: ObjectConstructor;
        };
        powerEntities: {
            type: ArrayConstructor;
        };
        energyEntities: {
            type: ArrayConstructor;
        };
        entityToggleStates: {
            type: ObjectConstructor;
        };
        energyEntityToggleStates: {
            type: ObjectConstructor;
        };
    };
    static get styles(): import("lit").CSSResult;
    constructor();
    setConfig(config: EnergyDashboardConfig): void;
    static getConfigElement(): HTMLElement;
    static getStubConfig(): {
        title: string;
        show_header: boolean;
        show_state: boolean;
        show_toggle: boolean;
        auto_select_count: number;
        max_height: number;
        show_energy_section: boolean;
        energy_auto_select_count: number;
    };
    getCardSize(): number;
    updated(changedProps: PropertyValues): void;
    _updateEntities(): void;
    _updatePowerEntities(): void;
    _updateEnergyEntities(): void;
    _initializePowerToggleStates(entities: EntityInfo[]): void;
    _initializeEnergyToggleStates(entities: EntityInfo[]): void;
    _savePowerToggleStates(): void;
    _saveEnergyToggleStates(): void;
    _resetToPowerDefaultEntities(): void;
    _clearAllPowerEntities(): void;
    _selectAllPowerEntities(): void;
    _togglePowerEntity(e: Event): void;
    _resetToEnergyDefaultEntities(): void;
    _clearAllEnergyEntities(): void;
    _selectAllEnergyEntities(): void;
    _toggleEnergyEntity(e: Event): void;
    render(): import("lit-html").TemplateResult<1>;
}
