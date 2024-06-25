from mage_ai.data_preparation.models.constants import BlockType, PipelineType
from mage_ai.frameworks.execution.llm.rag.blocks import export, index, load, transform
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.enums import ExecutionFrameworkUUID, GroupUUID
from mage_ai.frameworks.execution.models.pipeline.base import PipelineExecutionFramework

LOAD = PipelineExecutionFramework(
    uuid=GroupUUID.LOAD,
    groups=[GroupUUID.LOAD],
    type=PipelineType.EXECUTION_FRAMEWORK,
    blocks=[load.INGEST, load.MAP],
)

TRANSFORM = PipelineExecutionFramework(
    uuid=GroupUUID.TRANSFORM,
    groups=[GroupUUID.TRANSFORM],
    type=PipelineType.EXECUTION_FRAMEWORK,
    blocks=[
        transform.CLEANING,
        transform.ENRICH,
        transform.CHUNKING,
        transform.TOKENIZATION,
        transform.EMBED,
    ],
)

EXPORT = PipelineExecutionFramework(
    uuid=GroupUUID.EXPORT,
    groups=[GroupUUID.EXPORT],
    type=PipelineType.EXECUTION_FRAMEWORK,
    blocks=[
        export.KNOWLEDGE_GRAPH,
        export.VECTOR_DATABASE,
    ],
)

INDEX = PipelineExecutionFramework(
    uuid=GroupUUID.INDEX,
    groups=[GroupUUID.INDEX],
    type=PipelineType.EXECUTION_FRAMEWORK,
    blocks=[
        index.CONTEXTUAL_DICTIONARY,
        index.DOCUMENT_HIERARCHY,
        index.SEARCH_INDEX,
    ],
)

DATA_PREPARATION = PipelineExecutionFramework(
    uuid=GroupUUID.DATA_PREPARATION,
    type=PipelineType.EXECUTION_FRAMEWORK,
    groups=[GroupUUID.DATA_PREPARATION],
    execution_framework=ExecutionFrameworkUUID.RAG,
    blocks=[
        BlockExecutionFramework(
            uuid=LOAD.uuid,
            type=BlockType.PIPELINE,
            upstream_blocks=[],
            downstream_blocks=[TRANSFORM.uuid],
        ),
        BlockExecutionFramework(
            uuid=TRANSFORM.uuid,
            type=BlockType.PIPELINE,
            upstream_blocks=[LOAD.uuid],
            downstream_blocks=[EXPORT.uuid],
        ),
        BlockExecutionFramework(
            uuid=EXPORT.uuid,
            type=BlockType.PIPELINE,
            upstream_blocks=[TRANSFORM.uuid],
            downstream_blocks=[INDEX.uuid],
        ),
        BlockExecutionFramework(
            uuid=INDEX.uuid,
            type=BlockType.PIPELINE,
            upstream_blocks=[EXPORT.uuid],
            downstream_blocks=[],
        ),
    ],
)
