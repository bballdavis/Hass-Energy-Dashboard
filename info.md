# Power Entities Card

A custom Home Assistant card that displays all entities with power measurements (W).

## Features

- Automatically finds all entities with power unit of measurement (W)
- Modern UI with rounded corners and visual feedback
- Click on entities to toggle their state
- Responsive design that works on both mobile and desktop

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
