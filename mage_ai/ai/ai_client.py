from typing import Dict


class AIClient():
    async def inference_with_prompt(
            self,
            variable_values: Dict[str, str],
            prompt_template: str,
            is_json_response: bool = True
    ):
        """
        Infers with Large Language Model with prompt and variables

        Args:
            variable_values: variables to be used in the prompt.
            prompt_template: prompt template to be used to fill with variables for inference.
            is_json_response: whether the response is in json format or not.

        Returns:
            We typically suggest response in JSON format. For example:
                {
                    'action_code': 'grade == 5 or grade == 6',
                    'arguments': ['class']
                }
        """
        raise Exception('Subclasses must override this method.')

    async def find_block_params(
            self,
            block_description: str
    ):
        """
        Based on the block descriptionn, find the block type,
        block language, pipeline type, and config for this block.

        Args:
          block_description: description of the block functions.

        Returns:
          return the response in JSON format with following keys:
            block_type: type of the block: data_loader, transfomer or data_exporter.
            block_language: language of the block.
            pipeline_type: type of the pipeline.
            config: config of the block. It is a JSON including "action_type", "data_source".
        """
        raise Exception('Subclasses must override this method.')
