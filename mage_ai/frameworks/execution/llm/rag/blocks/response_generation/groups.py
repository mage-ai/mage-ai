from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.block.models import Configuration, Metadata
from mage_ai.frameworks.execution.models.enums import GroupUUID

CONTEXTUALIZATION = BlockExecutionFramework.load(
    uuid=GroupUUID.CONTEXTUALIZATION,
    description=(
        'The process of integrating retrieved information with the query context to generate a'
        ' coherent response.'
    ),
    type=BlockType.GROUP,
    configuration=Configuration.load(Metadata.load(required=True)),
    upstream_blocks=[],
    downstream_blocks=[GroupUUID.RESPONSE_SYNTHESIS],
)
RESPONSE_SYNTHESIS = BlockExecutionFramework.load(
    uuid=GroupUUID.RESPONSE_SYNTHESIS,
    description=(
        'The process of generating a coherent and relevant response based on the contextualized'
        ' information.'
    ),
    type=BlockType.GROUP,
    configuration=Configuration.load(Metadata.load(required=True)),
    upstream_blocks=[GroupUUID.CONTEXTUALIZATION],
    downstream_blocks=[GroupUUID.ANSWER_ENRICHMENT],
)
ANSWER_ENRICHMENT = BlockExecutionFramework.load(
    uuid=GroupUUID.ANSWER_ENRICHMENT,
    description=(
        'The process of adding additional relevant information or context to enhance the generated'
        ' response.'
    ),
    type=BlockType.GROUP,
    upstream_blocks=[GroupUUID.RESPONSE_SYNTHESIS],
    downstream_blocks=[GroupUUID.RESPONSE_FORMATTING],
)
RESPONSE_FORMATTING = BlockExecutionFramework.load(
    uuid=GroupUUID.RESPONSE_FORMATTING,
    description=(
        'The final stage where the generated response is formatted according to specific'
        ' requirements or preferences.'
    ),
    type=BlockType.GROUP,
    upstream_blocks=[GroupUUID.ANSWER_ENRICHMENT],
    downstream_blocks=[],
)
