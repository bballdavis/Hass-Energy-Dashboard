# Energy Dashboard Cards

A custom Home Assistant solution that includes two cards:
1. **Entity Card**: Displays and manages power and energy entities
2. **Chart Card**: Visualizes selected entities in interactive charts

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
2. Search for "Energy Dashboard Cards" in HACS and install it
3. After installation, BOTH cards will be available in your Lovelace editor

### Manual Installation
1. Download these three files from the release:
   - `energy-dashboard-cards.js` (main entry point)
   - `energy-dashboard-entity-card.js`
   - `energy-dashboard-chart-card.js`
2. Upload them to your Home Assistant `/config/www/` directory
3. Add the reference in your Lovelace resources:
```yaml
resources:
  - url: /local/energy-dashboard-cards.js
    type: module
```

### Troubleshooting
If you're only seeing one card type in Lovelace, try these steps:
1. Clear your browser cache
2. Reload Home Assistant (Settings → System → Server Controls → Restart)
3. Check that all 3 JavaScript files are in the same directory
4. Verify that the main `energy-dashboard-cards.js` file imports both cards

## Troubleshooting Loading Issues 

If one or both cards aren't showing up in the card picker, try this approach:

### Add Each Card Individually to Resources

1. Go to **Configuration** → **Dashboards** → **Resources**
2. Click **Add Resource** and add these entries one by one:

```yaml
# First resource - Entity Card
url: /local/energy-dashboard-entity-card.js
type: module

# Second resource - Chart Card
url: /local/energy-dashboard-chart-card.js
type: module
```

3. Restart your browser and Home Assistant

### Check the Console for Errors

If you're still having issues, check the browser console (F12) for errors related to the cards.

For Chart Card: Make sure you have ApexCharts Card installed and that the chart card can find it.

## Detailed Troubleshooting

If you're experiencing issues with the cards not showing up or loading properly:

### Check Browser Console for Errors
1. Open your Home Assistant dashboard
2. Open browser developer tools (F12 or Ctrl+Shift+I)
3. Go to the Console tab
4. Look for any errors related to the Energy Dashboard cards

### Verify Files in Home Assistant
1. Go to the File Editor in Home Assistant
2. Navigate to your `/config/www/` directory (or wherever you placed the files)
3. Confirm that all three files are present:
   - `energy-dashboard-cards.js` (main loader)
   - `energy-dashboard-entity-card.js` 
   - `energy-dashboard-chart-card.js`

### Verify Resource Configuration
1. Go to Configuration → Dashboards → Resources
2. Ensure you have an entry pointing to `/local/energy-dashboard-cards.js` with type `module`
3. Try adding each card file separately as a resource:
   ```yaml
   - url: /local/energy-dashboard-cards.js
     type: module
   - url: /local/energy-dashboard-entity-card.js
     type: module
   - url: /local/energy-dashboard-chart-card.js
     type: module
   ```

### Check ApexCharts Card Installation
1. Make sure you have installed ApexCharts Card from HACS
2. Verify it appears in your HACS → Frontend → Installed list
3. The chart card requires this dependency to work

### Clear Cache and Restart
1. Clear your browser cache completely
2. Restart Home Assistant (Settings → System → Server Controls → Restart)
3. Refresh your browser with a hard reload (Ctrl+Shift+R or Cmd+Shift+R)

If issues persist, please open a GitHub issue with:
- Screenshots of any error messages
- Your browser console log
- Home Assistant version
- Browser type and version

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
