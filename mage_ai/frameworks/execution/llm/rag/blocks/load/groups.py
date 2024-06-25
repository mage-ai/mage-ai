from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.block.models import Configuration, Metadata
from mage_ai.frameworks.execution.models.enums import GroupUUID

INGEST = BlockExecutionFramework(
    uuid=GroupUUID.INGEST,
    type=BlockType.GROUP,
    configuration=Configuration.load(Metadata.load(required=True)),
    upstream_blocks=[],
    downstream_blocks=[GroupUUID.MAP],
)
MAP = BlockExecutionFramework(
    uuid=GroupUUID.MAP,
    type=BlockType.GROUP,
    upstream_blocks=[GroupUUID.INGEST],
    downstream_blocks=[],
)
