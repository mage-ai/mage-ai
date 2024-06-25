from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.block.models import Configuration, Metadata
from mage_ai.frameworks.execution.models.enums import GroupUUID

KNOWLEDGE_GRAPH = BlockExecutionFramework.load(
    uuid=GroupUUID.KNOWLEDGE_GRAPH,
    description=(
        'A structured representation of knowledge that captures relationships between '
        'entities and concepts in the data.'
    ),
    type=BlockType.GROUP,
    upstream_blocks=[],
    downstream_blocks=[],
)
VECTOR_DATABASE = BlockExecutionFramework.load(
    uuid=GroupUUID.VECTOR_DATABASE,
    description=(
        'A specialized database for storing and efficiently querying vector representations '
        'of data.'
    ),
    type=BlockType.GROUP,
    configuration=Configuration.load(Metadata.load(required=True)),
    upstream_blocks=[],
    downstream_blocks=[],
)
