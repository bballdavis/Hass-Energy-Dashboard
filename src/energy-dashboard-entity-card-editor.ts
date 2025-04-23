import { LitElement, html, css } from "lit-element";
import { EnergyDashboardConfig } from './types';

// Extend HTMLInputElement to include the configValue property
interface CustomHTMLInputElement extends HTMLInputElement {
  configValue?: string;
}

export class EnergyDashboardEntityCardEditor extends LitElement {
  // Explicit property declarations for TypeScript
  hass: any;
  config: EnergyDashboardConfig;

  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }

  constructor() {
    super();
    this.hass = undefined;
    this.config = undefined as unknown as EnergyDashboardConfig;
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

  setConfig(config: EnergyDashboardConfig) {
    this.config = {
      // First spread the provided config
      ...config,
      // Then apply defaults for any missing properties
      show_header: config.show_header !== undefined ? config.show_header : true,
      show_state: config.show_state !== undefined ? config.show_state : true,
      show_toggle: config.show_toggle !== undefined ? config.show_toggle : true,
      auto_select_count: config.auto_select_count !== undefined ? config.auto_select_count : 6,
      max_height: config.max_height !== undefined ? config.max_height : 400, // Default to ~15 entities
      show_energy_section: config.show_energy_section !== undefined ? config.show_energy_section : true,
      energy_auto_select_count: config.energy_auto_select_count !== undefined ? config.energy_auto_select_count : 6,
      title: config.title !== undefined ? config.title : 'Energy Dashboard',
    };
  }

  valueChanged(ev: Event) {
    if (!this.config) return;
    const target = ev.target as CustomHTMLInputElement;
    const configValue = target.configValue;
    if (!configValue) return;

    let newValue;
    if (typeof target.checked === 'boolean') {
      newValue = target.checked;
    } else if (target.value !== undefined) {
      if (target.type === 'number') {
        newValue = Number(target.value);
      } else {
        newValue = target.value;
      }
    }

    if (this.config[configValue] === newValue) return;

    const newConfig = {
      ...this.config,
      [configValue]: newValue
    };

    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true
    }));
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
            .configValue="title"
            @change="${this.valueChanged}"
            class="value"
          ></ha-textfield>
        </div>

        <div class="row">
          <ha-switch
            .checked=${this.config.show_header !== false}
            .configValue="show_header"
            @change="${this.valueChanged}"
          ></ha-switch>
          <div>Show Header</div>
        </div>

        <div class="row">
          <ha-switch
            .checked=${this.config.show_state !== false}
            .configValue="show_state"
            @change="${this.valueChanged}"
          ></ha-switch>
          <div>Show State</div>
        </div>

        <div class="row">
          <ha-switch
            .checked=${this.config.show_toggle !== false}
            .configValue="show_toggle"
            @change="${this.valueChanged}"
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
            .configValue="auto_select_count"
            @change="${this.valueChanged}"
            class="value"
          ></ha-textfield>
        </div>

        <div class="row">
          <ha-textfield
            label="Energy Auto-select Count"
            type="number"
            min="0"
            max="50"
            .value="${String(this.config.energy_auto_select_count || 6)}"
            .configValue="energy_auto_select_count"
            @change="${this.valueChanged}"
            class="value"
          ></ha-textfield>
        </div>

        <div class="row">
          <ha-switch
            .checked=${this.config.show_energy_section !== false}
            .configValue="show_energy_section"
            @change="${this.valueChanged}"
          ></ha-switch>
          <div>Show Energy Section</div>
        </div>

        <div class="row">
          <ha-textfield
            label="Max Height (0 for no limit)"
            type="number"
            min="0"
            max="1000"
            .value="${String(this.config.max_height || 0)}"
            .configValue="max_height"
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

customElements.define('energy-dashboard-entity-card-editor', EnergyDashboardEntityCardEditor);