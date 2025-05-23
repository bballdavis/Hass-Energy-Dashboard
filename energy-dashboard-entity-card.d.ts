/**
 * Main component for the Energy Dashboard Entity Card.
 * Handles entity selection, filtering, persistence, and UI controls for power and energy entities.
 * Designed for Home Assistant custom dashboards.
 *
 * Key responsibilities:
 * - Display and manage selectable power/energy entities
 * - Provide search/filter, auto-select, clear, and reset controls
 * - Persist entity selections and view mode
 * - Sync with the chart card for visualization
 */
import { EntityInfo, EnergyDashboardConfig } from './types';
export declare class EnergyDashboardEntityCard extends HTMLElement {
    private _hass;
    config?: EnergyDashboardConfig;
    powerEntities: EntityInfo[];
    energyEntities: EntityInfo[];
    entityToggleStates: Record<string, boolean>;
    energyEntityToggleStates: Record<string, boolean>;
    private _initialized;
    private _energyInitialized;
    private _root;
    private _viewMode;
    private _powerEntitiesContainer;
    private _energyEntitiesContainer;
    private _dynamicFilterValue;
    private _filteredPowerEntities;
    private _filteredEnergyEntities;
    private _searchInputHasFocus;
    private _refreshIntervalId;
    private _lastUpdateTimestamp;
    private _forceUpdate;
    private _equalizeButtonHeights;
    private _forceRecalculation;
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
        persist_selection: boolean;
        entity_removal_filter: string;
    };
    getCardSize(): number;
    set hass(hass: any);
    get hass(): any;
    _updateEntities(): void;
    _updatePowerEntities(): void;
    _updateEnergyEntities(): void;
    _applyRemovalFilter(entities: EntityInfo[]): EntityInfo[];
    _applyDynamicFilter(entities: EntityInfo[], filterValue: string): EntityInfo[];
    _handleFilterInput: (e: Event) => void;
    _initializePowerToggleStates(entities: EntityInfo[]): void;
    _initializeEnergyToggleStates(entities: EntityInfo[]): void;
    _savePowerToggleStates(): void;
    _saveEnergyToggleStates(): void;
    _resetToPowerDefaultEntities: () => void;
    _clearAllPowerEntities: () => void;
    _selectAllPowerEntities: () => void;
    _togglePowerEntity: (e: Event) => void;
    _resetToEnergyDefaultEntities: () => void;
    _clearAllEnergyEntities: () => void;
    _selectAllEnergyEntities: () => void;
    _toggleEnergyEntity: (e: Event) => void;
    _togglePersistence: () => void;
    _loadPersistenceState(): boolean;
    _savePersistenceState(persist: boolean): void;
    _saveViewMode(mode: 'power' | 'energy'): void;
    _loadViewMode(): 'power' | 'energy';
    _toggleViewMode: () => void;
    _updateContent(): void;
    _updateEntityButtons(container: HTMLElement, entities: EntityInfo[], onClick: (e: Event) => void, isPower: boolean): void;
    _setRefreshRate(rate: 'off' | '10s' | '30s'): void;
    _refreshNow(): void;
    _clearRefreshInterval(): void;
    disconnectedCallback(): void;
    _setupRefreshInterval(): void;
}
