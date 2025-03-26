# Energy Dashboard Card

A custom Home Assistant solution that includes a single card with two modes:
1. **Entity Mode** – Displays and manages power and energy entities.
2. **Chart Mode** – Visualizes selected entities using interactive charts.

## Features

- Automatically finds all entities with power unit of measurement (W)
- Modern UI with rounded corners and visual feedback
- Click on entities to toggle their state
- Control buttons for quick selection management (Reset, Clear, Select All)
- Scrollable interface that shows approximately 15 entities before scrolling
- Responsive design that works on both mobile and desktop
- Visual editor support for easy configuration
- Energy section for kWh/Wh entities
- Companion chart mode to visualize selected entities

## Installation

### HACS Installation (Recommended)
1. Add this repository to HACS as a custom repository:
   - URL: `https://github.com/yourusername/hass-energy-dashboard`
   - Category: `Lovelace`
2. Search for "Energy Dashboard Card" in HACS and install it.
3. The card will automatically be registered in your Lovelace editor.
   (No manual resource setup is necessary.)

### Manual Installation (Alternative)
If you prefer manual installation:
1. Download the latest release file.
2. Upload the following file to your Home Assistant `/config/www/` directory:
   - `energy-dashboard-card.js`
3. In Home Assistant, go to **Configuration → Dashboards → Resources** and add:
```yaml
- url: /local/energy-dashboard-card.js
  type: module
```
4. Restart Home Assistant.

## Required Dependencies

The chart mode requires the [ApexCharts Card](https://github.com/RomRider/apexcharts-card) to be installed from HACS.

## Troubleshooting

If you encounter issues with the card:

1. Make sure you have **ApexCharts Card** installed from HACS (required for chart mode).
2. Clear your browser cache and reload Home Assistant.
3. Check the browser console (F12) for any error messages.

If issues persist after installing through HACS, try adding the card resource manually:

1. Go to Configuration → Dashboards → Resources.
2. Add this resource:
```yaml
- url: /local/energy-dashboard-card.js
  type: module
```

## Usage

Add the card to your dashboard with the following configuration:

```yaml
type: custom:energy-dashboard-card
card_type: entity
title: Energy Dashboard
```

### Options

#### Common Options

| Name         | Type    | Default             | Description                          |
|--------------|---------|---------------------|--------------------------------------|
| card_type    | string  | 'entity'            | The type of card: 'entity' or 'chart'|
| title        | string  | 'Energy Dashboard'  | Card title                           |
| show_header  | boolean | true                | Show card header                     |

#### Entity Mode Options

| Name                  | Type    | Default | Description                                      |
|-----------------------|---------|---------|--------------------------------------------------|
| show_state            | boolean | true    | Show entity state                               |
| show_toggle           | boolean | true    | Allow toggling entities                        |
| auto_select_count     | number  | 6       | Number of power entities to auto-select         |
| energy_auto_select_count | number | 6     | Number of energy entities to auto-select        |
| show_energy_section   | boolean | true    | Show energy entities section                   |
| max_height            | number  | 400     | Maximum height in pixels (0 = no limit)         |

#### Chart Mode Options

| Name               | Type    | Default   | Description                                      |
|--------------------|---------|-----------|--------------------------------------------------|
| show_power_chart   | boolean | true      | Show power entities chart                       |
| show_energy_chart  | boolean | true      | Show energy entities chart                      |
| power_chart_type   | string  | 'line'    | Chart type for power entities (line, area, bar) |
| energy_chart_type  | string  | 'bar'     | Chart type for energy entities (bar, line, area)|
| chart_height       | string  | '300px'   | Height of each chart                            |
| refresh_interval   | number  | 30        | Refresh interval in seconds                     |
| span               | object  | { start: "hour", offset: -1 } | Time range for charts |

## Control Buttons (Entity Mode)

The card includes three control buttons for managing entity selections:

- **Reset**: Clears all selections and enables the top N entities (based on auto_select_count).
- **Clear**: Turns off all entity selections.
- **Select All**: Turns on all entity selections.

## Support

If you find this card helpful and would like to support its development:
- Consider starring the repository on GitHub.
- Report any issues or feature requests through GitHub issues.
