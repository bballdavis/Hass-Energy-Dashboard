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
window.customCards.push({
  type: "energy-dashboard-entity-card",
  name: "Energy Dashboard Entity Card",
  description: "Card that displays power (W/kW) and energy (Wh/kWh) measurement entities",
  preview: false,
  documentationURL: "https://github.com/bballdavis/Hass-Energy-Dashboard"
});
