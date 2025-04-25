import { EntityInfo } from './types';

// Predefined colors for entities - a vibrant palette that works well with charts
const ENTITY_COLORS = [
  '#3498db', // blue
  '#e74c3c', // red
  '#2ecc71', // green
  '#9b59b6', // purple
  '#f39c12', // orange
  '#1abc9c', // turquoise
  '#d35400', // pumpkin
  '#8e44ad', // wisteria
  '#27ae60', // nephritis
  '#c0392b', // pomegranate
  '#16a085', // green sea
  '#f1c40f', // sunflower
  '#7f8c8d', // asbestos
  '#3498db', // peter river
  '#e67e22', // carrot
];

// Generate a consistent color for an entity based on its ID
export function getEntityColor(entityId: string): string {
  // Create a simple hash of the entity ID to get a consistent index
  let hash = 0;
  for (let i = 0; i < entityId.length; i++) {
    hash = entityId.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Map the hash to our color array
  const index = Math.abs(hash) % ENTITY_COLORS.length;
  return ENTITY_COLORS[index];
}

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
        isToggleable,
        color: getEntityColor(entityId) // Add consistent color to the entity
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
        isToggleable,
        color: getEntityColor(entityId) // Add consistent color to the entity
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