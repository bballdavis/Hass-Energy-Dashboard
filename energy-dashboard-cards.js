/**
 * Energy Dashboard Cards
 * A package containing both energy dashboard cards for Home Assistant
 * Version: 1.0.0
 */

console.info(
  "%c ENERGY-DASHBOARD-CARDS %c Loading cards... ",
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);

// Create a simple script loader function
const loadScript = (url) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Define the paths relative to where this script is loaded
const basePath = new URL(import.meta.url).pathname.replace('energy-dashboard-cards.js', '');
const entityCardPath = `${basePath}energy-dashboard-entity-card.js`;
const chartCardPath = `${basePath}energy-dashboard-chart-card.js`;

// Load the cards sequentially
Promise.all([
  loadScript(entityCardPath).catch(e => console.error("Failed to load entity card:", e)),
  loadScript(chartCardPath).catch(e => console.error("Failed to load chart card:", e))
]).then(() => {
  console.info(
    "%c ENERGY-DASHBOARD-CARDS %c All cards loaded successfully ",
    "color: orange; font-weight: bold; background: black",
    "color: green; font-weight: bold; background: dimgray"
  );
}).catch(error => {
  console.error("Error loading Energy Dashboard Cards:", error);
});

// Register the cards for HACS and Lovelace
window.customCards = window.customCards || [];

// Only add if not already registered
if (!window.customCards.some(card => card.type === "energy-dashboard-entity-card")) {
  window.customCards.push({
    type: "energy-dashboard-entity-card",
    name: "Energy Dashboard Entity Card",
    description: "Card that displays power (W/kW) and energy (Wh/kWh) measurement entities",
    preview: false,
    documentationURL: "https://github.com/yourusername/hass-energy-dashboard"
  });
}

if (!window.customCards.some(card => card.type === "energy-dashboard-chart-card")) {
  window.customCards.push({
    type: "energy-dashboard-chart-card",
    name: "Energy Dashboard Chart Card",
    description: "Chart card that automatically displays entities selected in the Entity Card",
    preview: false,
    documentationURL: "https://github.com/yourusername/hass-energy-dashboard"
  });
}
