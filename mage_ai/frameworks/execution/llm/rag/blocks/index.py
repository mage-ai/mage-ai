from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.enums import GroupUUID

CONTEXTUAL_DICTIONARY = BlockExecutionFramework(
    uuid=GroupUUID.CONTEXTUAL_DICTIONARY,
    type=BlockType.GROUP,
    upstream_blocks=[],
    downstream_blocks=[],
)
DOCUMENT_HIERARCHY = BlockExecutionFramework(
    uuid=GroupUUID.DOCUMENT_HIERARCHY,
    type=BlockType.GROUP,
    upstream_blocks=[],
    downstream_blocks=[],
)
SEARCH_INDEX = BlockExecutionFramework(
    uuid=GroupUUID.SEARCH_INDEX, type=BlockType.GROUP, upstream_blocks=[], downstream_blocks=[]
)
