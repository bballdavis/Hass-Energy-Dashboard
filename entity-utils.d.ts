import { EntityInfo } from './types';
export declare function getPowerEntities(hass: any): EntityInfo[];
export declare function getEnergyEntities(hass: any): EntityInfo[];
export declare function loadToggleStates(key: string): Record<string, boolean> | null;
export declare function saveToggleStates(states: Record<string, boolean>, key: string): void;
/**
 * Retrieves min/max historical values for a set of entities over a specific time period
 * Uses the Home Assistant History API
 *
 * @param hass - Home Assistant instance
 * @param entityIds - Array of entity IDs to retrieve history for
 * @param hours - Number of hours to look back
 * @returns Promise with an object containing min and max values for each entity
 */
export declare function getHistoricalMinMax(hass: any, entityIds: string[], hours?: number): Promise<Record<string, {
    min: number;
    max: number;
}>>;
