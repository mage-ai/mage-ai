import { BlockLanguageEnum, BlockTypeEnum } from './BlockType';

export enum LLMUseCaseEnum {
  GENERATE_BLOCK_WITH_DESCRIPTION = 'generate_block_with_description',
  GENERATE_COMMENT_FOR_BLOCK = 'generate_comment_for_block',
  GENERATE_DOC_FOR_BLOCK = 'generate_doc_for_block',
  GENERATE_DOC_FOR_PIPELINE = 'generate_doc_for_pipeline',
}

export default interface LLMType {
  request?: {
    block_description?: string;
    block_uuid?: string;
    pipeline_uuid?: string;
  };
  response?: {
    block_doc?: string;
    block_docs?: string[];
    block_type?: BlockTypeEnum;
    configuration?: {
       action_type?: string;
       data_source?: string;
    };
    content?: string;
    language?: BlockLanguageEnum;
    pipeline_doc?: string;
  };
  use_case?: LLMUseCaseEnum;
}
