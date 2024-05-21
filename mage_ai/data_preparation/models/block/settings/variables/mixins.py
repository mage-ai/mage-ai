from typing import Dict, List, Optional

from mage_ai.data.constants import InputDataType
from mage_ai.data.tabular.models import BatchSettings
from mage_ai.data_preparation.models.block.settings.variables.models import (
    VariableConfiguration,
    VariableSettings,
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

    @property
    def variable_settings_upstream(self) -> Optional[Dict[str, VariableSettings]]:
        if self.variables_configuration:
            return self.variables_configuration.upstream

    def batch_settings(self, block_uuid: str) -> BatchSettings:
        return (
            (self.variables_configuration or VariableConfiguration())
            .upstream_settings(block_uuid)
            .batch_settings
        ) or BatchSettings()

    def input_data_types(self, block_uuid: str) -> List[InputDataType]:
        return (
            (self.variables_configuration or VariableConfiguration())
            .upstream_settings(block_uuid)
            .input_data_types
        ) or [InputDataType.DEFAULT]
