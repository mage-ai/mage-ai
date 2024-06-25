import os

from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.block.models import Configuration, Metadata
from mage_ai.frameworks.execution.models.enums import GroupUUID

templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')

CLEANING = BlockExecutionFramework.load(
    uuid=GroupUUID.CLEANING,
    description=(
        'The process of removing noise, inconsistencies, '
        'and irrelevant information from the loaded data.'
    ),
    type=BlockType.GROUP,
    templates_dir=templates_dir,
    upstream_blocks=[],
    downstream_blocks=[GroupUUID.ENRICH],
)
ENRICH = BlockExecutionFramework.load(
    uuid=GroupUUID.ENRICH,
    description=(
        'The process of adding additional context or metadata '
        'to the cleaned data to enhance its value '
        'for retrieval.'
    ),
    type=BlockType.GROUP,
    templates_dir=templates_dir,
    upstream_blocks=[GroupUUID.CLEANING],
    downstream_blocks=[GroupUUID.CHUNKING],
)
CHUNKING = BlockExecutionFramework.load(
    uuid=GroupUUID.CHUNKING,
    description=(
        'The process of breaking down large pieces of '
        'text into smaller, manageable chunks for more '
        'efficient processing and retrieval.'
    ),
    type=BlockType.GROUP,
    templates_dir=templates_dir,
    configuration=Configuration.load(Metadata.load(required=True)),
    upstream_blocks=[GroupUUID.ENRICH],
    downstream_blocks=[GroupUUID.TOKENIZATION],
)
TOKENIZATION = BlockExecutionFramework.load(
    uuid=GroupUUID.TOKENIZATION,
    description=(
        'The process of breaking down text into individual '
        'tokens (words or subwords) for further '
        'processing and analysis.'
    ),
    type=BlockType.GROUP,
    templates_dir=templates_dir,
    configuration=Configuration.load(Metadata.load(required=True)),
    upstream_blocks=[GroupUUID.CHUNKING],
    downstream_blocks=[GroupUUID.EMBED],
)
EMBED = BlockExecutionFramework.load(
    uuid=GroupUUID.EMBED,
    description=(
        'The process of converting tokenized text into numerical '
        'vector representations that capture '
        'semantic meaning.'
    ),
    type=BlockType.GROUP,
    templates_dir=templates_dir,
    configuration=Configuration.load(Metadata.load(required=True)),
    upstream_blocks=[GroupUUID.TOKENIZATION],
    downstream_blocks=[],
)
