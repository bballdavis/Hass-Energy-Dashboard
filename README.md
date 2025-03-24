# Power Entities Card

A custom Home Assistant card that displays all entities with power measurements (W).

## Features

- Automatically finds all entities with power unit of measurement (W)
- Modern UI with rounded corners and visual feedback
- Click on entities to toggle their state
- Responsive design that works on both mobile and desktop

## Installation

### HACS Installation
1. Add this repository to HACS as a custom repository:
   - URL: `https://github.com/yourusername/hass-energy-dashboard`
   - Category: `Lovelace`
2. Search for "Power Entities Card" in HACS and install it
3. Add the card to your dashboard

### Manual Installation
1. Download the `power-entities-card.js` file from the latest release
2. Upload it to your Home Assistant instance using the file editor
3. Add the reference to the card in your Lovelace resources:
```yaml
resources:
  - url: /local/power-entities-card.js
    type: module
```

## Usage

Add the card to your dashboard with the following configuration:

```yaml
type: custom:power-entities-card
title: Power Devices
```

## Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| title | string | 'Power Entities' | Card title |
| show_header | boolean | true | Show card header |
| show_state | boolean | true | Show entity state |
| show_toggle | boolean | true | Allow toggling entities |

## Support

If you find this card helpful and would like to support its development:
- Consider starring the repository on GitHub
- Report any issues or feature requests through GitHub issues
