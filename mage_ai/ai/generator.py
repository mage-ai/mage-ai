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
                block_doc=await LLMPipelineWizard().async_generate_block_documentation_with_name(
                    pipeline_uuid,
                    block_uuid
                )
            )
        elif use_case == LLMUseCase.GENERATE_DOC_FOR_PIPELINE:
            from mage_ai.ai.llm_pipeline_wizard import LLMPipelineWizard

            pipeline_uuid = request.get('pipeline_uuid')
            return await LLMPipelineWizard().async_generate_pipeline_documentation(
                pipeline_uuid,
            )

        raise Exception(f'Use case {use_case} is not supported yet.')
