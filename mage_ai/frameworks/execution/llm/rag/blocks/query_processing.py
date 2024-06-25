from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.enums import GroupUUID

INTENT_DETECTION = BlockExecutionFramework(
    uuid=GroupUUID.INTENT_DETECTION,
    type=BlockType.GROUP,
    upstream_blocks=[],
    downstream_blocks=[GroupUUID.QUERY_DECOMPOSITION],
)
QUERY_DECOMPOSITION = BlockExecutionFramework(
    uuid=GroupUUID.QUERY_DECOMPOSITION,
    type=BlockType.GROUP,
    upstream_blocks=[GroupUUID.INTENT_DETECTION],
    downstream_blocks=[GroupUUID.QUERY_AUGMENTATION],
)
QUERY_AUGMENTATION = BlockExecutionFramework(
    uuid=GroupUUID.QUERY_AUGMENTATION,
    type=BlockType.GROUP,
    upstream_blocks=[GroupUUID.QUERY_DECOMPOSITION],
    downstream_blocks=[],
)
