import { EntityInfo } from './types';

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

export function loadToggleStates(key: string): Record<string, boolean> | null {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

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