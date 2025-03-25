/**
 * Energy Dashboard Cards
 * A package containing both energy dashboard cards
 */

// Import Entity Card
import './energy-dashboard-entity-card.js';

// Import Chart Card
import './energy-dashboard-chart-card.js';

// Register cards in a common package
const CARDS = [
  {
    type: "energy-dashboard-entity-card",
    name: "Energy Dashboard Entity Card",
    description: "Card that displays power (W/kW) and energy (Wh/kWh) measurement entities",
    preview: false,
  },
  {
    type: "energy-dashboard-chart-card",
    name: "Energy Dashboard Chart Card", 
    description: "Chart card that automatically displays entities selected in the Energy Dashboard Entity Card",
    preview: false,
  }
];

// Register all cards
if (!window.customCards) {
  window.customCards = [];
}

window.customCards.push(...CARDS);

console.info(
  "%c ENERGY-DASHBOARD-CARDS %c Loaded both Energy Dashboard Cards ",
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);
