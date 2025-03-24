# Hass Energy Dashboard
Use this custom dashboard to split out power (W) and energy (Wh) entities and visualize them via apexcharts-card.

## Usage
This dashboard automatically discovers all sensor entities with W or Wh units. Simply add:
```
- type: custom:hass-energy-dashboard
```
to your dashboard configuration. No manual entity configuration is required.

3. Save the configuration and reload/edit the dashboard to see your new energy overview section.
