import yaml

from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.llm.rag.blocks.export.templates import vector_database
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.block.models import (
    Configuration,
    Metadata,
    Template,
)
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
    configuration=Configuration.load(
        metadata=Metadata.load(required=True),
        templates={
            k: Template(**v) if isinstance(v, dict) else v
            for k, v in yaml.safe_load(vector_database.TEMPLATES).items()
        },
    ),
    upstream_blocks=[],
    downstream_blocks=[],
)
