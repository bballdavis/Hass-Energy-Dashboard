import os
import json
from homeassistant.helpers.entity_registry import async_get

async def async_setup(hass, config):
    async def get_sensors(service_call):
        """Fetch all power and energy sensors based on unit of measurement."""
        entity_registry = async_get(hass)
        sensors = [
            entity.entity_id for entity in entity_registry.entities.values()
            if entity.domain == "sensor" and (
                hass.states.get(entity.entity_id).attributes.get("unit_of_measurement") in ["W", "Wh"]
            )
        ]
        hass.states.async_set("sensor.energy_dashboard_sensors", sensors)

    async def update_chart(service_call):
        """Update the chart configuration based on selected sensors."""
        selected_sensors = service_call.data.get("selected_sensors", [])
        chart_config = [
            {
                "entity": sensor,
                "name": hass.states.get(sensor).attributes.get("friendly_name", sensor),
                "type": "line",
            }
            for sensor in selected_sensors
        ]
        hass.states.async_set("sensor.energy_dashboard_chart_config", chart_config)

    async def create_dashboard():
        """Create the Energy Dashboard in the Home Assistant UI."""
        dashboards_path = hass.config.path(".storage/lovelace_dashboards")
        dashboard_file_path = hass.config.path("dashboards/energy_dashboard/dashboard.yaml")

        # Ensure the dashboards directory exists
        os.makedirs(os.path.dirname(dashboard_file_path), exist_ok=True)

        # Write the dashboard YAML file
        dashboard_yaml = {
            "title": "Energy Dashboard",
            "views": [
                {
                    "title": "Energy Overview",
                    "path": "energy_overview",
                    "cards": [
                        {
                            "type": "custom:apexcharts-card",
                            "title": "Power Consumption",
                            "series": "{{ states('sensor.energy_dashboard_chart_config') | fromjson }}",
                            "graph_span": "24h",
                            "update_interval": 60,
                            "header": {
                                "show": True,
                                "title": "Power Consumption Over Time",
                            },
                        },
                        {
                            "type": "custom:sensor-list",
                            "title": "Power and Energy Sensors",
                            "entities": "{{ states('sensor.energy_dashboard_sensors') | fromjson }}",
                        },
                        {
                            "type": "custom:timeframe-control",
                            "title": "Select Timeframe",
                            "options": [
                                {"label": "Last Hour", "value": "1h"},
                                {"label": "Last 24 Hours", "value": "24h"},
                                {"label": "Last Week", "value": "7d"},
                                {"label": "Last Month", "value": "30d"},
                            ],
                        },
                    ],
                }
            ],
        }

        with open(dashboard_file_path, "w") as dashboard_file:
            json.dump(dashboard_yaml, dashboard_file)

        # Register the dashboard in Home Assistant
        dashboards_config = {
            "url_path": "energy_dashboard",
            "mode": "yaml",
            "filename": dashboard_file_path,
            "title": "Energy Dashboard",
            "icon": "mdi:chart-line",
            "show_in_sidebar": True,
            "require_admin": False,
        }

        dashboards_registry_path = os.path.join(dashboards_path, "dashboards")
        os.makedirs(dashboards_registry_path, exist_ok=True)

        with open(os.path.join(dashboards_registry_path, "energy_dashboard.json"), "w") as dashboards_registry_file:
            json.dump(dashboards_config, dashboards_registry_file)

        # Notify Home Assistant to reload dashboards
        hass.bus.async_fire("lovelace_updated")

    # Ensure the `get_sensors` service is called during setup to populate the sensor list
    hass.services.async_register("energy_dashboard", "get_sensors", get_sensors)
    hass.services.async_register("energy_dashboard", "update_chart", update_chart)
    hass.async_create_task(get_sensors(None))  # Populate sensors on startup

    # Call the create_dashboard function during setup
    hass.async_create_task(create_dashboard())

    return True