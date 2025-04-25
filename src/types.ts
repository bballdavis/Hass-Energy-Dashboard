export interface EntityInfo {
  entityId: string;
  name: string;
  state: string;
  unit: string;
  powerValue?: number;
  energyValue?: number;
  isToggleable: boolean;
  isOn?: boolean;
  color?: string;  // Color for consistent visualization between entity and chart
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
  [key: string]: any;
}
