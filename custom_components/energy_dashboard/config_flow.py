from homeassistant import config_entries
from homeassistant.core import callback

class EnergyDashboardConfigFlow(config_entries.ConfigFlow, domain="energy_dashboard"):
    """Handle a config flow for the Energy Dashboard integration."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        if user_input is not None:
            return self.async_create_entry(title="Energy Dashboard", data={})

        return self.async_show_form(step_id="user")

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Return the options flow."""
        return EnergyDashboardOptionsFlow(config_entry)


class EnergyDashboardOptionsFlow(config_entries.OptionsFlow):
    """Handle options for the Energy Dashboard integration."""

    def __init__(self, config_entry):
        self.config_entry = config_entry

    async def async_step_init(self, user_input=None):
        """Manage the options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        return self.async_show_form(step_id="init", data_schema=None)
