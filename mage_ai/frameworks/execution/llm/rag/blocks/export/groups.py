from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.block.models import Configuration, Metadata
from mage_ai.frameworks.execution.models.enums import GroupUUID

KNOWLEDGE_GRAPH = BlockExecutionFramework(
    uuid=GroupUUID.KNOWLEDGE_GRAPH,
    type=BlockType.GROUP,
    upstream_blocks=[],
    downstream_blocks=[],
)
VECTOR_DATABASE = BlockExecutionFramework(
    uuid=GroupUUID.VECTOR_DATABASE,
    type=BlockType.GROUP,
    configuration=Configuration.load(Metadata.load(required=True)),
    upstream_blocks=[],
    downstream_blocks=[],
)
