from typing import Optional

from mage_ai.data_preparation.models.block.settings.variables.models import (
    InputType,
    VariableConfiguration,
)


class VariablesMixin:
    configuration = dict(variables=None)

    @property
    def variables_configuration(self) -> Optional[VariableConfiguration]:
        if self.configuration:
            configs = self.configuration.get('variables', {})
            if configs and isinstance(configs, dict):
                return VariableConfiguration.load(**configs)
            elif isinstance(configs, VariableConfiguration):
                return configs

    def input_types(self, block_uuid: str) -> InputType:
        return (
            (self.variables_configuration or VariableConfiguration())
            .upstream_settings(block_uuid)
            .input_type
        ) or InputType.DEFAULT
