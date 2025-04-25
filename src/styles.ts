export function createStyles(cssText: string): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = cssText;
  return style;
}

export const cardStyles = `
  :host {
    --card-padding: 16px;
    --entity-height: 12px;
    --entity-width: 240px;
    --button-height: 32px;
    --entity-font-size: 0.95em;
    --section-title-font-size: 0.9975em;
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
    gap: min(4px, 1%); /* Use dynamic gap that shrinks with card size */
  }
  .control-button, .select-all-button {
    background-color: var(--card-background-color, white);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px; /* Reduced from 6px */
    padding: 2px 6px; /* Further reduced padding */
    color: var(--primary-text-color);
    font-size: 0.8em; /* Even smaller font */
    font-weight: 500;
    cursor: pointer;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    flex: 1;
    margin: 0;
    box-shadow: none; /* Removed for flatter appearance */
    min-height: 22px; /* Further reduced height */
    max-height: 22px; /* Added max-height to enforce compactness */
    box-sizing: border-box;
    white-space: nowrap; /* Prevent text wrapping */
    overflow: hidden; /* Prevent content overflow */
    line-height: 1; /* Tighter line height */
  }
  .control-button:hover, .select-all-button:hover {
    background-color: var(--primary-color);
    color: var(--text-primary-color);
  }
  .control-button ha-icon, .select-all-button ha-icon {
    margin-right: 3px; /* Further reduced margin */
    margin-bottom: 0px;
    --mdc-icon-size: 14px; /* Even smaller icons */
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .section-title {
    padding: 6px var(--card-padding);
    font-size: var(--section-title-font-size);
    font-weight: 500;
    color: var(--primary-text-color);
    display: flex;
    align-items: center;
  }
  .entities-container {
    padding: 0 var(--card-padding) var(--card-padding);
    display: flex;
    flex-direction: column;
    gap: 8px;
    justify-content: flex-start;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-thumb-color) transparent;
    width: calc(100% - (var(--card-padding) * 2));
    box-sizing: border-box;
    min-width: 100%;
  }
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
    padding: 8px 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    height: auto;
    min-height: var(--entity-height);
    width: 100%;
    box-sizing: border-box;
    flex-grow: 1;
    flex-shrink: 0;
    min-width: 100%;
    max-width: 100%;
    margin-bottom: 2px;
    border: 1px solid var(--divider-color, #e0e0e0); /* Light grey border for unselected */
  }
  .entity-item:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }
  .entity-item.on {
    border: 2px solid var(--entity-selected-border-color, var(--primary-color)); /* Highlight border when selected */
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  }
  .entity-left {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 3;
    min-width: 0;
    margin-top: -1px;
    margin-bottom: -1px;
  }
  .entity-name {
    font-weight: bold;
    font-size: 0.95em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    flex: 1;
    margin-right: 16px;
  }
  .entity-state {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 45px; /* Reduced from 65px to allow another 20px more for entity name */
    max-width: 45px; /* Reduced from 65px to allow another 20px more for entity name */
    white-space: nowrap;
    flex: 0 0 auto;
    font-size: 0.95em;
  }
  .power-value {
    font-weight: 500;
  }
  .empty-message {
    padding: var(--card-padding);
    text-align: center;
    color: var(--secondary-text-color);
  }
  .section-separator {
    height: 1px;
    background-color: var(--divider-color, #e0e0e0);
    margin: 12px var(--card-padding) 8px;
    opacity: 0.6;
  }
  
  /* Loading and error states */
  .loading-container {
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: var(--loading-height, 300px);
    border-radius: 8px;
    animation: fadeIn 0.3s ease-in-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }
  
  .loading-container .loading-text {
    margin-top: 16px;
    color: var(--secondary-text-color);
    animation: pulse 1.5s infinite;
  }
  
  .error-container {
    border: 1px dashed var(--error-color, red);
    border-radius: 8px;
    padding: 16px;
    margin: 8px 16px;
    transition: all 0.3s ease;
  }
  
  .error-container:hover {
    background-color: rgba(var(--error-color-rgb, 244, 67, 54), 0.05);
  }
  
  .error-container ul {
    margin-top: 8px;
    margin-bottom: 4px;
  }
  .chart-container {
    transition: opacity 0.3s ease-in-out;
  }
  
  /* Ensure apexcharts-card has no borders */
  .power-chart-container, .energy-chart-container {
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;
    overflow: visible !important;
  }
  
  apexcharts-card {
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;
    --apex-card-padding: 0px;
    --apex-card-margin: 0px;
    --ha-card-border-radius: 0px;
    --ha-card-box-shadow: none;
    --apex-card-background: transparent;
  }

  /* Target the shadow DOM elements inside apexcharts-card */
  ::part(ha-card) {
    border: none !important;
    box-shadow: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }
`;

export const editorStyles = `
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