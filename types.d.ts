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
    entity_filter?: string;
    [key: string]: any;
}
