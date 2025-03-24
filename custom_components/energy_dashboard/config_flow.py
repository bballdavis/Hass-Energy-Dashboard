from homeassistant import config_entries
from homeassistant.core import callback
from . import DOMAIN

class EnergyDashboardConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        if user_input is not None:
            # Create the entry without requiring additional input
            return self.async_create_entry(title="Energy Dashboard", data={})

        # Show a simple form to allow the user to confirm installation
        return self.async_show_form(step_id="user")

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return EnergyDashboardOptionsFlow(config_entry)

class EnergyDashboardOptionsFlow(config_entries.OptionsFlow):
    def __init__(self, config_entry):
        self.config_entry = config_entry

    async def async_step_init(self, user_input=None):
        if user_input is not None:
            # Save options if provided
            return self.async_create_entry(title="", data=user_input)

        # Show options form
        return self.async_show_form(step_id="init")
