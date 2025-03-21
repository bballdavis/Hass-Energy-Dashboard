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
        resources_path = hass.config.path(".storage/lovelace_resources")

        # Ensure directories exist
        os.makedirs(dashboards_path, exist_ok=True)

        # Register the dashboard
        dashboard_config = {
            "title": "Energy Dashboard",
            "mode": "yaml",
            "filename": "dashboards/energy_dashboard/dashboard.yaml",
            "icon": "mdi:chart-line",
            "show_in_sidebar": True,
            "require_admin": False,
        }

        dashboards_file = os.path.join(dashboards_path, "energy_dashboard")
        with open(dashboards_file, "w") as file:
            json.dump(dashboard_config, file)

        # Register resources for custom cards
        resources = [
            {
                "url": "/local/community/apexcharts-card/apexcharts-card.js",
                "type": "module",
            },
            {
                "url": "/local/community/sensor-list/sensor-list.js",
                "type": "module",
            },
        ]

        with open(resources_path, "w") as file:
            json.dump(resources, file)

        # Notify Home Assistant to reload dashboards
        hass.bus.async_fire("lovelace_updated")

    # Call the create_dashboard function during setup
    hass.async_create_task(create_dashboard())

    hass.services.async_register("energy_dashboard", "get_sensors", get_sensors)
    hass.services.async_register("energy_dashboard", "update_chart", update_chart)
    return True