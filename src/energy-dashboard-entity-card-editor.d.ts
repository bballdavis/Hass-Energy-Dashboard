import { EnergyDashboardConfig } from './types';

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
}

export declare class EnergyDashboardEntityCardEditor extends HTMLElement {
    hass: any;
    config: EnergyDashboardConfig;
    private _root: ShadowRoot;
    
    constructor();
    connectedCallback(): void;
    setConfig(config: EnergyDashboardConfig): void;
    valueChanged: (ev: Event) => void;
    private _updateForm(): void;
    private _createRow(): HTMLDivElement;
}
