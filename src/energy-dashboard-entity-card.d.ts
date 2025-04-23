import { EntityInfo, EnergyDashboardConfig } from './types';

export declare class EnergyDashboardEntityCard extends HTMLElement {
    private _hass: any;
    config?: EnergyDashboardConfig;
    powerEntities: EntityInfo[];
    energyEntities: EntityInfo[];
    entityToggleStates: Record<string, boolean>;
    energyEntityToggleStates: Record<string, boolean>;
    private _initialized: boolean;
    private _energyInitialized: boolean;
    private _root: ShadowRoot;

    constructor();
    connectedCallback(): void;
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
    set hass(hass: any);
    get hass(): any;
    private _updateEntities(): void;
    private _updatePowerEntities(): void;
    private _updateEnergyEntities(): void;
    private _initializePowerToggleStates(entities: EntityInfo[]): void;
    private _initializeEnergyToggleStates(entities: EntityInfo[]): void;
    private _savePowerToggleStates(): void;
    private _saveEnergyToggleStates(): void;
    private _resetToPowerDefaultEntities: () => void;
    private _clearAllPowerEntities: () => void;
    private _selectAllPowerEntities: () => void;
    private _togglePowerEntity: (e: Event) => void;
    private _resetToEnergyDefaultEntities: () => void;
    private _clearAllEnergyEntities: () => void;
    private _selectAllEnergyEntities: () => void;
    private _toggleEnergyEntity: (e: Event) => void;
    private _renderPowerSection(): HTMLElement;
    private _renderEnergySection(): HTMLElement;
    private _updateContent(): void;
}
