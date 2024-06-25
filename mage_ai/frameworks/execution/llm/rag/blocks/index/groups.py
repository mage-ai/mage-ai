from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.enums import GroupUUID

CONTEXTUAL_DICTIONARY = BlockExecutionFramework.load(
    uuid=GroupUUID.CONTEXTUAL_DICTIONARY,
    description=(
        'A specialized index that maps words or phrases to their contextual meanings within the '
        'dataset.'
    ),
    type=BlockType.GROUP,
    upstream_blocks=[],
    downstream_blocks=[],
)
DOCUMENT_HIERARCHY = BlockExecutionFramework.load(
    uuid=GroupUUID.DOCUMENT_HIERARCHY,
    description=(
        'An index structure that organizes documents in a hierarchical manner for efficient '
        'navigation and retrieval.'
    ),
    type=BlockType.GROUP,
    upstream_blocks=[],
    downstream_blocks=[],
)
SEARCH_INDEX = BlockExecutionFramework.load(
    uuid=GroupUUID.SEARCH_INDEX,
    description=(
        'A specialized index optimized for fast full-text search and retrieval of relevant '
        'documents.'
    ),
    type=BlockType.GROUP,
    upstream_blocks=[],
    downstream_blocks=[],
)
