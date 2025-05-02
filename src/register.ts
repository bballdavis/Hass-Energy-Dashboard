/**
 * Main entry point for registering custom elements and cards with Home Assistant.
 * Ensures all custom cards are available for use in Lovelace dashboards.
 */

// Import the components and their implementations
import './energy-dashboard-entity-card';
import './energy-dashboard-entity-card-editor';
import './energy-dashboard-chart-card';
import './energy-dashboard-chart-card-editor'; // Add the chart card editor
import './card-registration';

// The customElements.define calls within the imported files handle the registration.
// The card-registration.ts file handles exposing the card to the Home Assistant card picker UI.

// Additional cards can be registered here as they're developed
