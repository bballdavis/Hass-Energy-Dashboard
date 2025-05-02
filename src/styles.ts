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
    --control-spacing: 5px;
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
    gap: var(--control-spacing, 5px); /* Using variable with 5px default */
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
    width: calc(100% - (var(--card-padding) * 2));
    box-sizing: border-box;
    min-width: 100%;
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
  
  .search-container {
    padding: 0 var(--card-padding) 16px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .search-input {
    width: 100%;
    padding: 8px 16px;
    border-radius: 24px;
    border: 1px solid var(--divider-color, #e0e0e0);
    background-color: var(--card-background-color, white);
    color: var(--primary-text-color);
    font-size: 14px;
    box-sizing: border-box;
    transition: all 0.3s ease;
  }
  
  .search-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
  }
  
  .refresh-control-container {
    padding: 0 var(--card-padding) 12px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .refresh-control {
    display: flex;
    background-color: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 16px;
    overflow: hidden;
    height: 26px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  .refresh-option {
    padding: 0 12px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--secondary-text-color);
    position: relative;
    min-width: 32px;
  }
  
  .refresh-option.active {
    background-color: var(--primary-color);
    color: var(--text-primary-color);
  }
  
  .refresh-option:hover:not(.active) {
    background-color: var(--divider-color);
  }
  
  .refresh-option.refresh-button {
    border-left: 1px solid var(--divider-color);
  }
  
  .refresh-option ha-icon {
    --mdc-icon-size: 14px;
  }

  /* Pill controls layout */
  .pill-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0;
    margin-right: 5px; /* Fixed 5px spacing */
    min-width: 0;
    flex: 1 1 auto;
  }
  
  /* No margin on the last pill group */
  .pill-group:last-child {
    margin-right: 0;
  }
  
  .pill-label {
    font-size: 0.75em;
    color: var(--secondary-text-color, #888);
    margin-bottom: 2px;
    margin-top: 0px;
    text-align: center;
    letter-spacing: 0.01em;
    font-weight: 500;
    user-select: none;
    line-height: 1.1;
  }
  
  .pill-row {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    justify-content: flex-start;
    width: 100%;
    gap: 5px; /* Set to exactly 5px */
    margin-bottom: 4px;
    margin-top: 0px;
    min-height: 0;
    padding: 0 var(--card-padding);
    box-sizing: border-box;
  }
  
  .pill-control {
    background-color: var(--card-background-color, white);
    border: 1px solid var(--divider-color, #e0e0e0);
    color: var(--primary-text-color);
    font-size: 0.92em;
    font-weight: 500;
    cursor: pointer;
    padding: 2px 10px;
    min-width: 36px;
    min-height: 24px;
    height: 26px;
    box-sizing: border-box;
    transition: all 0.2s;
    border-radius: 16px;
    margin: 0;
    outline: none;
    border-right: none;
    line-height: 1.2;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .pill-control:last-child {
    border-right: 1px solid var(--divider-color, #e0e0e0);
  }
  
  .pill-control.active {
    background-color: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
    border-color: var(--primary-color, #03a9f4);
    z-index: 1;
  }
  
  .pill-control:not(.active):hover {
    background-color: var(--divider-color, #e0e0e0);
    color: var(--primary-text-color);
  }
  
  .pill-row .pill-control {
    border-radius: 0;
  }
  
  .pill-row .pill-control:first-child {
    border-radius: 16px 0 0 16px;
  }
  
  .pill-row .pill-control:last-child {
    border-radius: 0 16px 16px 0;
    border-right: 1px solid var(--divider-color, #e0e0e0);
  }

  /* Manual refresh button specific styles */
  .refresh-rate-button.manual-refresh {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0; /* Remove padding to rely on flex centering */
    min-width: 36px; /* Keep minimum width */
    width: 36px; /* Fixed width to match other buttons */
    height: 26px; /* Fixed height to match other pills */
    box-sizing: border-box;
    border-radius: 16px 0 0 16px;
    margin-right: -1px; /* For pill group effect */
  }

  .refresh-rate-button.manual-refresh ha-icon {
    /* Set explicit size for the icon */
    --mdc-icon-size: 14px;
    width: 14px;
    height: 14px;
    display: flex; /* Make the icon itself a flex container */
    align-items: center;
    justify-content: center;
    margin: 0;
    line-height: 1;
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