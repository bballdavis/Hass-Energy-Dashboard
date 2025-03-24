from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

DOMAIN = "energy_dashboard"

from .dashboard import generate_dashboard

async def async_setup(hass: HomeAssistant, config: dict):
    # Allow the integration to be discovered via the UI without requiring configuration.yaml
    hass.data.setdefault(DOMAIN, {})
    return True

async def create_energy_dashboard_if_missing(hass: HomeAssistant):
    if not hass.services.has_service("lovelace", "set_config"):
        # Optionally log a warning or just return
        return
    dashboard_config = await generate_dashboard(hass)
    # Example logic to see if a "Energy Dashboard" exists
    # ...your logic to find existing dashboard...
    # If missing, create it
    await hass.services.async_call(
        "lovelace",
        "set_config",
        {
            "url_path": "energy_dashboard",
            "title": "Energy Dashboard",
            "icon": "mdi:flash",
            "mode": "storage",
            "config": dashboard_config
        },
        blocking=True,
    )

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry):
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = entry.data
    await create_energy_dashboard_if_missing(hass)
    # Setup dashboard generation or other logic here
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry):
    hass.data[DOMAIN].pop(entry.entry_id, None)
    try:
        await hass.services.async_call(
            "lovelace",
            "delete",
            {"url_path": "energy_dashboard"},
            blocking=True
        )
    except:
        pass
    return True
