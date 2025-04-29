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
  view_mode?: 'power' | 'energy';  // New property to track active view mode
  entity_removal_filter?: string; // Renamed from entity_filter - filter for removing entities
  [key: string]: any;
}
