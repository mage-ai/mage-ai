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
        parent = self.__dynamic_configuration().parent
        if isinstance(parent, bool):
            return parent
        elif isinstance(parent, list):
            return len(parent) > 0
        return parent is not None

    @property
    def is_dynamic_child(self) -> bool:
        return any(
            upstream_block.should_dynamically_generate_block(self)
            or upstream_block.is_dynamic_child
            for upstream_block in self.upstream_blocks
        )

    @property
    def is_dynamic_child_streaming(self) -> bool:
        """
        Indicates whether current block is dynamic child with stream mode.

        This property checks if the current block is in dynamic v2 mode (`self.is_dynamic_v2`)
        and whether any of its upstream blocks either:
        - Should dynamically generate the current block and have dynamic stream mode enabled, or
        - recursively check whether upstream block is dynamic child block with stream mode.

        If any of these conditions are met for any upstream block, the current block is dynamic
        child with stream mode.

        Returns:
            bool: `True` if current block is dynamic child with stream mode., `False` otherwise.
        """
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
        reduce_output = self.__dynamic_configuration().reduce_output
        if isinstance(reduce_output, bool):
            return reduce_output
        elif isinstance(reduce_output, list):
            return len(reduce_output) > 0
        return reduce_output is not None

    @property
    def is_dynamic_stream_mode_enabled(self) -> bool:
        """
        Indicates whether dynamic stream mode is enabled.

        This property checks if the setting "type: stream" is in the modes list.
        If the settings are present, dynamic stream mode is considered enabled.

        Returns:
            bool: `True` if dynamic stream mode is enabled, `False` otherwise.
        """
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
        """
        Determines whether a block should be dynamically generated based on the parent
        configuration.

        This method checks the `parent` attribute from the dynamic configuration.
        - If `parent` is `True`, the block should be dynamically generated.
        - If `parent` is a list, the block should be dynamically generated only if its UUID is
            present in the `parent` list.
        - If `parent` is neither `True` nor a list, the block should not be dynamically generated.

        Args:
            block: The block object that contains the `uuid` attribute to be checked.

        Returns:
            bool: `True` if the block should be dynamically generated, `False` otherwise.
        """
        parent = self.__dynamic_configuration().parent

        if parent is True:
            return True

        if isinstance(parent, list):
            return block.uuid in parent

        return False

    def __dynamic_configuration(self) -> DynamicConfiguration:
        if self.configuration:
            config = self.configuration.get('dynamic', {})
            reduce_output = self.configuration.get('reduce_output')
            if config and isinstance(config, dict):
                dynamic_configuration = DynamicConfiguration.load(**config)
            elif isinstance(config, DynamicConfiguration):
                dynamic_configuration = config
            else:
                dynamic_configuration = DynamicConfiguration()

            # For backward compatible with dynamic block v1
            if isinstance(config, bool):
                dynamic_configuration.parent = config
            if isinstance(reduce_output, bool):
                dynamic_configuration.reduce_output = reduce_output
            return dynamic_configuration
        return DynamicConfiguration()
