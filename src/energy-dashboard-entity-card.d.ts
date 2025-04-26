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
    private _viewMode: 'power' | 'energy';
    private _preventFlashingTimeout: number | null;
    private _pendingUpdate: boolean;

    // Card picker properties
    static get cardType(): string;
    static get displayName(): string;
    static get description(): string;
    static get icon(): string;

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
        persist_selection: boolean;
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
    private _togglePersistence: () => void;
    private _loadPersistenceState(): boolean;
    private _savePersistenceState(persist: boolean): void;
    private _saveViewMode(mode: 'power' | 'energy'): void;
    private _loadViewMode(): 'power' | 'energy';
    private _toggleViewMode: () => void;
    private _renderPowerSection(): HTMLElement;
    private _renderEnergySection(): HTMLElement;
    private _updateContent(): void;
    private _performActualUpdate(): void;
    private _updateEntityValues(): void;
    private _equalizeButtonHeights(buttonContainer: HTMLElement): void;
    private _debugSection(section: HTMLElement, label: string): HTMLElement;
    private _forceRecalculation(element: HTMLElement): number;
}
