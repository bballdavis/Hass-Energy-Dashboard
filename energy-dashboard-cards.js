/**
 * Energy Dashboard Cards
 * Main entry point that loads both the entity card and chart card
 * Version: 1.0.0
 */

// Directly include the card code to ensure it's loaded properly
// We'll import from separate files

// Log loading start
console.info(
  "%c ENERGY-DASHBOARD-CARDS %c Loading cards... ",
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);

// Define dependency loader
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      return resolve();
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.type = 'module';
    script.onload = () => resolve();
    script.onerror = (err) => reject(new Error(`Failed to load ${src}: ${err}`));
    
    document.head.appendChild(script);
  });
};

// Helper function to get the base URL
const getBaseUrl = () => {
  const scripts = document.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    const src = scripts[i].src;
    if (src.endsWith('energy-dashboard-cards.js')) {
      return src.substring(0, src.lastIndexOf('/') + 1);
    }
  }
  // Fallback to current path
  return '/';
};

// Get base URL
const baseUrl = getBaseUrl();

// Load card files - paths are relative to where this script is loaded
Promise.all([
  loadScript(`${baseUrl}energy-dashboard-entity-card.js`),
  loadScript(`${baseUrl}energy-dashboard-chart-card.js`)
])
.then(() => {
  // Define cards used by Home Assistant
  window.customCards = window.customCards || [];

  // Register both cards once loaded
  if (customElements.get('energy-dashboard-entity-card')) {
    // Only add if not already in the array
    if (!window.customCards.find(c => c.type === 'energy-dashboard-entity-card')) {
      window.customCards.push({
        type: "energy-dashboard-entity-card",
        name: "Energy Dashboard Entity Card",
        description: "Card that displays power (W/kW) and energy (Wh/kWh) measurement entities",
        preview: false
      });
    }
    console.info("%c ENERGY-DASHBOARD-CARDS %c Entity Card loaded ✅", 
      "color: orange; font-weight: bold; background: black",
      "color: green; font-weight: bold; background: dimgray");
  } else {
    console.error("Failed to load Energy Dashboard Entity Card");
  }

  if (customElements.get('energy-dashboard-chart-card')) {
    // Only add if not already in the array
    if (!window.customCards.find(c => c.type === 'energy-dashboard-chart-card')) {
      window.customCards.push({
        type: "energy-dashboard-chart-card",
        name: "Energy Dashboard Chart Card",
        description: "Chart card that automatically displays entities selected in the Energy Dashboard Entity Card",
        preview: false
      });
    }
    console.info("%c ENERGY-DASHBOARD-CARDS %c Chart Card loaded ✅", 
      "color: orange; font-weight: bold; background: black",
      "color: green; font-weight: bold; background: dimgray");
  } else {
    console.error("Failed to load Energy Dashboard Chart Card");
  }
})
.catch(error => {
  console.error("Error loading Energy Dashboard Cards:", error);
});
