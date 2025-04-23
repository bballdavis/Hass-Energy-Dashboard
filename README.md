# Energy Dashboard

A collection of custom Home Assistant cards for energy monitoring and visualization built with vanilla JavaScript web components (no external UI libraries required).

## Cards Included

### Energy Dashboard Entity Card
A lightweight card that displays power (W/kW) and energy (Wh/kWh) measurement entities in your Home Assistant dashboard.

#### Features

- Automatically finds all entities with power unit of measurement (W/kW)
- Shows energy measurement entities (Wh/kWh)
- Modern UI with rounded corners and visual feedback
- Click on entities to toggle their visibility in the dashboard
- Control buttons for quick selection management (Reset, Clear, Select All)
- Scrollable interface that shows entities based on configurable height
- Responsive design that works on both mobile and desktop
- Visual editor support for easy configuration
- Selections persist between page loads using localStorage
- Easily add to dashboards using the built-in card picker
- Built with vanilla Web Components (no external UI library dependencies)

## Installation

### HACS Installation
1. Add this repository to HACS as a custom repository:
   - URL: `https://github.com/bballdavis/Hass-Energy-Dashboard`
   - Category: `Lovelace`
2. Search for "Energy Dashboard" in HACS and install it
3. Add the card to your dashboard either manually or through the card picker UI:
   - Click "Edit Dashboard"
   - Click the "+" button to add a card
   - Find "Energy Dashboard Entity Card" in the list
   - Configure as desired

### Manual Installation
1. Download the `energy-dashboard.js` file from the latest release
2. Upload it to your Home Assistant instance using the file editor
3. Add the reference to the package in your Lovelace resources:
```yaml
resources:
  - url: /local/energy-dashboard.js
    type: module
```

## Usage

### Energy Dashboard Entity Card

#### Adding to Dashboard
You can add the card in two ways:

1. **Using the Card Picker**:
   - Edit your dashboard
   - Click the "+" button to add a new card
   - Search for "Energy Dashboard Entity Card"
   - Configure the settings as desired

2. **Manual YAML Configuration**:
```yaml
type: custom:energy-dashboard-entity-card
title: Energy Dashboard
show_header: true
show_state: true
auto_select_count: 6
max_height: 400
```

#### How It Works

The card automatically finds:
- **Power Entities**: Any entities with units of W or kW
- **Energy Entities**: Any entities with units of Wh or kWh

When first loaded, the card will automatically select the top entities (based on power/energy values) according to your `auto_select_count` and `energy_auto_select_count` settings. Your selections are stored in the browser's localStorage, so they persist between page reloads.

#### Interactive Features

- Click on any entity to toggle its selection state
- Selected entities are highlighted with your theme's primary color
- Use the control buttons to manage your selections:
  - **Reset**: Returns to the default selection of top N entities
  - **Clear**: Deselects all entities
  - **Select All**: Selects all available entities

#### Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| title | string | 'Energy Dashboard' | Card title |
| show_header | boolean | true | Show card header |
| show_state | boolean | true | Show entity state values |
| show_toggle | boolean | true | Allow toggling entities |
| auto_select_count | number | 6 | Number of power entities to auto-select by default |
| energy_auto_select_count | number | 6 | Number of energy entities to auto-select by default |
| max_height | number | 400 | Maximum height in pixels (0 = no limit) |
| show_energy_section | boolean | true | Show energy section with energy entities (Wh/kWh) |

## Technical Details

### Architecture

The Energy Dashboard is built using vanilla JavaScript and Web Components, with no external UI library dependencies. This ensures:

- **Lightweight**: Minimized bundle size for faster loading
- **Future-proof**: Uses standard web APIs, not dependent on specific UI frameworks
- **Performance**: Native browser rendering without the overhead of UI libraries

### Storage

The card uses the browser's localStorage to persist your entity selections between sessions:
- Power entity selections: Stored under `energy-dashboard-power-toggle-states`
- Energy entity selections: Stored under `energy-dashboard-energy-toggle-states`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Make your changes
4. Build the project: `npm run build`
5. Test in Home Assistant

## Support

If you find these cards helpful and would like to support their development:
- Consider starring the repository on GitHub
- Report any issues or feature requests through GitHub issues
- Share your experiences or feature ideas in the discussions
