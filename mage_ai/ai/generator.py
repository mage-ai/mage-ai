from typing import Dict

from mage_ai.ai.constants import LLMUseCase


class Generator:
    @classmethod
    async def generate(self, use_case: LLMUseCase, request: Dict) -> Dict:
        if use_case == LLMUseCase.GENERATE_DOC_FOR_BLOCK:
            from mage_ai.ai.llm_pipeline_wizard import LLMPipelineWizard

            pipeline_uuid = request.get('pipeline_uuid')
            block_uuid = request.get('block_uuid')
            return dict(
                block_doc=await LLMPipelineWizard().async_generate_doc_for_block(
                    pipeline_uuid,
                    block_uuid
                )
            )
        elif use_case == LLMUseCase.GENERATE_DOC_FOR_PIPELINE:
            from mage_ai.ai.llm_pipeline_wizard import LLMPipelineWizard

            pipeline_uuid = request.get('pipeline_uuid')
            return await LLMPipelineWizard().async_generate_doc_for_pipeline(
                pipeline_uuid,
            )
        elif use_case == LLMUseCase.GENERATE_BLOCK_WITH_DESCRIPTION:
            from mage_ai.ai.llm_pipeline_wizard import LLMPipelineWizard

            return await LLMPipelineWizard().async_generate_block_with_description(
                request.get('block_description'),
            )
        elif use_case == LLMUseCase.GENERATE_PIPELINE_WITH_DESCRIPTION:
            from mage_ai.ai.llm_pipeline_wizard import LLMPipelineWizard

            return await LLMPipelineWizard().async_generate_pipeline_from_description(
                request.get('pipeline_description'),
            )
        elif use_case == LLMUseCase.GENERATE_COMMENT_FOR_CODE:
            from mage_ai.ai.llm_pipeline_wizard import LLMPipelineWizard

            return await LLMPipelineWizard().async_generate_comment_for_block(
                request.get('block_code'),
            )
        elif LLMUseCase.GENERATE_CODE == use_case:
            from mage_ai.ai.llm_pipeline_wizard import LLMPipelineWizard

            return await LLMPipelineWizard().generate_code_async(
                request.get('block_description'),
                request.get('code_language'),
                block_type=request.get('block_type'),
            )

        raise Exception(f'Use case {use_case} is not supported yet.')
