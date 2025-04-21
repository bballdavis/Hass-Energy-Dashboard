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
  show_energy_section: boolean;
  energy_auto_select_count: number;
  [key: string]: any;
}
