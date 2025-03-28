const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class PowerEntitiesCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      powerEntities: { type: Array },
      entityToggleStates: { type: Object } // Add property for toggle states
    };
  }

  static get styles() {
    return css`
      :host {
        --card-padding: 16px;
        --entity-height: 17px;
        --entity-width: 240px;
      }
      .card-header {
        padding: var(--card-padding);
        font-family: var(--paper-font-headline_-_font-family);
        -webkit-font-smoothing: var(--paper-font-headline_-_-webkit-font-smoothing);
        font-size: var(--paper-font-headline_-_font-size);
        font-weight: var(--paper-font-headline_-_font-weight);
        letter-spacing: var(--paper-font-headline_-_letter-spacing);
        line-height: var(--paper-font-headline_-_line-height);
        color: var(--ha-card-header-color, --primary-text-color);
      }
      .entities-container {
        padding: 0 var(--card-padding) var(--card-padding);
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-start;
      }
      .entity-item {
        background-color: var(--ha-card-background, var(--card-background-color, white));
        border-radius: 12px;
        padding: 10px 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        height: var(--entity-height);
        width: var(--entity-width);
        box-sizing: border-box;
        flex-grow: 0;
        flex-shrink: 0;
      }
      @media (max-width: 600px) {
        .entity-item {
          width: 100%;
          flex-grow: 1;
        }
      }
      .entity-item:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-1px);
      }
      .entity-item.on {
        background-color: var(--primary-color);
        color: var(--text-primary-color);
      }
      .entity-left {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .entity-name {
        font-weight: bold;
        font-size: 0.95em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 140px;
        flex: 1;
      }
      .entity-state {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        min-width: 60px;
      }
      .power-value {
        font-weight: 500;
      }
      .empty-message {
        padding: var(--card-padding);
        text-align: center;
        color: var(--secondary-text-color);
      }
    `;
  }

  constructor() {
    super();
    this.powerEntities = [];
    this.entityToggleStates = {}; // Initialize toggle states object
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this.config = {
      title: 'Power Devices',
      show_header: true,
      show_state: true,
      show_toggle: true,
      ...config
    };
  }

  getCardSize() {
    // More accurate card sizing based on number of entities and their size
    if (!this.powerEntities || this.powerEntities.length === 0) return 1;
    
    // Calculate how many entities fit in a row based on card width
    // This is an estimate since we can't directly access the card width
    const cardWidth = 500; // Estimate based on typical Home Assistant card width
    const entityWidth = 240 + 8; // Width + gap
    const entitiesPerRow = Math.max(1, Math.floor(cardWidth / entityWidth));
    
    // Calculate rows needed
    const rows = Math.ceil(this.powerEntities.length / entitiesPerRow);
    
    // Each row is about 37px (17px height + 20px padding/margins)
    // Add 1 for the header
    return rows + 1;
  }

  updated(changedProps) {
    if (changedProps.has('hass')) {
      this._updateEntities();
    }
  }

  _updateEntities() {
    if (!this.hass) return;

    // Get current power entities
    const newPowerEntities = Object.keys(this.hass.states)
      .filter(entityId => {
        const stateObj = this.hass.states[entityId];
        return stateObj.attributes && 
               stateObj.attributes.unit_of_measurement === 'W';
      })
      .map(entityId => {
        const stateObj = this.hass.states[entityId];
        const domain = entityId.split('.')[0];
        const isToggleable = ['switch', 'light', 'input_boolean', 'fan', 'automation'].includes(domain);
        const powerValue = parseFloat(stateObj.state) || 0;
        
        return {
          entityId,
          name: stateObj.attributes.friendly_name || entityId,
          state: stateObj.state,
          powerValue,
          isToggleable
        };
      })
      .sort((a, b) => b.powerValue - a.powerValue); // Sort by power value, highest first
    
    // Initialize toggle states if they don't exist
    if (Object.keys(this.entityToggleStates).length === 0) {
      this._initializeToggleStates(newPowerEntities);
    }
    
    // Add toggle state to each entity
    this.powerEntities = newPowerEntities.map(entity => ({
      ...entity,
      isOn: this.entityToggleStates[entity.entityId] || false
    }));

    // Store the latest toggle states
    this._saveToggleStates();
  }

  _initializeToggleStates(entities) {
    // Get stored toggle states from localStorage
    const savedStates = this._loadToggleStates();
    
    if (savedStates && Object.keys(savedStates).length > 0) {
      this.entityToggleStates = savedStates;
    } else {
      // Set top 6 entities to ON by default
      const toggleStates = {};
      entities.slice(0, 6).forEach(entity => {
        toggleStates[entity.entityId] = true;
      });
      this.entityToggleStates = toggleStates;
    }
  }

  _loadToggleStates() {
    try {
      const stored = localStorage.getItem('power-entities-toggle-states');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Failed to load toggle states:', e);
      return null;
    }
  }

  _saveToggleStates() {
    try {
      localStorage.setItem('power-entities-toggle-states', 
        JSON.stringify(this.entityToggleStates));
    } catch (e) {
      console.error('Failed to save toggle states:', e);
    }
  }

  _toggleEntity(ev) {
    const entityId = ev.currentTarget.dataset.entity;
    if (!entityId || !this.config.show_toggle) return;
    
    // Toggle the entity state in our JSON store
    this.entityToggleStates[entityId] = !this.entityToggleStates[entityId];
    
    // Update the UI
    this.powerEntities = this.powerEntities.map(entity => 
      entity.entityId === entityId 
        ? { ...entity, isOn: this.entityToggleStates[entityId] } 
        : entity
    );
    
    // Save the updated toggle states
    this._saveToggleStates();
    
    // Request an update
    this.requestUpdate();
    
    // If entity is toggleable, also control the actual device
    const domain = entityId.split('.')[0];
    if (['switch', 'light', 'input_boolean', 'fan', 'automation'].includes(domain)) {
      const isOn = this.entityToggleStates[entityId];
      const service = isOn ? 'turn_on' : 'turn_off';
      this.hass.callService(domain, service, { entity_id: entityId });
    }
  }

  render() {
    if (!this.hass || !this.config) {
      return html``;
    }

    return html`
      <ha-card>
        ${this.config.show_header ? html`
          <div class="card-header">${this.config.title}</div>
        ` : ''}
        
        ${this.powerEntities.length > 0 ? html`
          <div class="entities-container">
            ${this.powerEntities.map(entity => html`
              <div 
                class="entity-item ${entity.isOn ? 'on' : 'off'}"
                data-entity="${entity.entityId}"
                @click="${this._toggleEntity}"
              >
                <div class="entity-left">
                  <div class="entity-name">${entity.name}</div>
                </div>
                <div class="entity-state">
                  <div class="status-indicator">${entity.isToggleable ? (entity.isOn ? 'ON' : 'OFF') : ''}</div>
                  <div class="power-value">${this.config.show_state ? `${entity.state} W` : ''}</div>
                </div>
              </div>
            `)}
          </div>
        ` : html`
          <div class="empty-message">
            No power entities found
          </div>
        `}
      </ha-card>
    `;
  }
}

customElements.define('power-entities-card', PowerEntitiesCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "power-entities-card",
  name: "Power Entities Card",
  description: "Card that displays all entities with power measurements (W)"
});