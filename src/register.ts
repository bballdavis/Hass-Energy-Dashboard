// Import the components and their implementations
import './energy-dashboard-entity-card';
import './energy-dashboard-entity-card-editor';
import './energy-dashboard-chart-card'; // Add our new chart card
import './card-registration';

// The customElements.define calls within the imported files handle the registration.
// The card-registration.ts file handles exposing the card to the Home Assistant card picker UI.

// Additional cards can be registered here as they're developed
