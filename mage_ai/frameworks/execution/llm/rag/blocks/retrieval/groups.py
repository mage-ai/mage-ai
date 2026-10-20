import os

from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.block.models import Configuration, Metadata
from mage_ai.frameworks.execution.models.enums import GroupUUID

templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
MEMORY = BlockExecutionFramework.load(
    uuid=GroupUUID.MEMORY,
    description=(
        'A component that stores and manages information from previous interactions to provide '
        'context for current queries.'
    ),
    type=BlockType.GROUP,
    templates_dir=templates_dir,
    upstream_blocks=[],
    downstream_blocks=[GroupUUID.ITERATIVE_RETRIEVAL],
)
ITERATIVE_RETRIEVAL = BlockExecutionFramework.load(
    uuid=GroupUUID.ITERATIVE_RETRIEVAL,
    description=(
        'A process that performs multiple rounds of retrieval, refining results based on '
        'intermediate findings.'
    ),
    type=BlockType.GROUP,
    templates_dir=templates_dir,
    configuration=Configuration.load(Metadata.load(required=True)),
    upstream_blocks=[GroupUUID.MEMORY],
    downstream_blocks=[GroupUUID.MULTI_HOP_REASONING],
)
MULTI_HOP_REASONING = BlockExecutionFramework.load(
    uuid=GroupUUID.MULTI_HOP_REASONING,
    description=(
        'A technique that combines information from multiple sources to answer complex queries '
        'requiring multiple steps of reasoning.'
    ),
    type=BlockType.GROUP,
    templates_dir=templates_dir,
    upstream_blocks=[GroupUUID.ITERATIVE_RETRIEVAL],
    downstream_blocks=[GroupUUID.RANKING],
)
RANKING = BlockExecutionFramework.load(
    uuid=GroupUUID.RANKING,
    description=(
        'The process of ordering retrieved information based on relevance and importance to the '
        'query.'
    ),
    type=BlockType.GROUP,
    templates_dir=templates_dir,
    upstream_blocks=[GroupUUID.MULTI_HOP_REASONING],
    downstream_blocks=[],
)
