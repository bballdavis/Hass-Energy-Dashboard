/**
 * Type definitions for entity information and dashboard configuration.
 * Used throughout the dashboard for type safety and clarity.
 */
/**
 * EntityInfo describes a Home Assistant entity with power/energy data and toggle state.
 */
export interface EntityInfo {
    entityId: string;
    name: string;
    state: string;
    unit: string;
    powerValue?: number;
    energyValue?: number;
    isToggleable: boolean;
    isOn?: boolean;
}
/**
 * EnergyDashboardConfig describes the configuration for the entity card.
 */
export interface EnergyDashboardConfig {
    title: string;
    show_header: boolean;
    show_state: boolean;
    show_toggle: boolean;
    auto_select_count: number;
    max_height: number;
    energy_auto_select_count: number;
    persist_selection: boolean;
    view_mode?: 'power' | 'energy';
    entity_removal_filter?: string;
    refresh_rate?: 'off' | '10s' | '30s';
    [key: string]: any;
}
