/**
 * Energy Dashboard Cards
 * Basic inline script to check if both cards are loaded
 * Version: 1.0.0
 */

(() => {
  const entityCardLoaded = !!customElements.get('energy-dashboard-entity-card');
  const chartCardLoaded = !!customElements.get('energy-dashboard-chart-card');
  
  console.info(
    "%c ENERGY-DASHBOARD-CARDS %c Checking card status... ",
    "color: orange; font-weight: bold; background: black",
    "color: white; font-weight: bold; background: dimgray"
  );
  
  console.info(`Energy Dashboard Entity Card: ${entityCardLoaded ? 'Loaded ✅' : 'Not loaded ❌'}`);
  console.info(`Energy Dashboard Chart Card: ${chartCardLoaded ? 'Loaded ✅' : 'Not loaded ❌'}`);
  
  if (entityCardLoaded && chartCardLoaded) {
    console.info(
      "%c ENERGY-DASHBOARD-CARDS %c Both cards loaded successfully! ",
      "color: orange; font-weight: bold; background: black",
      "color: green; font-weight: bold; background: dimgray"
    );
  } else {
    console.warn(
      "%c ENERGY-DASHBOARD-CARDS %c Some cards failed to load. Add them separately to resources. ",
      "color: orange; font-weight: bold; background: black",
      "color: red; font-weight: bold; background: dimgray"
    );
  }
})();
