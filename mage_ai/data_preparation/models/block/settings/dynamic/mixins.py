from typing import Optional

from mage_ai.data_preparation.models.block.settings.dynamic.models import (
    DynamicConfiguration,
)


class DynamicMixin:
    configuration = dict(dynamic=None)

    def dynamic_configuration(self) -> Optional[DynamicConfiguration]:
        if self.configuration:
            configs = self.configuration.get('dynamic', {})
            if configs and isinstance(configs, dict):
                return DynamicConfiguration.load(**configs)
            elif isinstance(configs, DynamicConfiguration):
                return configs
