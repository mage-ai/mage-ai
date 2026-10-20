import os

from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.enums import GroupUUID

templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')

INTENT_DETECTION = BlockExecutionFramework.load(
    uuid=GroupUUID.INTENT_DETECTION,
    description='The process of identifying the user’s intention or goal behind their query.',
    type=BlockType.GROUP,
    templates_dir=templates_dir,
    upstream_blocks=[],
    downstream_blocks=[GroupUUID.QUERY_DECOMPOSITION],
)
QUERY_DECOMPOSITION = BlockExecutionFramework.load(
    uuid=GroupUUID.QUERY_DECOMPOSITION,
    description=(
        'The process of breaking down complex queries into simpler sub-queries for more effective '
        'retrieval.'
    ),
    type=BlockType.GROUP,
    templates_dir=templates_dir,
    upstream_blocks=[GroupUUID.INTENT_DETECTION],
    downstream_blocks=[GroupUUID.QUERY_AUGMENTATION],
)
QUERY_AUGMENTATION = BlockExecutionFramework.load(
    uuid=GroupUUID.QUERY_AUGMENTATION,
    description=(
        'The process of expanding or refining the original query to improve retrieval accuracy '
        'and relevance.'
    ),
    type=BlockType.GROUP,
    templates_dir=templates_dir,
    upstream_blocks=[GroupUUID.QUERY_DECOMPOSITION],
    downstream_blocks=[],
)
