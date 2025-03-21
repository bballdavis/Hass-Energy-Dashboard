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

    hass.services.async_register("energy_dashboard", "get_sensors", get_sensors)
    hass.services.async_register("energy_dashboard", "update_chart", update_chart)
    return True