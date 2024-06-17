import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { BlockTypeEnum, DynamicModeEnum, InputDataTypeEnum } from '@interfaces/BlockType';
import { GroupUUIDEnum, PipelineExecutionFrameworkUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { cleanName } from '@utils/string';

export const TransformPipeline = {
  name: 'Transform documents',
  uuid: 'transform_documents',
  type: PipelineTypeEnum.PYTHON,
  groups: [GroupUUIDEnum.TRANSFORM],
  blocks: [
    {
      name: 'Clean column names',
      groups: [GroupUUIDEnum.CLEANING],
      downstream_blocks: ['add_3rd_party_data'],
    },
    {
      name: 'Add 3rd party data',
      groups: [GroupUUIDEnum.ENRICH],
      downstream_blocks: ['sliding_window_chunker'],
    },
    {
      name: 'Sliding window chunker',
      groups: [GroupUUIDEnum.CHUNKING],
      downstream_blocks: ['subword_tokenizer'],
    },
    {
      name: 'Subword tokenizer',
      groups: [GroupUUIDEnum.TOKENIZATION],
      downstream_blocks: ['instructor_embeddings'],
    },
    {
      name: 'Instructor embeddings',
      groups: [GroupUUIDEnum.EMBED],
      downstream_blocks: [
        'store_relationships_in_neo4j',
        'store_embeddings_pgvector',
      ],
    },
  ].map(block => ({
    ...block,
    type: BlockTypeEnum.TRANSFORMER,
    uuid: cleanName(block.name),
  })),
}

export const ExportPipeline = {
  name: 'Export and store data',
  uuid: 'export_and_store_data',
  type: PipelineTypeEnum.PYTHON,
  groups: [GroupUUIDEnum.EXPORT],
  blocks: [
    {
      name: 'Store relationships in Neo4J',
      groups: [GroupUUIDEnum.KNOWLEDGE_GRAPH],
    },
    {
      name: 'Store embeddings PGVector',
      groups: [GroupUUIDEnum.VECTOR_DATABASE],
    },
  ].map(block => ({
    ...block,
    type: BlockTypeEnum.DATA_EXPORTER,
    uuid: cleanName(block.name),
  })),
}

export const IndexPipeline = {
  name: 'Optimize data for search',
  uuid: 'optimize_data_for_search',
  type: PipelineTypeEnum.PYTHON,
  groups: [GroupUUIDEnum.INDEX],
  blocks: [
    {
      name: 'Create Contextual Dictionary',
      groups: [GroupUUIDEnum.INDEX],
      downstream_blocks: ['create_document_hierarchy'],
    },
    {
      name: 'Create Document Hierarchy',
      groups: [GroupUUIDEnum.INDEX],
    },
  ].map(block => ({
    ...block,
    type: BlockTypeEnum.CUSTOM,
    uuid: cleanName(block.name),
  })),
}

export const DataPreparationPipeline = {
  name: 'Data pre-processing',
  uuid: 'data_pre_processing',
  type: PipelineTypeEnum.PYTHON,
  groups: [GroupUUIDEnum.DATA_PREPARATION],
  blocks: [
    {
      name: 'Ingest titanic data',
      type: BlockTypeEnum.DATA_LOADER,
      groups: [GroupUUIDEnum.LOAD, GroupUUIDEnum.INGEST],
      downstream_blocks: ['serialize_and_map_documents'],
    },
    {
      name: 'Serialize and map documents',
      type: BlockTypeEnum.TRANSFORMER,
      groups: [GroupUUIDEnum.LOAD, GroupUUIDEnum.MAP],
      downstream_blocks: [TransformPipeline.uuid],
    },
    {
      name: TransformPipeline.name,
      type: BlockTypeEnum.PIPELINE,
      downstream_blocks: [ExportPipeline.uuid],
    },
    {
      name: ExportPipeline.name,
      type: BlockTypeEnum.PIPELINE,
      downstream_blocks: [IndexPipeline.uuid],
    },
    {
      name: IndexPipeline.name,
      type: BlockTypeEnum.PIPELINE,
    },
  ].map(block => ({
    ...block,
    uuid: cleanName(block.name),
  })),
}

export const DataValidationPipeline = {
  name: 'Run validations and quality checks',
  uuid: 'run_validations_and_quality_checks',
  type: PipelineTypeEnum.PYTHON,
  blocks: [
    {
      name: 'Wait for enough resources',
      type: BlockTypeEnum.SENSOR,
      downstream_blocks: ['run_unit_tests'],
    },
    {
      name: 'Run unit tests',
      type: BlockTypeEnum.CUSTOM,
    },
  ].map(block => ({
    ...block,
    uuid: cleanName(block.name),
  })),
}

export const QueryProcessingPipeline = {
  name: 'Interpret user prompt',
  uuid: 'interpret_user_prompt',
  type: PipelineTypeEnum.PYTHON,
  groups: [GroupUUIDEnum.QUERY_PROCESSING],
  blocks: [
    {
      name: 'Intent Detection',
      groups: [GroupUUIDEnum.INTENT_DETECTION],
      downstream_blocks: ['query_decomposition'],
    },
    {
      name: 'Query Decomposition',
      groups: [GroupUUIDEnum.QUERY_DECOMPOSITION],
      downstream_blocks: ['query_augmentation'],
    },
    {
      name: 'Query Augmentation',
      groups: [GroupUUIDEnum.QUERY_AUGMENTATION],
    },
  ].map(block => ({
    ...block,
    type: BlockTypeEnum.TRANSFORMER,
    uuid: cleanName(block.name),
  })),
}

export const RetrievalPipeline = {
  name: 'Retrieve documents',
  uuid: 'retrieve_documents',
  type: PipelineTypeEnum.PYTHON,
  groups: [GroupUUIDEnum.RETRIEVAL],
  blocks: [
    {
      name: 'Iterative Retrieval',
      groups: [GroupUUIDEnum.RETRIEVAL],
      downstream_blocks: ['multi_hop_reasoning'],
    },
    {
      name: 'Multi-hop Reasoning',
      groups: [GroupUUIDEnum.RETRIEVAL],
      downstream_blocks: ['ranking'],
    },
    {
      name: 'Ranking',
      groups: [GroupUUIDEnum.RETRIEVAL],
    },
  ].map(block => ({
    ...block,
    type: BlockTypeEnum.DATA_LOADER,
    uuid: cleanName(block.name),
  })),
}

export const ResponseGenerationPipeline = {
  name: 'Generate answers for user',
  uuid: 'generate_answers_for_user',
  type: PipelineTypeEnum.PYTHON,
  groups: [GroupUUIDEnum.RESPONSE_GENERATION],
  blocks: [
    {
      name: 'Contextualization',
      groups: [GroupUUIDEnum.CONTEXTUALIZATION],
      downstream_blocks: ['response_synthesis'],
    },
    {
      name: 'Response Synthesis',
      groups: [GroupUUIDEnum.RESPONSE_SYNTHESIS],
      downstream_blocks: ['answer_enrichment'],
    },
    {
      name: 'Answer Enrichment',
      groups: [GroupUUIDEnum.ANSWER_ENRICHMENT],
      downstream_blocks: ['response_formatting'],
    },
    {
      name: 'Response Formatting',
      groups: [GroupUUIDEnum.RESPONSE_FORMATTING],
    },
  ].map(block => ({
    ...block,
    type: BlockTypeEnum.DATA_EXPORTER,
    uuid: cleanName(block.name),
  })),
}

export const InferencePipeline = {
  name: 'Answer retrieval',
  uuid: 'answer_retrieval',
  type: PipelineTypeEnum.PYTHON,
  groups: [GroupUUIDEnum.INFERENCE],
  blocks: [
    {
      uuid: QueryProcessingPipeline.uuid,
      downstream_blocks: [RetrievalPipeline.uuid],
    },
    {
      uuid: RetrievalPipeline.uuid,
      downstream_blocks: [ResponseGenerationPipeline.uuid],
    },
    {
      uuid: ResponseGenerationPipeline.uuid,
    },
  ].map(block => ({ ...block, type: BlockTypeEnum.PIPELINE })),
}

export const PipelineFrameworkInstance = {
  name: 'Mager RAG pipeline',
  uuid: 'mager_rag_pipeline',
  type: PipelineTypeEnum.PYTHON,
  execution_framework: PipelineExecutionFrameworkUUIDEnum.RAG,
  blocks: [
    {
      uuid: DataPreparationPipeline.uuid,
      downstream_blocks: [
        DataValidationPipeline.uuid,
        InferencePipeline.uuid,
      ],
    },
    {
      uuid: DataValidationPipeline.uuid,
    },
    {
      uuid: InferencePipeline.uuid,
    },
  ].map(block => ({ ...block, type: BlockTypeEnum.PIPELINE })),
}
