export enum LLMUseCaseEnum {
  GENERATE_BLOCK_WITH_DESCRIPTION = 'generate_block_with_description',
  GENERATE_DOC_FOR_BLOCK = 'generate_doc_for_block',
  GENERATE_DOC_FOR_PIPELINE = 'generate_doc_for_pipeline',
}

export default interface LLMType {
  request?: {
    block_description: string;
  };
  response?: string | {
    block_doc?: string;
    block_docs?: string[];
    pipeline_doc?: string;
  };
  use_case?: LLMUseCaseEnum;
}
