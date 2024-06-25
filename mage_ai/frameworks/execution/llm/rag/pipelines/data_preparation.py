from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.llm.rag.blocks.export import groups as export
from mage_ai.frameworks.execution.llm.rag.blocks.index import groups as index
from mage_ai.frameworks.execution.llm.rag.blocks.load import groups as load
from mage_ai.frameworks.execution.llm.rag.blocks.transform import groups as transform
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.enums import GroupUUID
from mage_ai.frameworks.execution.models.pipeline.base import PipelineExecutionFramework

LOAD = PipelineExecutionFramework.load(
    uuid=GroupUUID.LOAD,
    description=(
        'The initial stage where data is imported from various sources into the RAG system.'
    ),
    groups=[GroupUUID.LOAD],
    blocks=[
        load.INGEST,
        load.MAP,
    ],
)

TRANSFORM = PipelineExecutionFramework.load(
    uuid=GroupUUID.TRANSFORM,
    description=(
        'The stage where imported data is processed, cleaned, and prepared for further use '
        'in the RAG pipeline.'
    ),
    groups=[GroupUUID.TRANSFORM],
    blocks=[
        transform.CLEANING,
        transform.ENRICH,
        transform.CHUNKING,
        transform.TOKENIZATION,
        transform.EMBED,
    ],
)

EXPORT = PipelineExecutionFramework.load(
    uuid=GroupUUID.EXPORT,
    description=(
        'The stage where processed data is exported to various storage systems for efficient '
        'retrieval.'
    ),
    groups=[GroupUUID.EXPORT],
    blocks=[
        export.KNOWLEDGE_GRAPH,
        export.VECTOR_DATABASE,
    ],
)

INDEX = PipelineExecutionFramework.load(
    uuid=GroupUUID.INDEX,
    description=(
        'The final stage of data preparation where exported data is indexed for quick and '
        'efficient retrieval during the inference process.'
    ),
    groups=[GroupUUID.INDEX],
    blocks=[
        index.CONTEXTUAL_DICTIONARY,
        index.DOCUMENT_HIERARCHY,
        index.SEARCH_INDEX,
    ],
)

DATA_PREPARATION = PipelineExecutionFramework.load(
    uuid=GroupUUID.DATA_PREPARATION,
    description=(
        'The process of preparing and organizing data for use in the RAG system, including '
        'loading, transforming, exporting, and indexing.'
    ),
    groups=[GroupUUID.DATA_PREPARATION],
    blocks=[
        BlockExecutionFramework.load(
            uuid=LOAD.uuid,
            description=LOAD.description,
            type=BlockType.PIPELINE,
            upstream_blocks=[],
            downstream_blocks=[TRANSFORM.uuid],
        ),
        BlockExecutionFramework.load(
            uuid=TRANSFORM.uuid,
            description=TRANSFORM.description,
            type=BlockType.PIPELINE,
            upstream_blocks=[LOAD.uuid],
            downstream_blocks=[EXPORT.uuid],
        ),
        BlockExecutionFramework.load(
            uuid=EXPORT.uuid,
            description=EXPORT.description,
            type=BlockType.PIPELINE,
            upstream_blocks=[TRANSFORM.uuid],
            downstream_blocks=[INDEX.uuid],
        ),
        BlockExecutionFramework.load(
            uuid=INDEX.uuid,
            description=INDEX.description,
            type=BlockType.PIPELINE,
            upstream_blocks=[EXPORT.uuid],
            downstream_blocks=[],
        ),
    ],
    pipelines=[LOAD, TRANSFORM, EXPORT, INDEX],
)
