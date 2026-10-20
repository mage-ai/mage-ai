import os

from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.block.models import Configuration, Metadata
from mage_ai.frameworks.execution.models.enums import GroupUUID

templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')

INGEST = BlockExecutionFramework.load(
    uuid=GroupUUID.INGEST,
    description=('The process of importing raw data from various sources into the RAG system.'),
    type=BlockType.GROUP,
    templates_dir=templates_dir,
    configuration=Configuration.load(Metadata.load(required=True)),
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
    templates_dir=templates_dir,
    upstream_blocks=[GroupUUID.INGEST],
    downstream_blocks=[],
)
