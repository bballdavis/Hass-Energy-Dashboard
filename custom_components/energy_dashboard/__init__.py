from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

DOMAIN = "energy_dashboard"

async def async_setup(hass: HomeAssistant, config: dict):
    # ...existing code...
    return True

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry):
    # ...existing code...
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry):
    # ...existing code...
    return True
