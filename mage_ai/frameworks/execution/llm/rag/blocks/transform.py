from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.enums import GroupUUID

CLEANING = BlockExecutionFramework(
    uuid=GroupUUID.CLEANING,
    type=BlockType.GROUP,
    upstream_blocks=[],
    downstream_blocks=[GroupUUID.ENRICH],
)
ENRICH = BlockExecutionFramework(
    uuid=GroupUUID.ENRICH,
    type=BlockType.GROUP,
    upstream_blocks=[GroupUUID.CLEANING],
    downstream_blocks=[GroupUUID.CHUNKING],
)
CHUNKING = BlockExecutionFramework(
    uuid=GroupUUID.CHUNKING,
    type=BlockType.GROUP,
    upstream_blocks=[GroupUUID.ENRICH],
    downstream_blocks=[GroupUUID.TOKENIZATION],
)
TOKENIZATION = BlockExecutionFramework(
    uuid=GroupUUID.TOKENIZATION,
    type=BlockType.GROUP,
    upstream_blocks=[GroupUUID.CHUNKING],
    downstream_blocks=[GroupUUID.EMBED],
)
EMBED = BlockExecutionFramework(
    uuid=GroupUUID.EMBED,
    type=BlockType.GROUP,
    upstream_blocks=[GroupUUID.TOKENIZATION],
    downstream_blocks=[],
)
