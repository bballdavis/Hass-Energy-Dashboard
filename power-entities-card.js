const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class PowerEntitiesCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      powerEntities: { type: Array }
    };
  }

  static get styles() {
    return css`
      :host {
        --card-padding: 16px;
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
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        grid-gap: 8px;
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
        height: 17px;
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
      }
      .entity-state {
        display: flex;
        align-items: center;
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
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this.config = {
      title: 'Power Entities',
      show_header: true,
      show_state: true,
      show_toggle: true,
      ...config
    };
  }

  getCardSize() {
    return 1 + Math.ceil(this.powerEntities.length / 2);
  }

  updated(changedProps) {
    if (changedProps.has('hass')) {
      this._updateEntities();
    }
  }

  _updateEntities() {
    if (!this.hass) return;

    this.powerEntities = Object.keys(this.hass.states)
      .filter(entityId => {
        const stateObj = this.hass.states[entityId];
        return stateObj.attributes && 
               stateObj.attributes.unit_of_measurement === 'W';
      })
      .map(entityId => {
        const stateObj = this.hass.states[entityId];
        const domain = entityId.split('.')[0];
        const isToggleable = ['switch', 'light', 'input_boolean', 'fan', 'automation'].includes(domain);
        const isOn = stateObj.state === 'on' || 
                    stateObj.state === 'home' || 
                    parseFloat(stateObj.state) > 0;
        
        return {
          entityId,
          name: stateObj.attributes.friendly_name || entityId,
          state: stateObj.state,
          powerValue: parseFloat(stateObj.state) || 0,
          isToggleable,
          isOn
        };
      })
      .sort((a, b) => b.powerValue - a.powerValue); // Sort by power value, highest first
  }

  _toggleEntity(ev) {
    const entityId = ev.currentTarget.dataset.entity;
    if (!entityId || !this.config.show_toggle) return;
    
    const domain = entityId.split('.')[0];
    if (['switch', 'light', 'input_boolean', 'fan', 'automation'].includes(domain)) {
      const service = this.hass.states[entityId].state === 'on' ? 'turn_off' : 'turn_on';
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
