export enum PipelineExecutionFrameworkUUIDEnum {
  RAG = 'rag',
}

export enum GroupUUIDEnum {
  ANSWER_ENRICHMENT = 'answer_enrichment',
  CHUNKING = 'chunking',
  CLEANING = 'cleaning',
  CONTEXTUALIZATION = 'contextualization',
  CONTEXTUAL_DICTIONARY = 'contextual_dictionary',
  DATA_PREPARATION = 'data_preparation',
  DOCUMENT_HIERARCHY = 'document_hierarchy',
  EMBED = 'embed',
  ENRICH = 'enrich',
  EXPORT = 'export',
  INDEX = 'index',
  INFERENCE = 'inference',
  INGEST = 'ingest',
  INTENT_DETECTION = 'intent_detection',
  ITERATIVE_RETRIEVAL = 'iterative_retrieval',
  KNOWLEDGE_GRAPH = 'knowledge_graph',
  LOAD = 'load',
  MAP = 'map',
  MEMORY = 'memory',
  MULTI_HOP_REASONING = 'multi_hop_reasoning',
  QUERY_AUGMENTATION = 'query_augmentation',
  QUERY_DECOMPOSITION = 'query_decomposition',
  QUERY_PROCESSING = 'query_processing',
  RANKING = 'ranking',
  RESPONSE_FORMATTING = 'response_formatting',
  RESPONSE_GENERATION = 'response_generation',
  RESPONSE_SYNTHESIS = 'response_synthesis',
  RETRIEVAL = 'retrieval',
  SEARCH_INDEX = 'search_index',
  TOKENIZATION = 'tokenization',
  TRANSFORM = 'transform',
  VECTOR_DATABASE = 'vector_database',
  NONE = 'none',
}

export const GroupMapping = {
  [GroupUUIDEnum.DATA_PREPARATION]: {
    [GroupUUIDEnum.LOAD]: [GroupUUIDEnum.INGEST, GroupUUIDEnum.MAP],
    [GroupUUIDEnum.TRANSFORM]: [
      GroupUUIDEnum.CLEANING,
      GroupUUIDEnum.ENRICH,
      GroupUUIDEnum.CHUNKING,
      GroupUUIDEnum.TOKENIZATION,
      GroupUUIDEnum.EMBED,
    ],
    [GroupUUIDEnum.EXPORT]: [GroupUUIDEnum.VECTOR_DATABASE, GroupUUIDEnum.KNOWLEDGE_GRAPH],
    [GroupUUIDEnum.INDEX]: [
      GroupUUIDEnum.CONTEXTUAL_DICTIONARY,
      GroupUUIDEnum.DOCUMENT_HIERARCHY,
      GroupUUIDEnum.SEARCH_INDEX,
    ],
  },
  [GroupUUIDEnum.INFERENCE]: {
    [GroupUUIDEnum.QUERY_PROCESSING]: [
      GroupUUIDEnum.INTENT_DETECTION,
      GroupUUIDEnum.QUERY_DECOMPOSITION,
      GroupUUIDEnum.QUERY_AUGMENTATION,
    ],
    [GroupUUIDEnum.RETRIEVAL]: [
      GroupUUIDEnum.ITERATIVE_RETRIEVAL,
      GroupUUIDEnum.MEMORY,
      GroupUUIDEnum.MULTI_HOP_REASONING,
      GroupUUIDEnum.RANKING,
    ],
    [GroupUUIDEnum.RESPONSE_GENERATION]: [
      GroupUUIDEnum.CONTEXTUALIZATION,
      GroupUUIDEnum.RESPONSE_SYNTHESIS,
      GroupUUIDEnum.ANSWER_ENRICHMENT,
      GroupUUIDEnum.RESPONSE_FORMATTING,
    ],
  },
};
