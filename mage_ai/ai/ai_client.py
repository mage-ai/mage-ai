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
