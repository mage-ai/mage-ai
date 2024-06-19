import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { BlockTypeEnum } from '@interfaces/BlockType';
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
      upstream_blocks: [],
    },
    {
      name: 'Add 3rd party data',
      groups: [GroupUUIDEnum.ENRICH],
      downstream_blocks: ['sliding_window_chunker'],
      upstream_blocks: ['clean_column_names'],
    },
    {
      name: 'Sliding window chunker',
      groups: [GroupUUIDEnum.CHUNKING],
      downstream_blocks: ['subword_tokenizer'],
      upstream_blocks: ['add_3rd_party_data'],
    },
    {
      name: 'Subword tokenizer',
      groups: [GroupUUIDEnum.TOKENIZATION],
      downstream_blocks: ['instructor_embeddings'],
      upstream_blocks: ['sliding_window_chunker'],
      configuration: {
        templates: {
          subword_tokenizer: {
            variables: {
              hallucination: 10,
              fire: 'water',
              spell: true,
            },
          },
          word_tokenizer: {
            variables: {
              spacing: 'none',
              max_length: 100,
              add_special_tokens: true,
            },
          },
        },
      },
    },
    {
      name: 'Instructor embeddings',
      groups: [GroupUUIDEnum.EMBED],
      downstream_blocks: [
        'store_relationships_in_neo4j',
        'store_embeddings_pgvector',
      ],
      upstream_blocks: ['subword_tokenizer'],
      configuration: {
        templates: {
          bert_embedding: {
            variables: {
              bert_embeddings_uuid: 'abc',
            },
          },
          word2vec_embedding: {
            variables: {
              word2vec_embeddings_uuid: 'def',
            },
          },
        },
      },
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
      upstream_blocks: ['instructor_embeddings'],
      downstream_blocks: ['create_contextual_dictionary'],
    },
    {
      name: 'Store embeddings PGVector',
      groups: [GroupUUIDEnum.VECTOR_DATABASE],
      upstream_blocks: ['instructor_embeddings'],
      downstream_blocks: ['create_contextual_dictionary'],
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
      upstream_blocks: [
        'store_relationships_in_neo_4_j',
        'store_embeddings_pgvector',
      ],
      downstream_blocks: ['create_document_hierarchy'],
    },
    {
      name: 'Create Document Hierarchy',
      groups: [GroupUUIDEnum.INDEX],
      upstream_blocks: ['create_contextual_dictionary'],
      downstream_blocks: ['search_index_using_faiss'],
    },
    {
      name: 'Search index using FAISS',
      groups: [GroupUUIDEnum.INDEX],
      upstream_blocks: ['create_document_hierarchy'],
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
      type: BlockTypeEnum.DATA_EXPORTER,
      groups: [GroupUUIDEnum.LOAD, GroupUUIDEnum.INGEST],
      downstream_blocks: ['serialize_and_map_documents'],
      upstream_blocks: [],
    },
    {
      name: 'Serialize and map documents',
      type: BlockTypeEnum.TRANSFORMER,
      groups: [GroupUUIDEnum.LOAD, GroupUUIDEnum.MAP],
      upstream_blocks: ['ingest_titanic_data'],
      downstream_blocks: [TransformPipeline.uuid],
    },
    {
      name: TransformPipeline.name,
      type: BlockTypeEnum.PIPELINE,
      upstream_blocks: ['serialize_and_map_documents'],
      downstream_blocks: [ExportPipeline.uuid],
    },
    {
      name: ExportPipeline.name,
      type: BlockTypeEnum.PIPELINE,
      upstream_blocks: [TransformPipeline.uuid],
      downstream_blocks: [IndexPipeline.uuid],
    },
    {
      name: IndexPipeline.name,
      type: BlockTypeEnum.PIPELINE,
      upstream_blocks: [ExportPipeline.uuid],
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
      upstream_blocks: [],
      downstream_blocks: ['run_unit_tests'],
    },
    {
      name: 'Lint code and format',
      type: BlockTypeEnum.TRANSFORMER,
      upstream_blocks: ['wait_for_enough_resources'],
      downstream_blocks: ['run_unit_tests'],
    },
    {
      name: 'Run unit tests',
      type: BlockTypeEnum.CUSTOM,
      upstream_blocks: ['lint_code_and_format'],
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
      upstream_blocks: [],
    },
    {
      name: 'Query Decomposition',
      groups: [GroupUUIDEnum.QUERY_DECOMPOSITION],
      downstream_blocks: ['query_augmentation'],
      upstream_blocks: ['intent_detection'],
    },
    {
      name: 'Query Augmentation',
      groups: [GroupUUIDEnum.QUERY_AUGMENTATION],
      upstream_blocks: ['query_decomposition'],
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
      upstream_blocks: [],
    },
    {
      name: 'Multi-hop Reasoning',
      groups: [GroupUUIDEnum.RETRIEVAL],
      downstream_blocks: ['ranking'],
      upstream_blocks: ['iterative_retrieval'],
    },
    {
      name: 'Ranking',
      groups: [GroupUUIDEnum.RETRIEVAL],
      upstream_blocks: ['multi_hop_reasoning'],
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
      upstream_blocks: [],
    },
    {
      name: 'Response Synthesis',
      groups: [GroupUUIDEnum.RESPONSE_SYNTHESIS],
      downstream_blocks: ['answer_enrichment'],
      upstream_blocks: ['contextualization'],
    },
    {
      name: 'Answer Enrichment',
      groups: [GroupUUIDEnum.ANSWER_ENRICHMENT],
      downstream_blocks: ['response_formatting'],
      upstream_blocks: ['response_synthesis'],
    },
    {
      name: 'Response Formatting',
      groups: [GroupUUIDEnum.RESPONSE_FORMATTING],
      upstream_blocks: ['answer_enrichment'],
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
      name: QueryProcessingPipeline.name,
      downstream_blocks: [RetrievalPipeline.uuid],
      upstream_blocks: [],
    },
    {
      uuid: RetrievalPipeline.uuid,
      name: RetrievalPipeline.name,
      downstream_blocks: [ResponseGenerationPipeline.uuid],
      upstream_blocks: [QueryProcessingPipeline.uuid],
    },
    {
      uuid: ResponseGenerationPipeline.uuid,
      name: ResponseGenerationPipeline.name,
      upstream_blocks: [RetrievalPipeline.uuid],
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
      name: DataPreparationPipeline.name,
      downstream_blocks: [
        DataValidationPipeline.uuid,
        InferencePipeline.uuid,
      ],
      upstream_blocks: [],
    },
    {
      uuid: DataValidationPipeline.uuid,
      name: DataValidationPipeline.name,
      upstream_blocks: [DataPreparationPipeline.uuid],
    },
    {
      uuid: InferencePipeline.uuid,
      name: InferencePipeline.name,
      upstream_blocks: [DataPreparationPipeline.uuid],
    },
  ].map(block => ({ ...block, type: BlockTypeEnum.PIPELINE })),
}

export default [
  DataPreparationPipeline,
  TransformPipeline,
  DataValidationPipeline,
  ExportPipeline,
  IndexPipeline,
  InferencePipeline,
  QueryProcessingPipeline,
  ResponseGenerationPipeline,
  RetrievalPipeline,
];
