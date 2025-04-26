// This file is specifically for registering the card with Home Assistant's card picker UI

// Make this a proper module with exports
export {}; // Empty export to make this a module

// Define the customCards property for window
declare global {
  interface Window {
    customCards: Array<{
      type: string;
      name: string;
      description: string;
      preview: boolean;
      documentationURL?: string;
    }>;
  }
}

// Provide card information to the Home Assistant card catalog
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'energy-dashboard-entity-card',
  name: 'Energy Dashboard Entity Card',
  description: 'Card to select and display power and energy entities',
  preview: false,
  documentationURL: 'https://github.com/bballdavis/Hass-Energy-Dashboard'
});

// Add the chart card to the Home Assistant card catalog
window.customCards.push({
  type: 'energy-dashboard-chart-card',
  name: 'Energy Dashboard Chart',
  description: 'Chart companion for the Energy Dashboard Entity Card',
  preview: false,
  documentationURL: 'https://github.com/bballdavis/Hass-Energy-Dashboard'
});