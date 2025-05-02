import { EnergyDashboardConfig } from './types';

export interface ChartSeries {
  entity: string;
  name: string;
  color?: string;
  type?: string;
  stroke_width?: number;
  curve?: string; // 'smooth', 'straight'
  show_points?: boolean;
}

export interface ChartAxisOptions {
  min?: number;
  max?: number;
  tickAmount?: number;
  decimals?: number;
  title?: string;
  unit?: string;
}

export interface ChartOptions {
  y_axis: ChartAxisOptions;
  x_axis?: ChartAxisOptions;
}

export interface EnergyDashboardChartConfig extends EnergyDashboardConfig {
  chart_height?: number;
  show_points?: boolean;
  smooth_curve?: boolean;
  stroke_width?: number;
  update_interval?: number;
  hours_to_show?: number;
  chart_options?: ChartOptions;
  use_custom_colors?: boolean;
  show_legend?: boolean;
  y_axis_max_presets?: number[];
}

export declare function getDefaultChartConfig(): Partial<EnergyDashboardChartConfig>;