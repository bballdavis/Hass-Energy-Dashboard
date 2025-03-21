# Hass Energy Dashboard

## Overview
The Hass Energy Dashboard is a custom Home Assistant integration designed to provide a comprehensive view of energy consumption and production data. It utilizes the Savant Energy integration to display power sensors and offers a user-friendly interface for monitoring energy metrics.

## Features
- **ApexCharts Integration**: Visualize power sensor data using the apexcharts-card for dynamic and interactive charts.
- **Toggleable Sensor List**: Easily manage which power and energy sensors are displayed on the dashboard.
- **Timeframe Control**: Select different timeframes for data visualization, allowing for flexible analysis of energy usage.

## Installation
1. **Clone the Repository**: 
   ```
   git clone https://github.com/yourusername/hass-energy-dashboard.git
   ```
2. **Copy to Home Assistant**: 
   Place the `hass-energy-dashboard` folder in your Home Assistant `custom_components` directory.

3. **Install HACS**: 
   If you haven't already, install HACS (Home Assistant Community Store) to manage custom integrations.

4. **Add to Configuration**: 
   Add the following to your `configuration.yaml`:
   ```yaml
   energy_dashboard:
   ```

5. **Restart Home Assistant**: 
   Restart your Home Assistant instance to load the new integration.

## Usage
- Navigate to the Energy Dashboard in your Home Assistant interface.
- Use the timeframe control at the top to select the desired data range.
- Toggle the sensors you wish to display on the apexcharts card using the sensor list.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.