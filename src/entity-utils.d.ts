import { EntityInfo } from './types';
export declare function getPowerEntities(hass: any): EntityInfo[];
export declare function getEnergyEntities(hass: any): EntityInfo[];
export declare function loadToggleStates(key: string): Record<string, boolean> | null;
export declare function saveToggleStates(states: Record<string, boolean>, key: string): void;
export declare function getHistoricalMinMax(
  hass: any, 
  entityIds: string[], 
  hours?: number
): Promise<Record<string, {min: number, max: number}>>;
