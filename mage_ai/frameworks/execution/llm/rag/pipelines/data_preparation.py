from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.llm.rag.blocks.export import groups as export
from mage_ai.frameworks.execution.llm.rag.blocks.index import groups as index
from mage_ai.frameworks.execution.llm.rag.blocks.load import groups as load
from mage_ai.frameworks.execution.llm.rag.blocks.transform import groups as transform
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.enums import ExecutionFrameworkUUID, GroupUUID
from mage_ai.frameworks.execution.models.pipeline.base import PipelineExecutionFramework

LOAD = PipelineExecutionFramework(
    uuid=GroupUUID.LOAD,
    groups=[GroupUUID.LOAD],
    blocks=[
        load.INGEST,
        load.MAP,
    ],
)

TRANSFORM = PipelineExecutionFramework(
    uuid=GroupUUID.TRANSFORM,
    groups=[GroupUUID.TRANSFORM],
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
    blocks=[
        export.KNOWLEDGE_GRAPH,
        export.VECTOR_DATABASE,
    ],
)

INDEX = PipelineExecutionFramework(
    uuid=GroupUUID.INDEX,
    groups=[GroupUUID.INDEX],
    blocks=[
        index.CONTEXTUAL_DICTIONARY,
        index.DOCUMENT_HIERARCHY,
        index.SEARCH_INDEX,
    ],
)

DATA_PREPARATION = PipelineExecutionFramework(
    uuid=GroupUUID.DATA_PREPARATION,
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
