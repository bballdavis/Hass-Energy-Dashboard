// Declare customCards on window
declare global {
  interface Window {
    customCards: any[];
  }
}

// Import the components and their implementations
// This ensures they are included in the final bundle
export * from './energy-dashboard-entity-card';
export * from './energy-dashboard-entity-card-editor';

window.customCards = window.customCards || [];

// Register the Energy Dashboard Entity Card
window.customCards.push({
  type: "energy-dashboard-entity-card",
  name: "Energy Dashboard: Entity Card",
  description: "Card that displays power (W/kW) and energy (Wh/kWh) measurement entities",
  preview: false,
  documentationURL: "https://github.com/bballdavis/Hass-Energy-Dashboard"
});

// Additional cards can be registered here as they're developed
