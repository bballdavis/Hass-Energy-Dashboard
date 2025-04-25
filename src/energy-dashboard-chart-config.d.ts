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

export interface EnergyDashboardChartConfig extends EnergyDashboardConfig {
  chart_type?: string; // Made optional
  chart_height?: number; // Made optional
  show_points?: boolean; // Made optional
  smooth_curve?: boolean; // Made optional
  stroke_width?: number; // Added new property
  update_interval?: number;
  hours_to_show?: number;
  aggregate_func?: string;
  power_chart_options?: {
    y_axis: ChartAxisOptions;
    x_axis?: ChartAxisOptions;
  };
  energy_chart_options?: {
    y_axis: ChartAxisOptions;
    x_axis?: ChartAxisOptions;
  };
  use_custom_colors?: boolean;
  show_legend?: boolean;
}

export declare function getDefaultChartConfig(): Partial<EnergyDashboardChartConfig>;