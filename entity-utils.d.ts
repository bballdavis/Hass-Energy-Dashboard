/**
 * Utility functions for entity selection, persistence, and Home Assistant state parsing.
 * Includes helpers for power/energy entity extraction and toggle state management.
 */
import { EntityInfo } from './types';
/**
 * Returns all power entities (W/kW) from Home Assistant state.
 * @param hass Home Assistant state object
 * @returns Array of EntityInfo for power entities
 */
export declare function getPowerEntities(hass: any): EntityInfo[];
/**
 * Returns all energy entities (Wh/kWh) from Home Assistant state.
 * @param hass Home Assistant state object
 * @returns Array of EntityInfo for energy entities
 */
export declare function getEnergyEntities(hass: any): EntityInfo[];
/**
 * Loads toggle states from localStorage for a given key.
 * @param key Storage key
 * @returns Record of entityId to boolean, or null if not found
 */
export declare function loadToggleStates(key: string): Record<string, boolean> | null;
/**
 * Saves toggle states to localStorage for a given key.
 * @param states Record of entityId to boolean
 * @param key Storage key
 */
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
