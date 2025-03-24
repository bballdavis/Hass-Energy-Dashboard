import { EnergyDashboardEntityCard } from './card.js';
import { EnergyDashboardEntityCardEditor } from './editor.js';

// Set card editor on main class - both methods are provided for compatibility
EnergyDashboardEntityCard.getConfigElement = function() {
  return document.createElement('energy-dashboard-entity-card-editor');
};

// This is the modern way to specify the editor
EnergyDashboardEntityCard.editConfigElement = function() {
  return document.createElement('energy-dashboard-entity-card-editor');
};

window.customCards = window.customCards || [];
window.customCards.push({
  type: "energy-dashboard-entity-card",
  name: "Energy Dashboard Entity Card",
  description: "Card that displays all entities with power measurements (W)",
  preview: false
});