from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.llm.rag.blocks.query_processing import (
    groups as query_processing,
)
from mage_ai.frameworks.execution.llm.rag.blocks.response_generation import (
    groups as response_generation,
)
from mage_ai.frameworks.execution.llm.rag.blocks.retrieval import groups as retrieval
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.enums import GroupUUID
from mage_ai.frameworks.execution.models.pipeline.base import PipelineExecutionFramework

QUERY_PROCESSING = PipelineExecutionFramework.load(
    uuid=GroupUUID.QUERY_PROCESSING,
    description=(
        'The initial stage of the inference process where user queries are analyzed and '
        'prepared for retrieval.'
    ),
    groups=[GroupUUID.QUERY_PROCESSING],
    blocks=[
        query_processing.INTENT_DETECTION,
        query_processing.QUERY_DECOMPOSITION,
        query_processing.QUERY_AUGMENTATION,
    ],
)

RETRIEVAL = PipelineExecutionFramework.load(
    uuid=GroupUUID.RETRIEVAL,
    description=(
        'The stage where relevant information is retrieved from the indexed data based on the '
        'processed query.'
    ),
    groups=[GroupUUID.RETRIEVAL],
    blocks=[
        retrieval.MEMORY,
        retrieval.ITERATIVE_RETRIEVAL,
        retrieval.MULTI_HOP_REASONING,
        retrieval.RANKING,
    ],
)

RESPONSE_GENERATION = PipelineExecutionFramework.load(
    uuid=GroupUUID.RESPONSE_GENERATION,
    description=(
        'The final stage of the inference process where retrieved information is '
        'used to generate a '
        'coherent and relevant response to the user’s query.'
    ),
    groups=[GroupUUID.RESPONSE_GENERATION],
    blocks=[
        response_generation.CONTEXTUALIZATION,
        response_generation.RESPONSE_SYNTHESIS,
        response_generation.ANSWER_ENRICHMENT,
        response_generation.RESPONSE_FORMATTING,
    ],
)

INFERENCE = PipelineExecutionFramework.load(
    uuid=GroupUUID.INFERENCE,
    description=(
        'The process of handling user queries, retrieving relevant information, and generating '
        'appropriate responses in the RAG system.'
    ),
    groups=[GroupUUID.INFERENCE],
    blocks=[
        BlockExecutionFramework.load(
            uuid=QUERY_PROCESSING.uuid,
            description=QUERY_PROCESSING.description,
            type=BlockType.PIPELINE,
            upstream_blocks=[],
            downstream_blocks=[RETRIEVAL.uuid],
        ),
        BlockExecutionFramework.load(
            uuid=RETRIEVAL.uuid,
            description=RETRIEVAL.description,
            type=BlockType.PIPELINE,
            upstream_blocks=[QUERY_PROCESSING.uuid],
            downstream_blocks=[RESPONSE_GENERATION.uuid],
        ),
        BlockExecutionFramework.load(
            uuid=RESPONSE_GENERATION.uuid,
            description=RESPONSE_GENERATION.description,
            type=BlockType.PIPELINE,
            upstream_blocks=[RETRIEVAL.uuid],
            downstream_blocks=[],
        ),
    ],
    pipelines=[QUERY_PROCESSING, RETRIEVAL, RESPONSE_GENERATION],
)
