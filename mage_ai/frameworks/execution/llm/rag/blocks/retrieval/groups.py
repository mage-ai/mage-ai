from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.enums import GroupUUID

MEMORY = BlockExecutionFramework(
    uuid=GroupUUID.MEMORY,
    type=BlockType.GROUP,
    upstream_blocks=[],
    downstream_blocks=[GroupUUID.ITERATIVE_RETRIEVAL],
)
ITERATIVE_RETRIEVAL = BlockExecutionFramework(
    uuid=GroupUUID.ITERATIVE_RETRIEVAL,
    type=BlockType.GROUP,
    upstream_blocks=[GroupUUID.MEMORY],
    downstream_blocks=[GroupUUID.MULTI_HOP_REASONING],
)
MULTI_HOP_REASONING = BlockExecutionFramework(
    uuid=GroupUUID.MULTI_HOP_REASONING,
    type=BlockType.GROUP,
    upstream_blocks=[GroupUUID.ITERATIVE_RETRIEVAL],
    downstream_blocks=[GroupUUID.RANKING],
)
RANKING = BlockExecutionFramework(
    uuid=GroupUUID.RANKING,
    type=BlockType.GROUP,
    upstream_blocks=[GroupUUID.MULTI_HOP_REASONING],
    downstream_blocks=[],
)
