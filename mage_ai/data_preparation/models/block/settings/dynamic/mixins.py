from typing import Optional

from mage_ai.data_preparation.models.block.settings.dynamic.models import (
    DynamicConfiguration,
)


class DynamicMixin:
    """
    How the configuration looks in a pipeline’s metadata.yaml

    - uuid: block_uuid
      configuration:
          dynamic:
              parent: true
    """

    configuration = dict(dynamic=None)

    def dynamic_configuration(self) -> Optional[DynamicConfiguration]:
        if self.configuration:
            configs = self.configuration.get('dynamic', {})
            if configs and isinstance(configs, dict):
                return DynamicConfiguration.load(**configs)
            elif isinstance(configs, DynamicConfiguration):
                return configs
