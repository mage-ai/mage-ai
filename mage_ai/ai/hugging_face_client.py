import json
import os
import re
from typing import Dict

import requests

from mage_ai.ai.ai_client import AIClient
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_preparation.models.constants import (
    BlockLanguage,
    BlockType,
    PipelineType,
)
from mage_ai.io.base import DataSource
from mage_ai.orchestration.ai.config import HuggingFaceConfig

headers = {
    "Content-Type": "application/json"
}

PROMPT_FOR_FUNCTION_PARAMS = """
Based on the code description, answer each question.

`code description: {code_description}`

Question BlockType: What is the purpose of the code? Choose one result from:
['data_loa der', 'data_exporter', 'transformer'].
If the code wants to read data from a data source, it is "data_loader".
If it wants to export data into a data source, it is "data_exporter".
For the rest manipulation data actions, it is "transformer".

Question BlockLanguage: What is the intended programming language for this code?
The default value is Python, but choose one result from: {block_languages}.

Question PipelineType: What is the pipeline type? The default value is Python,
but choose one result from: {pipeline_types}.

Question ActionType: If BlockType is transformer, what is the action this code tries to perform?
Choose one result from: {action_types}

Question DataSource: If BlockType is data_loader or data_exporter, where the data loads from or
export to? Choose one result from: {data_sources}

Return your responses in JSON format with the question name as the key and
the answer as the value.
"""


class HuggingFaceClient(AIClient):
    """
    This HuggingFaceClient is calling a Hugging Face Inference API endpoint
    with API endpoint and API token: https://huggingface.co/inference-endpoints.

    The model tested and verified is mistral-7b-instruct-v0.1.
    """
    def __init__(self, hf_config: HuggingFaceConfig):
        self.api_token = hf_config.huggingface_inference_api_token \
            or os.getenv('HUGGINGFACE_INFERENCE_API_TOKEN')
        self.api = hf_config.huggingface_api or \
            os.getenv('HUGGINGFACE_API')
        print(f'Using Hugging Face API: {self.api}')

    def __parse_function_args(self, function_args: Dict):
        try:
            block_type = BlockType(function_args[f'Question {BlockType.__name__}'])
        except ValueError:
            raise Exception(f'Error not valid BlockType: \
                  {function_args.get(f"Question {BlockType.__name__}")}')
        try:
            block_language = BlockLanguage(
                                    function_args.get(
                                        f'Question {BlockLanguage.__name__}',
                                        'python'))
        except ValueError:
            print(f'Error not valid BlockLanguage: \
                  {function_args.get(f"Question {BlockLanguage.__name__}")}')
            block_language = BlockLanguage.PYTHON
        try:
            pipeline_type = PipelineType(
                                    function_args.get(
                                        f'Question {PipelineType.__name__}',
                                        'python'))
        except ValueError:
            print(f'Error not valid PipelineType: \
                  {function_args.get(f"Question {PipelineType.__name__}")}')
            pipeline_type = PipelineType.PYTHON
        config = {}
        if block_type == BlockType.TRANSFORMER:
            try:
                config['action_type'] = ActionType(
                                            function_args.get(
                                                f'Question {ActionType.__name__}'))
            except ValueError:
                print(f'Error not valid ActionType: \
                    {function_args.get(f"Question {ActionType.__name__}")}')
                config['action_type'] = None
            if config['action_type']:
                if config['action_type'] in [
                    ActionType.FILTER,
                    ActionType.DROP_DUPLICATE,
                    ActionType.REMOVE,
                    ActionType.SORT
                ]:
                    config['axis'] = Axis.ROW
                else:
                    config['axis'] = Axis.COLUMN
        if block_type == BlockType.DATA_EXPORTER or block_type == BlockType.DATA_LOADER:
            try:
                config['data_source'] = DataSource(
                                            function_args.get(
                                                f'Question {DataSource.__name__}'))
            except ValueError:
                print(f'Error not valid DataSource: \
                    {function_args.get(f"Question {DataSource.__name__}")}')
        output = {}
        output['block_type'] = block_type
        output['block_language'] = block_language
        output['pipeline_type'] = pipeline_type
        output['config'] = config
        return output

    async def inference_with_prompt(
            self,
            variable_values: Dict[str, str],
            prompt_template: str,
            is_json_response: bool = True
    ):
        formated_prompt = prompt_template.format(**variable_values)
        data = json.dumps({
            'inputs': formated_prompt,
            'parameters': {
                'return_full_text': False,
                'max_new_tokens': 800,
                'num_return_sequences': 1}})
        headers.update(
            {'Authorization': f'Bearer {self.api_token}'})
        response = requests.post(self.api, headers=headers, data=data)
        response_json = response.json()
        if 'error' in response_json:
            if response_json['error'] == 'Bad Gateway':
                raise Exception('Error hugging face endpoint Bad Gateway. \
                                Please start hugging face inference endpoint.')
            print(f'Unexpected error from hugging face: {response_json["error"]}')
            return ""
        generated_text = response.json()[0]['generated_text'].lstrip('\n')
        if is_json_response:
            # Clean up unexpected JSON format.
            generated_text = re.sub(r'^```json', '', generated_text)
            generated_text = re.sub(r'```$', '', generated_text)
            generated_text = re.sub(r'"""', '"', generated_text)
            return json.loads(generated_text, strict=False)
        return generated_text

    async def find_block_params(
            self,
            block_description: str):
        variable_values = dict()
        variable_values['code_description'] = block_description
        variable_values['block_languages'] = \
            [f'{type.name.lower()}' for type in BlockLanguage]
        variable_values['pipeline_types'] = \
            [f'{type.name.lower()}' for type in PipelineType]
        variable_values['action_types'] = \
            [f'{type.name.lower()}' for type in ActionType]
        variable_values['data_sources'] = \
            [f"{type.name.lower()}" for type in DataSource]
        function_params_response = await self.inference_with_prompt(
            variable_values, PROMPT_FOR_FUNCTION_PARAMS, is_json_response=True)
        return self.__parse_function_args(function_params_response)
