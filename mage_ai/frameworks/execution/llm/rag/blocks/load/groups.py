import yaml

from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.llm.rag.blocks.load.templates import ingest
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.block.models import (
    Configuration,
    Metadata,
    Template,
)
from mage_ai.frameworks.execution.models.enums import GroupUUID

INGEST = BlockExecutionFramework.load(
    uuid=GroupUUID.INGEST,
    description=('The process of importing raw data from various sources into the RAG system.'),
    type=BlockType.GROUP,
    configuration=Configuration.load(
        metadata=Metadata.load(required=True),
        templates={
            k: Template(**v) if isinstance(v, dict) else v
            for k, v in yaml.safe_load(ingest.TEMPLATES).items()
        },
    ),
    upstream_blocks=[],
    downstream_blocks=[GroupUUID.MAP],
)

MAP = BlockExecutionFramework.load(
    uuid=GroupUUID.MAP,
    description=(
        'The process of mapping ingested data to a standardized format for further processing '
        'in the RAG pipeline.'
    ),
    type=BlockType.GROUP,
    upstream_blocks=[GroupUUID.INGEST],
    downstream_blocks=[],
)
