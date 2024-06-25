from mage_ai.frameworks.execution.models.enums import GroupUUID

GroupMapping = {
    GroupUUID.DATA_PREPARATION: {
        GroupUUID.LOAD: [GroupUUID.INGEST, GroupUUID.MAP],
        GroupUUID.TRANSFORM: [
            GroupUUID.CLEANING,
            GroupUUID.ENRICH,
            GroupUUID.CHUNKING,
            GroupUUID.TOKENIZATION,
            GroupUUID.EMBED,
        ],
        GroupUUID.EXPORT: [GroupUUID.VECTOR_DATABASE, GroupUUID.KNOWLEDGE_GRAPH],
        GroupUUID.INDEX: [
            GroupUUID.CONTEXTUAL_DICTIONARY,
            GroupUUID.DOCUMENT_HIERARCHY,
            GroupUUID.SEARCH_INDEX,
        ],
    },
    GroupUUID.INFERENCE: {
        GroupUUID.QUERY_PROCESSING: [
            GroupUUID.INTENT_DETECTION,
            GroupUUID.QUERY_DECOMPOSITION,
            GroupUUID.QUERY_AUGMENTATION,
        ],
        GroupUUID.RETRIEVAL: [
            GroupUUID.ITERATIVE_RETRIEVAL,
            GroupUUID.MEMORY,
            GroupUUID.MULTI_HOP_REASONING,
            GroupUUID.RANKING,
        ],
        GroupUUID.RESPONSE_GENERATION: [
            GroupUUID.CONTEXTUALIZATION,
            GroupUUID.RESPONSE_SYNTHESIS,
            GroupUUID.ANSWER_ENRICHMENT,
            GroupUUID.RESPONSE_FORMATTING,
        ],
    },
}
