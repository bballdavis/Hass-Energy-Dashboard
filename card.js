import { LitElement, html } from 'lit-element';
import { styles } from './styles';

export class EnergyDashboardEntityCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      powerEntities: { type: Array },
      entityToggleStates: { type: Object }
    };
  }

  static get styles() {
    return styles;
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
      max_height: 400,
      ...config
    };
  }

  getCardSize() {
    if (!this.powerEntities || this.powerEntities.length === 0) return 1;
    
    const cardWidth = 500;
    const entityWidth = 240 + 8;
    const entitiesPerRow = Math.max(1, Math.floor(cardWidth / entityWidth));
    
    const rows = Math.ceil(this.powerEntities.length / entitiesPerRow);
    
    return rows + 1;
  }

  updated(changedProps) {
    if (changedProps.has('hass')) {
      this._updateEntities();
    }
  }

  _updateEntities() {
    if (!this.hass) return;

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
      .sort((a, b) => b.powerValue - a.powerValue);
    
    if (Object.keys(this.entityToggleStates).length === 0) {
      this._initializeToggleStates(newPowerEntities);
    }
    
    this.powerEntities = newPowerEntities.map(entity => ({
      ...entity,
      isOn: this.entityToggleStates[entity.entityId] || false
    }));

    this._saveToggleStates();
  }

  _initializeToggleStates(entities) {
    const savedStates = this._loadToggleStates();
    
    if (savedStates && Object.keys(savedStates).length > 0) {
      this.entityToggleStates = savedStates;
    } else {
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
    
    this.entityToggleStates[entityId] = !this.entityToggleStates[entityId];
    
    this.powerEntities = this.powerEntities.map(entity => 
      entity.entityId === entityId 
        ? { ...entity, isOn: this.entityToggleStates[entityId] } 
        : entity
    );
    
    this._saveToggleStates();
    
    this.requestUpdate();
    
    const domain = entityId.split('.')[0];
    if (['switch', 'light', 'input_boolean', 'fan', 'automation'].includes(domain)) {
      const isOn = this.entityToggleStates[entityId];
      const service = isOn ? 'turn_on' : 'turn_off';
      this.hass.callService(domain, service, { entity_id: entityId });
    }
  }

  _resetToDefaultEntities() {
    if (!this.powerEntities || this.powerEntities.length === 0) return;
    
    const newToggleStates = {};
    this.powerEntities
      .slice(0, this.config.auto_select_count)
      .forEach(entity => {
        newToggleStates[entity.entityId] = true;
      });
    
    this.entityToggleStates = newToggleStates;
    
    this._updateEntityStates();
    
    this._saveToggleStates();
  }
  
  _clearAllEntities() {
    const newToggleStates = {};
    this.powerEntities.forEach(entity => {
      newToggleStates[entity.entityId] = false;
    });
    
    this.entityToggleStates = newToggleStates;
    
    this._updateEntityStates();
    
    this._saveToggleStates();
  }
  
  _selectAllEntities() {
    const newToggleStates = {};
    this.powerEntities.forEach(entity => {
      newToggleStates[entity.entityId] = true;
    });
    
    this.entityToggleStates = newToggleStates;
    
    this._updateEntityStates();
    
    this._saveToggleStates();
  }
  
  _updateEntityStates() {
    this.powerEntities = this.powerEntities.map(entity => ({
      ...entity,
      isOn: this.entityToggleStates[entity.entityId] || false
    }));
    
    this.requestUpdate();
    
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
              <ha-icon icon="mdi:refresh"></ha-icon>
              <span>Reset</span>
            </button>
            <button class="control-button" @click="${this._clearAllEntities}">
              <ha-icon icon="mdi:close-circle-outline"></ha-icon>
              <span>Clear</span>
            </button>
            <button class="control-button" @click="${this._selectAllEntities}">
              <ha-icon icon="mdi:check-circle-outline"></ha-icon>
              <span>Select All</span>
            </button>
          </div>
          
          <div class="section-title">Power Entities</div>
          
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

customElements.define('energy-dashboard-entity-card', EnergyDashboardEntityCard);
