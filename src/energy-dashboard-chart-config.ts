/**
 * Configuration and type definitions for the Energy Dashboard chart card.
 * Describes chart options, presets, and config structure for type safety.
 */

import { EnergyDashboardConfig } from './types';

export interface ChartSeries {
  entity: string;
  name: string;
  color?: string;
  type?: string; // 'line', 'area', etc.
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
  chart_height: number;
  show_points: boolean;
  smooth_curve: boolean;
  stroke_width: number; // Allow decimals
  update_interval: number; // In seconds
  hours_to_show: number;
  chart_options: ChartOptions;
  use_custom_colors: boolean;
  show_legend: boolean;
  y_axis_max_presets: number[];
}

export function getDefaultChartConfig(): Partial<EnergyDashboardChartConfig> {
  return {
    chart_height: 300,
    show_points: false,
    smooth_curve: true,
    stroke_width: 2,
    update_interval: 30,
    hours_to_show: 24,
    chart_options: {
      y_axis: {
        // min is undefined by default (auto)
        decimals: 1,
        title: 'Power',
        unit: 'W'
      }
    },
    use_custom_colors: false,
    show_legend: true,
    y_axis_max_presets: [500, 3000, 9000]
  };
}