const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class EnergyDashboardEntityCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      powerEntities: { type: Array },
      entityToggleStates: { type: Object }
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
      .control-buttons {
        padding: 0 var(--card-padding) 8px;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }
      .control-button {
        background-color: var(--secondary-background-color);
        border: none;
        border-radius: 8px;
        padding: 6px 12px;
        color: var(--primary-text-color);
        font-size: 0.9em;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s ease;
        flex: 1;
        margin: 0 4px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      }
      .control-button:first-child {
        margin-left: 0;
      }
      .control-button:last-child {
        margin-right: 0;
      }
      .control-button:hover {
        background-color: var(--primary-color);
        color: var(--text-primary-color);
      }
      .control-button ha-icon {
        margin-right: 4px;
      }
      .entities-container {
        padding: 0 var(--card-padding) var(--card-padding);
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-start;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--scrollbar-thumb-color) transparent;
      }
      
      /* Webkit scrollbar styling */
      .entities-container::-webkit-scrollbar {
        width: 6px;
      }
      
      .entities-container::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .entities-container::-webkit-scrollbar-thumb {
        background-color: var(--scrollbar-thumb-color, var(--divider-color, #e0e0e0));
        border-radius: 3px;
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
    this.entityToggleStates = {};
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this.config = {
      title: 'Energy Dashboard',
      show_header: true,
      show_state: true,
      show_toggle: true,
      auto_select_count: 6,
      max_height: 400, // Default to around 15 entities before scrolling (37px per row * ~15 = ~400px)
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
      // Set top N entities to ON by default, where N is auto_select_count from config
      const toggleStates = {};
      entities.slice(0, this.config.auto_select_count).forEach(entity => {
        toggleStates[entity.entityId] = true;
      });
      this.entityToggleStates = toggleStates;
    }
  }

  _loadToggleStates() {
    try {
      const stored = localStorage.getItem('energy-dashboard-entity-toggle-states');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Failed to load toggle states:', e);
      return null;
    }
  }

  _saveToggleStates() {
    try {
      localStorage.setItem('energy-dashboard-entity-toggle-states', 
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

  _resetToDefaultEntities() {
    if (!this.powerEntities || this.powerEntities.length === 0) return;
    
    // Reset toggle states to default (top N based on auto_select_count)
    const newToggleStates = {};
    this.powerEntities
      .slice(0, this.config.auto_select_count)
      .forEach(entity => {
        newToggleStates[entity.entityId] = true;
      });
    
    // Update toggle states
    this.entityToggleStates = newToggleStates;
    
    // Update UI with new states
    this._updateEntityStates();
    
    // Save the updated toggle states
    this._saveToggleStates();
  }
  
  _clearAllEntities() {
    // Turn all entities off
    const newToggleStates = {};
    this.powerEntities.forEach(entity => {
      newToggleStates[entity.entityId] = false;
    });
    
    // Update toggle states
    this.entityToggleStates = newToggleStates;
    
    // Update UI with new states
    this._updateEntityStates();
    
    // Save the updated toggle states
    this._saveToggleStates();
  }
  
  _selectAllEntities() {
    // Turn all entities on
    const newToggleStates = {};
    this.powerEntities.forEach(entity => {
      newToggleStates[entity.entityId] = true;
    });
    
    // Update toggle states
    this.entityToggleStates = newToggleStates;
    
    // Update UI with new states
    this._updateEntityStates();
    
    // Save the updated toggle states
    this._saveToggleStates();
  }
  
  _updateEntityStates() {
    // Update the powerEntities with the new toggle states
    this.powerEntities = this.powerEntities.map(entity => ({
      ...entity,
      isOn: this.entityToggleStates[entity.entityId] || false
    }));
    
    // Request a UI update
    this.requestUpdate();
    
    // Also toggle the actual entities if they are toggleable
    this.powerEntities.forEach(entity => {
      if (entity.isToggleable) {
        const domain = entity.entityId.split('.')[0];
        if (['switch', 'light', 'input_boolean', 'fan', 'automation'].includes(domain)) {
          const service = entity.isOn ? 'turn_on' : 'turn_off';
          this.hass.callService(domain, service, { entity_id: entity.entityId });
        }
      }
    });
  }

  render() {
    if (!this.hass || !this.config) {
      return html``;
    }

    // Calculate container style based on max_height config
    const containerStyle = this.config.max_height > 0 ? 
      `max-height: ${this.config.max_height}px; overflow-y: auto;` : '';

    return html`
      <ha-card>
        ${this.config.show_header ? html`
          <div class="card-header">${this.config.title}</div>
        ` : ''}
        
        ${this.powerEntities.length > 0 ? html`
          <div class="control-buttons">
            <button class="control-button" @click="${this._resetToDefaultEntities}">
              <ha-icon icon="mdi:refresh"></ha-icon> Reset
            </button>
            <button class="control-button" @click="${this._clearAllEntities}">
              <ha-icon icon="mdi:close-circle-outline"></ha-icon> Clear
            </button>
            <button class="control-button" @click="${this._selectAllEntities}">
              <ha-icon icon="mdi:check-circle-outline"></ha-icon> Select All
            </button>
          </div>
          <div class="entities-container" style="${containerStyle}">
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

// Define the card editor
class EnergyDashboardEntityCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }

  static get styles() {
    return css`
      .form {
        display: flex;
        flex-direction: column;
      }
      .row {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 8px 16px;
      }
      .title {
        padding-left: 16px;
        margin-top: 8px;
        font-weight: 500;
      }
      .value {
        width: 100%;
      }
      ha-switch {
        margin-right: 16px;
      }
    `;
  }

  setConfig(config) {
    this.config = {
      title: 'Energy Dashboard',
      show_header: true,
      show_state: true,
      show_toggle: true,
      auto_select_count: 6,
      max_height: 400, // Default to ~15 entities
      ...config
    };
  }

  valueChanged(ev) {
    if (!this.config) return;
    
    const target = ev.target;
    
    if (this.config === undefined) {
      return;
    }
    
    if (target.configValue) {
      let newValue;
      
      if (target.checked !== undefined) {
        newValue = target.checked;
      } else if (target.value) {
        if (target.type === 'number') {
          newValue = Number(target.value);
        } else {
          newValue = target.value;
        }
      }
      
      if (this.config[target.configValue] === newValue) {
        return;
      }
      
      const newConfig = {
        ...this.config,
        [target.configValue]: newValue
      };
      
      const event = new CustomEvent('config-changed', {
        detail: { config: newConfig },
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(event);
    }
  }

  render() {
    if (!this.config) return html``;

    return html`
      <div class="form">
        <div class="title">Card Settings</div>
        
        <div class="row">
          <ha-textfield
            label="Title"
            .value="${this.config.title || ''}"
            .configValue=${"title"}
            @change="${this.valueChanged}"
            class="value"
          ></ha-textfield>
        </div>
        
        <div class="row">
          <ha-switch
            .checked=${this.config.show_header !== false}
            .configValue=${"show_header"}
            @change=${this.valueChanged}
          ></ha-switch>
          <div>Show Header</div>
        </div>
        
        <div class="row">
          <ha-switch
            .checked=${this.config.show_state !== false}
            .configValue=${"show_state"}
            @change=${this.valueChanged}
          ></ha-switch>
          <div>Show State</div>
        </div>
        
        <div class="row">
          <ha-switch
            .checked=${this.config.show_toggle !== false}
            .configValue=${"show_toggle"}
            @change=${this.valueChanged}
          ></ha-switch>
          <div>Allow Toggling</div>
        </div>
        
        <div class="row">
          <ha-textfield
            label="Auto-select Count"
            type="number"
            min="0"
            max="50"
            .value="${String(this.config.auto_select_count || 6)}"
            .configValue=${"auto_select_count"}
            @change="${this.valueChanged}"
            class="value"
          ></ha-textfield>
        </div>
        
        <div class="row">
          <ha-textfield
            label="Max Height (0 for no limit)"
            type="number"
            min="0"
            max="1000"
            .value="${String(this.config.max_height || 0)}"
            .configValue=${"max_height"}
            @change="${this.valueChanged}"
            class="value"
            helper-persistent
            helper-text="Set maximum height in pixels (0 = no limit)"
          ></ha-textfield>
        </div>
      </div>
    `;
  }
}

// Register the editor
customElements.define('energy-dashboard-entity-card-editor', EnergyDashboardEntityCardEditor);

// Set card editor on main class - both methods are provided for compatibility
EnergyDashboardEntityCard.getConfigElement = function() {
  return document.createElement('energy-dashboard-entity-card-editor');
};

// This is the modern way to specify the editor
EnergyDashboardEntityCard.editConfigElement = function() {
  return document.createElement('energy-dashboard-entity-card-editor');
};

customElements.define('energy-dashboard-entity-card', EnergyDashboardEntityCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "energy-dashboard-entity-card",
  name: "Energy Dashboard Entity Card",
  description: "Card that displays all entities with power measurements (W)",
  preview: false
});