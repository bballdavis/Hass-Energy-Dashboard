import { EnergyDashboardConfig } from './types';

export interface ChartSeries {
  entity: string;
  name: string;
  color?: string;
  type?: string;
  stroke_width?: number;
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
  chart_type: string;
  chart_height: number;
  show_points: boolean;
  smooth_curve: boolean;
  update_interval: number;
  hours_to_show: number;
  aggregate_func: string;
  power_chart_options: {
    y_axis: ChartAxisOptions;
    x_axis?: ChartAxisOptions;
  };
  energy_chart_options: {
    y_axis: ChartAxisOptions;
    x_axis?: ChartAxisOptions;
  };
  use_custom_colors: boolean;
}

export declare function getDefaultChartConfig(): Partial<EnergyDashboardChartConfig>;