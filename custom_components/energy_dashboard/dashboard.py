from homeassistant.helpers import entity_registry

async def generate_dashboard(hass):
    er = entity_registry.async_get(hass)
    entities = er.entities.values()

    power_entities = [e.entity_id for e in entities if e.unit_of_measurement == "W"]
    energy_entities = [e.entity_id for e in entities if e.unit_of_measurement == "Wh"]

    dashboard_config = {
        "views": [
            {
                "title": "Energy Dashboard",
                "cards": [
                    {
                        "type": "entities",
                        "title": "Power Entities",
                        "entities": power_entities
                    },
                    {
                        "type": "entities",
                        "title": "Energy Entities",
                        "entities": energy_entities
                    },
                    {
                        "type": "custom:apexcharts-card",
                        "title": "Energy Chart",
                        "series": [{"entity": e} for e in power_entities + energy_entities]
                    }
                ]
            }
        ]
    }

    return dashboard_config
