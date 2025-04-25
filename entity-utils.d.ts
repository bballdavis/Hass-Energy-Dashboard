import { EntityInfo } from './types';
export declare function getEntityColor(entityId: string): string;
export declare function getPowerEntities(hass: any): EntityInfo[];
export declare function getEnergyEntities(hass: any): EntityInfo[];
export declare function loadToggleStates(key: string): Record<string, boolean> | null;
export declare function saveToggleStates(states: Record<string, boolean>, key: string): void;
