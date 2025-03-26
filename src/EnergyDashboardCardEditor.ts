import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('energy-dashboard-card-editor')
export class EnergyDashboardCardEditor extends LitElement {
  @property({ type: Object }) hass: any;
  @property({ type: Object }) config: any;

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
      card_type: "entity",
      title: 'Energy Dashboard',
      show_header: true,
      show_state: true,
      show_toggle: true,
      auto_select_count: 6,
      max_height: 400,
      show_energy_section: true,
      energy_auto_select_count: 6,
      chart_type: 'line',
      chart_height: '300px',
      refresh_interval: 30,
      span: {
        start: "hour",
        offset: -1
      },
      show_power_chart: true,
      show_energy_chart: true,
      power_chart_type: 'line',
      energy_chart_type: 'bar',
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
          <ha-select
            label="Card Type"
            .value=${this.config.card_type}
            .configValue=${"card_type"}
            @selected=${this.valueChanged}
            class="value"
          >
            <mwc-list-item value="entity">Entity</mwc-list-item>
            <mwc-list-item value="chart">Chart</mwc-list-item>
          </ha-select>
        </div>
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
        ${this.config.card_type === "entity" ? html`
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
              label="Energy Auto-select Count"
              type="number"
              min="0"
              max="50"
              .value="${String(this.config.energy_auto_select_count || 6)}"
              .configValue=${"energy_auto_select_count"}
              @change="${this.valueChanged}"
              class="value"
            ></ha-textfield>
          </div>
          <div class="row">
            <ha-switch
              .checked=${this.config.show_energy_section !== false}
              .configValue=${"show_energy_section"}
              @change=${this.valueChanged}
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
              .configValue=${"max_height"}
              @change="${this.valueChanged}"
              class="value"
              helper-persistent
              helper-text="Set maximum height in pixels (0 = no limit)"
            ></ha-textfield>
          </div>
        ` : html`
          <div class="row">
            <ha-select
              label="Power Chart Type"
              .value=${this.config.power_chart_type || 'line'}
              .configValue=${"power_chart_type"}
              @selected=${this.valueChanged}
              class="value"
            >
              <mwc-list-item value="line">Line</mwc-list-item>
              <mwc-list-item value="area">Area</mwc-list-item>
              <mwc-list-item value="bar">Bar</mwc-list-item>
            </ha-select>
          </div>
          <div class="row">
            <ha-select
              label="Energy Chart Type"
              .value=${this.config.energy_chart_type || 'bar'}
              .configValue=${"energy_chart_type"}
              @selected=${this.valueChanged}
              class="value"
            >
              <mwc-list-item value="bar">Bar</mwc-list-item>
              <mwc-list-item value="line">Line</mwc-list-item>
              <mwc-list-item value="area">Area</mwc-list-item>
            </ha-select>
          </div>
          <div class="row">
            <ha-textfield
              label="Chart Height (e.g. 300px)"
              .value="${this.config.chart_height || '300px'}"
              .configValue=${"chart_height"}
              @change="${this.valueChanged}"
              class="value"
            ></ha-textfield>
          </div>
          <div class="row">
            <ha-textfield
              label="Refresh Interval (seconds)"
              type="number"
              min="5"
              max="3600"
              .value="${String(this.config.refresh_interval || 30)}"
              .configValue=${"refresh_interval"}
              @change="${this.valueChanged}"
              class="value"
            ></ha-textfield>
          </div>
          <div class="title">Time Range Settings</div>
          <div class="row">
            <ha-select
              label="Start From"
              .value=${this.config.span?.start || 'hour'}
              .configValue=${"span_start"}
              @selected=${this.valueChanged}
              class="value"
            >
              <mwc-list-item value="minute">Minute</mwc-list-item>
              <mwc-list-item value="hour">Hour</mwc-list-item>
              <mwc-list-item value="day">Day</mwc-list-item>
              <mwc-list-item value="week">Week</mwc-list-item>
              <mwc-list-item value="month">Month</mwc-list-item>
              <mwc-list-item value="year">Year</mwc-list-item>
            </ha-select>
          </div>
          <div class="row">
            <ha-textfield
              label="Offset (negative = past, positive = future)"
              type="number"
              .value="${String(this.config.span?.offset || -1)}"
              .configValue=${"span_offset"}
              @change="${this.valueChanged}"
              class="value"
            ></ha-textfield>
          </div>
        `}
      </div>
    `;
  }
}