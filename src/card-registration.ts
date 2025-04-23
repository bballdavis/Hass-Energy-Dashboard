import { EnergyDashboardEntityCard } from './energy-dashboard-entity-card';
import { EnergyDashboardChartCard } from './energy-dashboard-chart-card';

// This file is specifically for registering the card with Home Assistant's card picker UI

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
  name: EnergyDashboardEntityCard.displayName,
  description: EnergyDashboardEntityCard.description,
  preview: false,
  documentationURL: 'https://github.com/bballdavis/Hass-Energy-Dashboard'
});

// Add the chart card to the Home Assistant card catalog
window.customCards.push({
  type: 'energy-dashboard-chart-card',
  name: EnergyDashboardChartCard.displayName,
  description: EnergyDashboardChartCard.description,
  preview: false,
  documentationURL: 'https://github.com/bballdavis/Hass-Energy-Dashboard'
});