import { EnergyDashboardConfig } from './types';

export interface ChartSeries {
  entity: string;
  name: string;
  color?: string;
  type?: string; // 'line', 'area', etc.
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
  // Chart specific options
  chart_type: string; // 'line', 'area', 'bar'
  chart_height: number;
  show_points: boolean;
  smooth_curve: boolean;
  update_interval: number; // In seconds
  hours_to_show: number;
  aggregate_func: string; // 'avg', 'min', 'max', 'sum', etc.
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

export function getDefaultChartConfig(): Partial<EnergyDashboardChartConfig> {
  return {
    chart_type: 'line',
    chart_height: 300,
    show_points: false,
    smooth_curve: true,
    update_interval: 60,
    hours_to_show: 24,
    aggregate_func: 'avg',
    power_chart_options: {
      y_axis: {
        min: 0,
        decimals: 1,
        title: 'Power',
        unit: 'W'
      }
    },
    energy_chart_options: {
      y_axis: {
        min: 0,
        decimals: 2,
        title: 'Energy',
        unit: 'kWh'
      }
    },
    use_custom_colors: false
  };
}