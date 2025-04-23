import { EnergyDashboardChartConfig } from './energy-dashboard-chart-config';

// Interface for custom form elements
interface CustomHTMLInputElement extends HTMLInputElement {
  configValue?: string;
}

interface HaFormElement extends HTMLElement {
  label?: string;
  value?: string | number | boolean;
  type?: string;
  min?: string;
  max?: string;
  configValue?: string;
  checked?: boolean;
  helperText?: string;
  helperPersistent?: boolean;
  options?: Array<{value: string, label: string}>;
}

export declare class EnergyDashboardChartCardEditor extends HTMLElement {
    hass: any;
    config?: EnergyDashboardChartConfig;
    private _root: ShadowRoot;
    
    constructor();
    connectedCallback(): void;
    setConfig(config: Partial<EnergyDashboardChartConfig>): void;
    valueChanged: (ev: Event) => void;
    private _updateForm(): void;
    private _createRow(): HTMLDivElement;
    private _addSectionTitle(parent: HTMLElement, title: string): void;
}