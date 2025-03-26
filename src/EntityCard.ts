import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { entityCardStyles } from './EntityCardStyles';

@customElement('entity-card')
export class EntityCard extends LitElement {
  static get styles() {
    return [
      entityCardStyles,
    ];
  }

  @property({ type: Array }) powerEntities: any[] = [];
  @property({ type: Array }) energyEntities: any[] = [];
  @property({ type: Boolean }) showEnergySection: boolean = true;
  @property({ type: Number }) maxHeight: number = 400;

  render() {
    const containerStyle = this.maxHeight > 0 ? 
      `max-height: ${Math.min(this.maxHeight, 400)}px; overflow-y: auto;` : '';
    return html`
      <ha-card>
        ${this.showEnergySection ? html`
          <div class="section-separator"></div>
          <div class="control-buttons">
            <button class="control-button" @click="${this._resetToEnergyDefaultEntities}">
              <ha-icon icon="mdi:refresh"></ha-icon>
              <span>Reset</span>
            </button>
            <button class="control-button" @click="${this._clearAllEnergyEntities}">
              <ha-icon icon="mdi:close-circle-outline"></ha-icon>
              <span>Clear</span>
            </button>
            <button class="control-button" @click="${this._selectAllEnergyEntities}">
              <ha-icon icon="mdi:check-circle-outline"></ha-icon>
              <span>Select All</span>
            </button>
          </div>
          <div class="section-title">Energy Entities</div>
          <div style="width: 100%; box-sizing: border-box;">
            <div class="entities-container" style="${containerStyle}">
              ${this.energyEntities.map(entity => html`
                <div 
                  class="entity-item ${entity.isOn ? 'on' : 'off'}"
                  data-entity="${entity.entityId}"
                  @click="${this._toggleEnergyEntity}"
                  style="gap: 4px;"
                >
                  <div class="entity-left">
                    <div class="entity-name" title="${entity.name}">${entity.name}</div>
                  </div>
                  <div class="entity-state">
                    <div class="status-indicator">${entity.isToggleable ? (entity.isOn ? 'ON' : 'OFF') : ''}</div>
                    <div class="power-value">${this.showEnergySection ? 
                      `${entity.state} ${entity.unit}` : 
                      ''}
                    </div>
                  </div>
                </div>
              `)}
            </div>
          </div>
        ` : html`
          <div class="empty-message">
            No energy entities found. Make sure you have entities with unit set to Wh or kWh.
          </div>
        `}
      </ha-card>
    `;
  }

  _resetToEnergyDefaultEntities() {
    if (!this.energyEntities || this.energyEntities.length === 0) return;
    const newToggleStates = {};
    this.energyEntities
      .slice(0, 6)
      .forEach(entity => {
        newToggleStates[entity.entityId] = true;
      });
    this.energyEntityToggleStates = newToggleStates;
    this._updateEnergyEntityStates();
    this._saveEnergyToggleStates();
  }

  _clearAllEnergyEntities() {
    const newToggleStates = {};
    this.energyEntities.forEach(entity => {
      newToggleStates[entity.entityId] = false;
    });
    this.energyEntityToggleStates = newToggleStates;
    this._updateEnergyEntityStates();
    this._saveEnergyToggleStates();
  }

  _selectAllEnergyEntities() {
    const newToggleStates = {};
    this.energyEntities.forEach(entity => {
      newToggleStates[entity.entityId] = true;
    });
    this.energyEntityToggleStates = newToggleStates;
    this._updateEnergyEntityStates();
    this._saveEnergyToggleStates();
  }

  _toggleEnergyEntity(ev) {
    const entityId = ev.currentTarget.dataset.entity;
    if (!entityId) return;
    this.energyEntityToggleStates[entityId] = !this.energyEntityToggleStates[entityId];
    this.energyEntities = this.energyEntities.map(entity => 
      entity.entityId === entityId 
        ? { ...entity, isOn: this.energyEntityToggleStates[entity.entityId] } 
        : entity
    );
    this._saveEnergyToggleStates();
    this.requestUpdate();
    this._controlEntity(entityId, this.energyEntityToggleStates[entityId]);
  }

  _controlEntity(entityId, isOn) {
    const domain = entityId.split('.')[0];
    if (['switch', 'light', 'input_boolean', 'fan', 'automation'].includes(domain)) {
      const service = isOn ? 'turn_on' : 'turn_off';
      this.hass.callService(domain, service, { entity_id: entityId });
    }
  }

  _updateEnergyEntityStates() {
    this.energyEntities = this.energyEntities.map(entity => ({
      ...entity,
      isOn: this.energyEntityToggleStates[entity.entityId] || false
    }));
    this.requestUpdate();
    this.energyEntities.forEach(entity => {
      if (entity.isToggleable && entity.isOn !== undefined) {
        this._controlEntity(entity.entityId, entity.isOn);
      }
    });
  }

  _saveEnergyToggleStates() {
    try {
      localStorage.setItem('energy-dashboard-energy-toggle-states', JSON.stringify(this.energyEntityToggleStates));
    } catch (e) {
      console.error(`Failed to save toggle states for energy-dashboard-energy-toggle-states:`, e);
      try {
        const reducedStates = {};
        Object.keys(this.energyEntityToggleStates).forEach(key => {
          if (this.energyEntityToggleStates[key]) {
            reducedStates[key] = true;
          }
        });
        localStorage.setItem('energy-dashboard-energy-toggle-states', JSON.stringify(reducedStates));
      } catch (e2) {
        console.error(`Failed to save reduced toggle states for energy-dashboard-energy-toggle-states:`, e2);
      }
    }
  }
}