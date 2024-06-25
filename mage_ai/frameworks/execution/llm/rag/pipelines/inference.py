from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.llm.rag.blocks.query_processing import (
    groups as query_processing,
)
from mage_ai.frameworks.execution.llm.rag.blocks.response_generation import (
    groups as response_generation,
)
from mage_ai.frameworks.execution.llm.rag.blocks.retrieval import groups as retrieval
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.enums import ExecutionFrameworkUUID, GroupUUID
from mage_ai.frameworks.execution.models.pipeline.base import PipelineExecutionFramework

QUERY_PROCESSING = PipelineExecutionFramework(
    uuid=GroupUUID.QUERY_PROCESSING,
    groups=[GroupUUID.QUERY_PROCESSING],
    blocks=[
        query_processing.INTENT_DETECTION,
        query_processing.QUERY_DECOMPOSITION,
        query_processing.QUERY_AUGMENTATION,
    ],
)

RETRIEVAL = PipelineExecutionFramework(
    uuid=GroupUUID.RETRIEVAL,
    groups=[GroupUUID.RETRIEVAL],
    blocks=[
        retrieval.MEMORY,
        retrieval.ITERATIVE_RETRIEVAL,
        retrieval.MULTI_HOP_REASONING,
        retrieval.RANKING,
    ],
)

RESPONSE_GENERATION = PipelineExecutionFramework(
    uuid=GroupUUID.RESPONSE_GENERATION,
    groups=[GroupUUID.RESPONSE_GENERATION],
    blocks=[
        response_generation.CONTEXTUALIZATION,
        response_generation.RESPONSE_SYNTHESIS,
        response_generation.ANSWER_ENRICHMENT,
        response_generation.RESPONSE_FORMATTING,
    ],
)

INFERENCE = PipelineExecutionFramework(
    uuid=GroupUUID.INFERENCE,
    groups=[GroupUUID.INFERENCE],
    execution_framework=ExecutionFrameworkUUID.RAG,
    blocks=[
        BlockExecutionFramework(
            uuid=QUERY_PROCESSING.uuid,
            type=BlockType.PIPELINE,
            upstream_blocks=[],
            downstream_blocks=[RETRIEVAL.uuid],
        ),
        BlockExecutionFramework(
            uuid=RETRIEVAL.uuid,
            type=BlockType.PIPELINE,
            upstream_blocks=[QUERY_PROCESSING.uuid],
            downstream_blocks=[RESPONSE_GENERATION.uuid],
        ),
        BlockExecutionFramework(
            uuid=RESPONSE_GENERATION.uuid,
            type=BlockType.PIPELINE,
            upstream_blocks=[RETRIEVAL.uuid],
            downstream_blocks=[],
        ),
    ],
)
