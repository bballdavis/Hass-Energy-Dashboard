import { LitElement, html } from 'lit-element';
import { editorStyles } from './styles';

export class EnergyDashboardEntityCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }

  static get styles() {
    return editorStyles;
  }

  setConfig(config) {
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

customElements.define('energy-dashboard-entity-card-editor', EnergyDashboardEntityCardEditor);
