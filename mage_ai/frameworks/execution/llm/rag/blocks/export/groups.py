import os

from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.block.models import Configuration, Metadata
from mage_ai.frameworks.execution.models.enums import GroupUUID

templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')

KNOWLEDGE_GRAPH = BlockExecutionFramework.load(
    uuid=GroupUUID.KNOWLEDGE_GRAPH,
    description=(
        'A structured representation of knowledge that captures relationships between '
        'entities and concepts in the data.'
    ),
    type=BlockType.GROUP,
    templates_dir=templates_dir,
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
    templates_dir=templates_dir,
    configuration=Configuration.load(Metadata.load(required=True)),
    upstream_blocks=[],
    downstream_blocks=[],
)
