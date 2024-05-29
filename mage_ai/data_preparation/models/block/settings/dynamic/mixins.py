from typing import Optional

from mage_ai.data_preparation.models.block.settings.dynamic.constants import ModeType
from mage_ai.data_preparation.models.block.settings.dynamic.models import (
    DynamicConfiguration,
    ModeSettings,
)
from mage_ai.shared.array import find


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
    replicated_block = None
    upstream_blocks = []
    uuid = None
    uuid_replicated = None

    def is_original_block(self, block_uuid: str) -> bool:
        return self.uuid == block_uuid or (
            self.replicated_block is not None and self.uuid_replicated == block_uuid
        )

    @property
    def is_dynamic_v2(self) -> bool:
        from mage_ai.settings.server import DYNAMIC_BLOCKS_V2

        return DYNAMIC_BLOCKS_V2

    @property
    def is_dynamic_streaming(self) -> bool:
        return self.is_dynamic_v2 and (
            (self.is_dynamic_parent and self.is_dynamic_stream_mode_enabled)
            or self.is_dynamic_child_streaming
        )

    @property
    def is_dynamic_parent(self) -> bool:
        return self.__dynamic_configuration().parent is not None

    @property
    def is_dynamic_child(self) -> bool:
        return any(
            upstream_block.should_dynamically_generate_block(self)
            or upstream_block.is_dynamic_child
            for upstream_block in self.upstream_blocks
        )

    @property
    def is_dynamic_child_streaming(self) -> bool:
        return self.is_dynamic_v2 and any(
            (
                upstream_block.should_dynamically_generate_block(self)
                and upstream_block.is_dynamic_stream_mode_enabled
            )
            or upstream_block.is_dynamic_child_streaming
            for upstream_block in self.upstream_blocks
        )

    @property
    def should_reduce_output(self) -> bool:
        return self.__dynamic_configuration().reduce_output is not None

    @property
    def is_dynamic_stream_mode_enabled(self) -> bool:
        return self.settings_for_mode(ModeType.STREAM) is not None

    def build_dynamic_uuid(self, index: int) -> str:
        return ':'.join([self.uuid or '__missing_uuid__', str(index)])

    def settings_for_mode(self, mode_type: ModeType) -> Optional[ModeSettings]:
        modes = self.__dynamic_configuration().modes
        if modes is not None:
            return find(lambda ms: ms.type == mode_type, modes)

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
