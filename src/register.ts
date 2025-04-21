// Declare customCards on window
declare global {
  interface Window {
    customCards: any[];
  }
}

// Using import type with side effects to prevent 'unused import' warnings
// These imports are needed to ensure the web components are registered
import './energy-dashboard-entity-card';
import './energy-dashboard-entity-card-editor';

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
// Each will show up separately in the Add Card menu of Home Assistant
// For example:
// window.customCards.push({
//   type: "energy-dashboard-chart-card",
//   name: "Energy Dashboard: Chart Card",
//   description: "Card that visualizes energy usage over time",
//   preview: false,
//   documentationURL: "https://github.com/bballdavis/Hass-Energy-Dashboard"
// });
