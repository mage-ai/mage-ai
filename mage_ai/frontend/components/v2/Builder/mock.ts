import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { BlockTypeEnum } from '@interfaces/BlockType';
import {
  GroupUUIDEnum,
  PipelineExecutionFrameworkUUIDEnum,
} from '@interfaces/PipelineExecutionFramework/types';
import { cleanName } from '@utils/string';

export const LoadPipeline = {
  name: 'Load unstructured data',
  uuid: cleanName('Load unstructured data'),
  type: PipelineTypeEnum.PYTHON,
  blocks: [
    {
      name: 'Ingest titanic data',
      type: BlockTypeEnum.DATA_LOADER,
      groups: [GroupUUIDEnum.INGEST],
    },
    {
      name: 'Serialize and map documents',
      type: BlockTypeEnum.DATA_LOADER,
      groups: [GroupUUIDEnum.MAP],
    },
  ].map(block => ({ ...block, uuid: cleanName(block.name) })),
};

export const TransformPipeline = {
  name: 'Transform a ton of documents',
  uuid: cleanName('Transform a ton of documents'),
  type: PipelineTypeEnum.PYTHON,
  blocks: [
    {
      name: 'Clean column names',
      type: BlockTypeEnum.TRANSFORMER,
      groups: [GroupUUIDEnum.CLEANING],
    },
    {
      name: 'Add 3rd party data',
      type: BlockTypeEnum.TRANSFORMER,
      groups: [GroupUUIDEnum.ENRICH],
    },
    {
      name: 'Sliding window chunker',
      type: BlockTypeEnum.TRANSFORMER,
      groups: [GroupUUIDEnum.CHUNKING],
    },
    {
      name: 'Subword tokenizer',
      type: BlockTypeEnum.TRANSFORMER,
      groups: [GroupUUIDEnum.TOKENIZATION],
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
      type: BlockTypeEnum.TRANSFORMER,
      groups: [GroupUUIDEnum.EMBED],
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
  ].map(block => ({ ...block, uuid: cleanName(block.name) })),
};

export const ExportPipeline = {
  name: 'Export and store data forever',
  uuid: cleanName('Export and store data forever'),
  type: PipelineTypeEnum.PYTHON,
  blocks: [
    {
      name: 'Store relationships in Neo4J',
      type: BlockTypeEnum.DATA_EXPORTER,
      groups: [GroupUUIDEnum.KNOWLEDGE_GRAPH],
    },
    {
      name: 'Store embeddings PGVector',
      type: BlockTypeEnum.DATA_EXPORTER,
      groups: [GroupUUIDEnum.VECTOR_DATABASE],
    },
  ].map(block => ({ ...block, uuid: cleanName(block.name) })),
};

export const IndexPipeline = {
  name: 'Optimize data for search and APIs',
  uuid: cleanName('Optimize data for search and APIs'),
  type: PipelineTypeEnum.PYTHON,
  blocks: [
    {
      name: 'Create Contextual Dictionary',
      type: BlockTypeEnum.CUSTOM,
      groups: [GroupUUIDEnum.CONTEXTUAL_DICTIONARY],
    },
    {
      name: 'Create Document Hierarchy',
      type: BlockTypeEnum.CUSTOM,
      groups: [GroupUUIDEnum.DOCUMENT_HIERARCHY],
    },
    {
      name: 'Search index using FAISS',
      type: BlockTypeEnum.CUSTOM,
      groups: [GroupUUIDEnum.SEARCH_INDEX],
    },
  ].map(block => ({ ...block, uuid: cleanName(block.name) })),
};

export const QueryProcessingPipeline = {
  name: 'Interpret user prompt',
  uuid: 'interpret_user_prompt',
  type: PipelineTypeEnum.PYTHON,
  blocks: [
    {
      name: 'Understand user intentions',
      type: BlockTypeEnum.DATA_LOADER,
      groups: [GroupUUIDEnum.INTENT_DETECTION],
    },
    {
      name: 'Detect malicious intent',
      type: BlockTypeEnum.DATA_LOADER,
      groups: [GroupUUIDEnum.INTENT_DETECTION],
    },
    {
      name: 'Add guardrails',
      type: BlockTypeEnum.DATA_LOADER,
      groups: [GroupUUIDEnum.INTENT_DETECTION],
    },
    {
      name: 'Decompose user query',
      type: BlockTypeEnum.DATA_LOADER,
      groups: [GroupUUIDEnum.QUERY_DECOMPOSITION],
    },
    {
      name: 'Improve user query prompts',
      type: BlockTypeEnum.DATA_LOADER,
      groups: [GroupUUIDEnum.QUERY_AUGMENTATION],
    },
    {
      name: 'Augment user query with context',
      type: BlockTypeEnum.DATA_LOADER,
      groups: [GroupUUIDEnum.QUERY_AUGMENTATION],
    },
  ].map(block => ({
    ...block,
    uuid: cleanName(block.name),
  })),
};

export const RetrievalPipeline = {
  name: 'Retrieve numerous documents from company',
  uuid: cleanName('Retrieve numerous documents from company'),
  type: PipelineTypeEnum.PYTHON,
  blocks: [
    {
      name: 'Page-Based Recursive Retrieval',
      groups: [GroupUUIDEnum.ITERATIVE_RETRIEVAL],
      type: BlockTypeEnum.TRANSFORMER,
    },
    {
      name: 'Information-Centric Recursive Retrieval',
      groups: [GroupUUIDEnum.ITERATIVE_RETRIEVAL],
      type: BlockTypeEnum.TRANSFORMER,
    },
    {
      name: 'Concept-Centric Recursive Retrieval',
      groups: [GroupUUIDEnum.ITERATIVE_RETRIEVAL],
      type: BlockTypeEnum.TRANSFORMER,
    },
    {
      name: 'Fetch Wikipedia articles for memory',
      groups: [GroupUUIDEnum.MEMORY],
      type: BlockTypeEnum.CUSTOM,
    },
    {
      name: 'Multi-hop reasoning and logic',
      groups: [GroupUUIDEnum.MULTI_HOP_REASONING],
      type: BlockTypeEnum.TRANSFORMER,
    },
    {
      name: 'ReRanking',
      groups: [GroupUUIDEnum.RANKING],
      type: BlockTypeEnum.TRANSFORMER,
    },
    {
      name: 'Hybrid Search',
      groups: [GroupUUIDEnum.RANKING],
      type: BlockTypeEnum.TRANSFORMER,
    },
    {
      name: 'Query Expansion',
      groups: [GroupUUIDEnum.RANKING],
      type: BlockTypeEnum.TRANSFORMER,
    },
  ].map(block => ({ ...block, uuid: cleanName(block.name) })),
};

export const ResponseGenerationPipeline = {
  name: 'Generate great answers for user',
  uuid: cleanName('Generate great answers for user'),
  type: PipelineTypeEnum.PYTHON,
  blocks: [
    {
      name: 'Add documents to context for LLM',
      groups: [GroupUUIDEnum.CONTEXTUALIZATION],
      type: BlockTypeEnum.DATA_EXPORTER,
    },
    {
      name: 'Synthesize response from model',
      groups: [GroupUUIDEnum.RESPONSE_SYNTHESIS],
      type: BlockTypeEnum.DATA_EXPORTER,
    },
    {
      name: 'Add custom information to response',
      groups: [GroupUUIDEnum.ANSWER_ENRICHMENT],
      type: BlockTypeEnum.DATA_EXPORTER,
    },
    {
      name: 'Add source links to response',
      groups: [GroupUUIDEnum.ANSWER_ENRICHMENT],
      type: BlockTypeEnum.DATA_EXPORTER,
    },
    {
      name: 'Explain how the model got the answer',
      groups: [GroupUUIDEnum.ANSWER_ENRICHMENT],
      type: BlockTypeEnum.DATA_EXPORTER,
    },
    {
      name: 'Parse model query and present',
      groups: [GroupUUIDEnum.RESPONSE_FORMATTING],
      type: BlockTypeEnum.DATA_EXPORTER,
    },
  ].map(block => ({ ...block, uuid: cleanName(block.name) })),
};

export const DataPreparationPipeline = {
  name: 'Data pre-processing pipeline',
  uuid: cleanName('Data pre-processing pipeline'),
  type: PipelineTypeEnum.PYTHON,
  blocks: [
    {
      name: `Data-prep ${LoadPipeline.uuid} pipeline`,
      uuid: LoadPipeline.uuid,
      type: BlockTypeEnum.PIPELINE,
    },
    {
      name: `Data-prep ${TransformPipeline.uuid} pipeline`,
      uuid: TransformPipeline.uuid,
      type: BlockTypeEnum.PIPELINE,
    },
    {
      name: `Data-prep ${ExportPipeline.uuid} pipeline`,
      uuid: ExportPipeline.uuid,
      type: BlockTypeEnum.PIPELINE,
    },
    {
      name: `Data-prep ${IndexPipeline.uuid} pipeline`,
      uuid: IndexPipeline.uuid,
      type: BlockTypeEnum.PIPELINE,
    },
  ],
};

export const InferencePipeline = {
  name: 'Super cool inference pipeline',
  uuid: cleanName('Super cool inference pipeline'),
  type: PipelineTypeEnum.PYTHON,
  blocks: [
    {
      name: `My custom ${QueryProcessingPipeline.uuid} pipeline`,
      uuid: QueryProcessingPipeline.uuid,
      type: BlockTypeEnum.PIPELINE,
    },
    {
      name: `My custom ${RetrievalPipeline.uuid} pipeline`,
      uuid: RetrievalPipeline.uuid,
      type: BlockTypeEnum.PIPELINE,
    },
    {
      name: `My custom ${ResponseGenerationPipeline.uuid} pipeline`,
      uuid: ResponseGenerationPipeline.uuid,
      type: BlockTypeEnum.PIPELINE,
    },
  ],
};

export const PipelineFrameworkInstance = {
  name: 'Mager RAGer pipeline',
  uuid: cleanName('Mager RAGer pipeline'),
  type: PipelineTypeEnum.PYTHON,
  execution_framework: PipelineExecutionFrameworkUUIDEnum.RAG,
  blocks: [
    {
      name: `Main top-level ${DataPreparationPipeline.uuid} pipeline`,
      uuid: DataPreparationPipeline.uuid,
      type: BlockTypeEnum.PIPELINE,
    },
    {
      name: `Main top-level ${InferencePipeline.uuid} pipeline`,
      uuid: InferencePipeline.uuid,
      type: BlockTypeEnum.PIPELINE,
    },
  ],
};

export default PipelineFrameworkInstance;
