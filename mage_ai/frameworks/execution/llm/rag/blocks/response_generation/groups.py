from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.block.models import Configuration, Metadata
from mage_ai.frameworks.execution.models.enums import GroupUUID

CONTEXTUALIZATION = BlockExecutionFramework(
    uuid=GroupUUID.CONTEXTUALIZATION,
    type=BlockType.GROUP,
    configuration=Configuration.load(Metadata.load(required=True)),
    upstream_blocks=[],
    downstream_blocks=[GroupUUID.RESPONSE_SYNTHESIS],
)
RESPONSE_SYNTHESIS = BlockExecutionFramework(
    uuid=GroupUUID.RESPONSE_SYNTHESIS,
    type=BlockType.GROUP,
    configuration=Configuration.load(Metadata.load(required=True)),
    upstream_blocks=[GroupUUID.CONTEXTUALIZATION],
    downstream_blocks=[GroupUUID.ANSWER_ENRICHMENT],
)
ANSWER_ENRICHMENT = BlockExecutionFramework(
    uuid=GroupUUID.ANSWER_ENRICHMENT,
    type=BlockType.GROUP,
    upstream_blocks=[GroupUUID.RESPONSE_SYNTHESIS],
    downstream_blocks=[GroupUUID.RESPONSE_FORMATTING],
)
RESPONSE_FORMATTING = BlockExecutionFramework(
    uuid=GroupUUID.RESPONSE_FORMATTING,
    type=BlockType.GROUP,
    upstream_blocks=[GroupUUID.ANSWER_ENRICHMENT],
    downstream_blocks=[],
)
