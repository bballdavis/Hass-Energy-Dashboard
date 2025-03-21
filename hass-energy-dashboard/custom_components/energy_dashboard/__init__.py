from homeassistant.helpers.entity_registry import async_get
from homeassistant.components.lovelace.dashboard import async_create_dashboard

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
        dashboard_config = {
            "title": "Energy Dashboard",
            "views": [
                {
                    "title": "Energy Overview",
                    "path": "energy_overview",
                    "cards": [
                        {
                            "type": "custom:apexcharts-card",
                            "title": "Power Consumption",
                            "series": "{{ states('sensor.energy_dashboard_chart_config') }}",
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
                            "entities": "{{ states('sensor.energy_dashboard_sensors') }}",
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
        await async_create_dashboard(hass, "energy_dashboard", dashboard_config)

    # Call the create_dashboard function during setup
    hass.async_create_task(create_dashboard())

    hass.services.async_register("energy_dashboard", "get_sensors", get_sensors)
    hass.services.async_register("energy_dashboard", "update_chart", update_chart)
    return True