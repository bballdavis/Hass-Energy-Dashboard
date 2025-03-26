import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('chart-card')
export class ChartCard extends LitElement {
  static get styles() {
    return css`
      .chart-section {
        margin-top: 12px;
      }
      .chart-section-title {
        padding: 0 var(--card-padding) 8px;
        font-size: 16px;
        font-weight: 500;
        color: var(--primary-text-color);
        display: flex;
        align-items: center;
      }
      .section-separator {
        height: 1px;
        background-color: var(--divider-color, #e0e0e0);
        margin: 12px var(--card-padding) 8px;
        opacity: 0.6;
      }
      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        text-align: center;
        color: var(--secondary-text-color);
      }
      .loading ha-circular-progress {
        margin-bottom: 16px;
      }
    `;
  }

  @property({ type: Array }) selectedPowerEntities: any[] = [];
  @property({ type: Array }) selectedEnergyEntities: any[] = [];
  @property({ type: Object }) chartConfig: any;
  @property({ type: Boolean }) showPowerChart: boolean = true;
  @property({ type: Boolean }) showEnergyChart: boolean = true;

  render() {
    return html`
      <ha-card>
        ${this.showPowerChart && this.selectedPowerEntities.length > 0 ? html`
          <div class="chart-section">
            <div class="chart-section-title">Power Consumption</div>
            <apexcharts-card
              .hass=${this.hass}
              .config=${this.chartConfig.charts.find(c => c.header.title === 'Power Consumption')}
            ></apexcharts-card>
          </div>
        ` : ''}
        ${this.showEnergyChart && this.selectedEnergyEntities.length > 0 ? html`
          ${this.showPowerChart && this.selectedPowerEntities.length > 0 ? html`
            <div class="section-separator"></div>
          ` : ''}
          <div class="chart-section">
            <div class="chart-section-title">Energy Consumption</div>
            <apexcharts-card
              .hass=${this.hass}
              .config=${this.chartConfig.charts.find(c => c.header.title === 'Energy Consumption')}
            ></apexcharts-card>
          </div>
        ` : ''}
        ${this.selectedPowerEntities.length === 0 && this.selectedEnergyEntities.length === 0 ? html`
          <div class="loading">
            <ha-circular-progress indeterminate></ha-circular-progress>
            <div>Loading charts...</div>
          </div>
        ` : ''}
      </ha-card>
    `;
  }
}