from mage_ai.data_preparation.models.block.dynamic.shared import is_dynamic_block_child
from mage_ai.data_preparation.models.block.settings.dynamic.constants import ModeType
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
    downstream_blocks = []
    upstream_blocks = []

    @property
    def is_dynamic_parent(self) -> bool:
        return self.__dynamic_configuration().parent is not None

    @property
    def is_dynamic_child(self) -> bool:
        return is_dynamic_block_child(self, include_reduce_output=True)

    @property
    def should_reduce_output(self) -> bool:
        return self.__dynamic_configuration().reduce_output is not None

    @property
    def stream_mode_enabled(self) -> bool:
        modes = self.__dynamic_configuration().modes
        return modes is not None and ModeType.STREAM in modes

    def should_reduce_output_from_upstream_block(self, block) -> bool:
        reduce_output_upstream = self.__dynamic_configuration().reduce_output_upstream or []
        return reduce_output_upstream is not None and block.uuid in reduce_output_upstream

    def should_reduce_output_for_downstream_block(self, block) -> bool:
        reduce_output = self.__dynamic_configuration().reduce_output

        if reduce_output is True:
            return True

        if isinstance(reduce_output, list):
            return block.uuid in reduce_output

        return False

    def should_dynamically_generate_block(self, block) -> bool:
        parent = self.__dynamic_configuration().parent

        if parent is True:
            return True

        if isinstance(parent, list):
            return block.uuid in parent

        return False

    def __dynamic_configuration(self) -> DynamicConfiguration:
        if self.configuration:
            config = self.configuration.get('dynamic', {})
            if config and isinstance(config, dict):
                return DynamicConfiguration.load(**config)
            elif isinstance(config, DynamicConfiguration):
                return config
        return DynamicConfiguration()
