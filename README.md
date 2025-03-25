# Energy Dashboard Entity Card

A custom Home Assistant card that displays all entities with power measurements (W).

## Features

- Automatically finds all entities with power unit of measurement (W)
- Modern UI with rounded corners and visual feedback
- Click on entities to toggle their state
- Control buttons for quick selection management (Reset, Clear, Select All)
- Scrollable interface that shows approximately 15 entities before scrolling
- Responsive design that works on both mobile and desktop
- Visual editor support for easy configuration
- Energy section for kWh/Wh entities
- Companion chart card to visualize selected entities

## Installation

### HACS Installation
1. Add this repository to HACS as a custom repository:
   - URL: `https://github.com/yourusername/hass-energy-dashboard`
   - Category: `Lovelace`
2. Search for "Energy Dashboard Entity Card" in HACS and install it
3. Add the card to your dashboard

### Manual Installation
1. Download the `energy-dashboard-entity-card.js` and `energy-dashboard-chart-card.js` files from the latest release
2. Upload them to your Home Assistant instance using the file editor
3. Add the references to the cards in your Lovelace resources:
```yaml
resources:
  - url: /local/energy-dashboard-entity-card.js
    type: module
  - url: /local/energy-dashboard-chart-card.js
    type: module
```

## Usage

### Entity Card

Add the entity card to your dashboard with the following configuration:

```yaml
type: custom:energy-dashboard-entity-card
title: Energy Dashboard
```

#### Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| title | string | 'Energy Dashboard' | Card title |
| show_header | boolean | true | Show card header |
| show_state | boolean | true | Show entity state |
| show_toggle | boolean | true | Allow toggling entities |
| auto_select_count | number | 6 | Number of power entities to auto-select by default |
| energy_auto_select_count | number | 6 | Number of energy entities to auto-select by default |
| show_energy_section | boolean | true | Show energy entities section |
| max_height | number | 400 | Maximum height in pixels (0 = no limit) |

### Chart Card

Add the chart card to your dashboard to automatically visualize the entities selected in the entity card:

```yaml
type: custom:energy-dashboard-chart-card
title: Energy Dashboard Charts
```

#### Chart Card Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| title | string | 'Energy Dashboard Charts' | Card title |
| show_header | boolean | true | Show card header |
| show_power_chart | boolean | true | Show power entities chart |
| show_energy_chart | boolean | true | Show energy entities chart |
| power_chart_type | string | 'line' | Chart type for power entities (line, area, bar) |
| energy_chart_type | string | 'bar' | Chart type for energy entities (bar, line, area) |
| chart_height | string | '300px' | Height of each chart |
| refresh_interval | number | 30 | Refresh interval in seconds |
| span | object | { start: "hour", offset: -1 } | Time range for charts |

## Required Dependencies

The chart card requires the [ApexCharts Card](https://github.com/RomRider/apexcharts-card) to be installed. You can install it from HACS.

## Control Buttons

The card includes three control buttons for managing entity selections:

- **Reset**: Clears all selections and enables the top N entities (based on auto_select_count)
- **Clear**: Turns off all entity selections
- **Select All**: Turns on all entity selections

## Support

If you find this card helpful and would like to support its development:
- Consider starring the repository on GitHub
- Report any issues or feature requests through GitHub issues
