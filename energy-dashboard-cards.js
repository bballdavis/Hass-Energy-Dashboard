/**
 * Energy Dashboard Cards
 * A package containing both energy dashboard cards for Home Assistant
 * Version: 1.0.0
 */

// If cards are already defined, don't redefine them
if (!customElements.get('energy-dashboard-entity-card')) {
  import('./energy-dashboard-entity-card.js');
}

if (!customElements.get('energy-dashboard-chart-card')) {
  import('./energy-dashboard-chart-card.js');
}

// Register metadata for the package
const info = {
  name: "Energy Dashboard Cards",
  version: "1.0.0",
  description: "Power and Energy visualization cards for Home Assistant",
  documentationURL: "https://github.com/yourusername/hass-energy-dashboard"
};

console.info(
  "%c ENERGY-DASHBOARD-CARDS %c Version " + info.version + " ",
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);

// Make sure we register this as a card set that's available
const registeredCards = [
  {
    type: "energy-dashboard-entity-card",
    name: "Energy Dashboard Entity Card",
    description: "Card that displays power (W/kW) and energy (Wh/kWh) measurement entities"
  },
  {
    type: "energy-dashboard-chart-card",
    name: "Energy Dashboard Chart Card", 
    description: "Chart card that automatically displays entities selected in the Entity Card"
  }
];

// Register all card types in the window.customCards array
if (!window.customCards) {
  window.customCards = [];
}

// Filter out any duplicate entries before pushing
registeredCards.forEach(card => {
  if (!window.customCards.some(existingCard => existingCard.type === card.type)) {
    window.customCards.push(card);
  }
});
