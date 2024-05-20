from typing import Optional

from mage_ai.data_preparation.models.block.settings.variables.models import (
    VariableConfiguration,
)


class VariablesMixin:
    configuration = dict(variables=None)

    def variables_configuration(self) -> Optional[VariableConfiguration]:
        if self.configuration:
            configs = self.configuration.get('variables', {})
            if configs and isinstance(configs, dict):
                return VariableConfiguration.load(**configs)
            elif isinstance(configs, VariableConfiguration):
                return configs
