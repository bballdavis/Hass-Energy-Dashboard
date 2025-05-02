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
export function getPowerEntities(hass: any): EntityInfo[] {
  return Object.keys(hass.states)
    .filter(entityId => {
      const stateObj = hass.states[entityId];
      return stateObj && stateObj.attributes &&
        (stateObj.attributes.unit_of_measurement === 'W' ||
         stateObj.attributes.unit_of_measurement === 'kW');
    })
    .map(entityId => {
      const stateObj = hass.states[entityId];
      const domain = entityId.split('.')[0];
      const isToggleable = ['switch', 'light', 'input_boolean', 'fan', 'automation'].includes(domain);

      let powerValue = 0;
      try {
        if (stateObj.attributes.unit_of_measurement === 'kW') {
          powerValue = parseFloat(stateObj.state) * 1000;
        } else {
          powerValue = parseFloat(stateObj.state) || 0;
        }
      } catch {
        powerValue = 0;
      }

      return {
        entityId,
        name: stateObj.attributes.friendly_name || entityId,
        state: stateObj.state,
        unit: stateObj.attributes.unit_of_measurement,
        powerValue,
        isToggleable
      };
    })
    .sort((a, b) => b.powerValue! - a.powerValue!);
}

/**
 * Returns all energy entities (Wh/kWh) from Home Assistant state.
 * @param hass Home Assistant state object
 * @returns Array of EntityInfo for energy entities
 */
export function getEnergyEntities(hass: any): EntityInfo[] {
  return Object.keys(hass.states)
    .filter(entityId => {
      const stateObj = hass.states[entityId];
      return stateObj && stateObj.attributes &&
        (stateObj.attributes.unit_of_measurement === 'Wh' ||
         stateObj.attributes.unit_of_measurement === 'kWh');
    })
    .map(entityId => {
      const stateObj = hass.states[entityId];
      const domain = entityId.split('.')[0];
      const isToggleable = ['switch', 'light', 'input_boolean', 'fan', 'automation'].includes(domain);

      let energyValue = 0;
      try {
        if (stateObj.attributes.unit_of_measurement === 'Wh') {
          energyValue = parseFloat(stateObj.state) / 1000;
        } else {
          energyValue = parseFloat(stateObj.state) || 0;
        }
      } catch {
        energyValue = 0;
      }

      return {
        entityId,
        name: stateObj.attributes.friendly_name || entityId,
        state: stateObj.state,
        unit: stateObj.attributes.unit_of_measurement,
        energyValue,
        isToggleable
      };
    })
    .sort((a, b) => b.energyValue! - a.energyValue!);
}

/**
 * Loads toggle states from localStorage for a given key.
 * @param key Storage key
 * @returns Record of entityId to boolean, or null if not found
 */
export function loadToggleStates(key: string): Record<string, boolean> | null {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Saves toggle states to localStorage for a given key.
 * @param states Record of entityId to boolean
 * @param key Storage key
 */
export function saveToggleStates(states: Record<string, boolean>, key: string): void {
  try {
    localStorage.setItem(key, JSON.stringify(states));
  } catch {
    try {
      const reducedStates: Record<string, boolean> = {};
      Object.keys(states).forEach(k => {
        if (states[k]) reducedStates[k] = true;
      });
      localStorage.setItem(key, JSON.stringify(reducedStates));
    } catch {}
  }
}

/**
 * Retrieves min/max historical values for a set of entities over a specific time period
 * Uses the Home Assistant History API
 * 
 * @param hass - Home Assistant instance
 * @param entityIds - Array of entity IDs to retrieve history for
 * @param hours - Number of hours to look back
 * @returns Promise with an object containing min and max values for each entity
 */
export async function getHistoricalMinMax(
  hass: any, 
  entityIds: string[], 
  hours: number = 24
): Promise<Record<string, {min: number, max: number}>> {
  const now = new Date();
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
  
  // Format dates for HA API
  const startStr = start.toISOString();
  const endStr = now.toISOString();
  
  try {
    // Call the History API
    const history = await hass.callApi('GET', `history/period/${startStr}`, {
      filter_entity_id: entityIds.join(','),
      end_time: endStr,
      minimal_response: true
    });

    const result: Record<string, {min: number, max: number}> = {};
    
    // Process the history data for each entity
    if (Array.isArray(history)) {
      history.forEach(entityHistory => {
        if (!entityHistory || entityHistory.length === 0) return;
        
        const entityId = entityHistory[0].entity_id;
        let min: number | null = null;
        let max: number | null = null;
        
        // Find min and max values in the history
        entityHistory.forEach((state: any) => {
          if (state.state === 'unavailable' || state.state === 'unknown') return;
          
          const value = parseFloat(state.state);
          if (isNaN(value)) return;
          
          // Apply unit conversion if needed
          let adjustedValue = value;
          if (state.attributes && 
             (state.attributes.unit_of_measurement === 'kW' || 
              state.attributes.unit_of_measurement === 'kWh')) {
            adjustedValue *= 1000; // Convert to W or Wh
          }
          
          if (min === null || adjustedValue < min) min = adjustedValue;
          if (max === null || adjustedValue > max) max = adjustedValue;
        });
        
        // Only add to result if we found valid values
        if (min !== null && max !== null) {
          result[entityId] = { min, max };
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return {};
  }
}