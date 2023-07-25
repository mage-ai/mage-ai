from enum import Enum


class LLMUseCase(str, Enum):
    GENERATE_COMMENT_FOR_BLOCK = 'generate_comment_for_block'
    GENERATE_DOC_FOR_BLOCK = 'generate_doc_for_block'
    GENERATE_DOC_FOR_PIPELINE = 'generate_doc_for_pipeline'
    GENERATE_BLOCK_WITH_DESCRIPTION = 'generate_block_with_description'
