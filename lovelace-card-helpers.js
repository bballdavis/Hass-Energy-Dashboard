/**
 * Helper functions for Lovelace cards
 */

// Helper to properly register a card with Home Assistant
export const registerLovelaceCard = (config) => {
  // Make sure we have all required fields
  if (!config || !config.type || !config.name || !config.element) {
    console.error("Invalid card registration config", config);
    return false;
  }
  
  try {
    // If the custom element isn't defined yet, define it
    if (!customElements.get(config.type)) {
      customElements.define(config.type, config.element);
    }
    
    // Register the card type if not already registered
    window.customCards = window.customCards || [];
    if (!window.customCards.find(card => card.type === config.type)) {
      window.customCards.push({
        type: config.type,
        name: config.name,
        description: config.description || '',
        preview: config.preview === undefined ? false : config.preview,
        documentationURL: config.documentationURL || ''
      });
    }
    
    // Log success
    console.info(`Custom card registered: ${config.name}`);
    return true;
  } catch (error) {
    console.error(`Error registering card ${config.name}:`, error);
    return false;
  }
};
