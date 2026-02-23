import asyncio
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

PROMPT_FOR_BLOCK_TYPE = """
<s>[INST]Classify code desription into one of the following categories:
"data_loader" - The code is designed to read data from a data source.
"data_exporter" - The code is intended to export data into a data source.
"transformer" - The code performs various data manipulation actions.[/INST]</s>
<s>[INST]classify code description: Read data from MySQL database[/INST]type: data_loader</s>
<s>[INST]classify code description: export data to Postgres database[/INST]type: data_exporter</s>
<s>[INST]classify code description: filter all the records by age smaller \
    than 100[/INST]\type: transformer</s>
[INST]classify code description: {code_description}[/INST]
"""

PROMPT_FOR_BLOCK_LANGUAGE = """
<s>[INST]what is the programming language mentioned in the code description?
The default value is python, choose one result from: {block_languages}[/INST]</s>
<s>[INST]code description: Read data from MySQL database [/INST]programming language: python</s>
<s>[INST]code description: export data to Postgres database in SQL \
    [/INST]programming language: sql</s>
<s>[INST]code description: write a yaml config to filter all the records by age smaller than 100\
    [/INST]programming language: yaml</s>
<s>[INST]code description: filter all the records by age [/INST]programming language: python</s>
[INST]code description: {code_description}[/INST]
"""

PROMPT_FOR_PIPELINE_TYPES = """
<s>[INST]what is the pipeline type in the code description?
The default value is python, but choose one result from \
    following pipeline type: {pipeline_types}.[/INST]</s>
<s>[INST]code description: Read data from MySQL database[/INST]type: python</s>
<s>[INST]code description: export data to Postgres database using a integration pipeline\
    [/INST]type: integration</s>
<s>[INST]code description: stream filter all the records[/INST]type: streaming</s>
<s>[INST]code description: using pyspark pipeline to dedup same records[/INST]type: pyspark</s>
[INST]code description: {code_description}[/INST]
"""

PROMPT_FOR_ACTION_TYPE = """
<s>[INST]what is the action this code description tries to perform?
Choose one result from following action: {action_types}.[/INST]</s>
<s>[INST]code description: average all the score [/INST]action: average</s>
<s>[INST]code description: count number of distinct value [/INST]action: count_distinct</s>
<s>[INST]code description: return the first record [/INST]action: first</s>
<s>[INST]code description: return 5 records [/INST]action: limit</s>
<s>[INST]code description: return the biggest number of score [/INST]action: max</s>
[INST]code description: {code_description}[/INST]
"""

PROMPT_FOR_DATA_SOURCE = """
<s>[INST]where the data source loads from or export to in the code description?
Choose one result from following data sources: {data_sources}.[/INST]</s>
<s>[INST]code description: export data to mysql database[/INST]source: mysql</s>
<s>[INST]code description: read data from sqlserver[/INST]source: sqlserver</s>
<s>[INST]code description: fetch data from opensearch[/INST]source: opensearch</s>
<s>[INST]code description: wrtie all records to google sheets[/INST]source: google_sheets</s>
[INST]code description: {code_description}[/INST]
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
            block_type = BlockType(function_args[f'{BlockType.__name__}'])
        except ValueError:
            raise Exception(f'Error not valid BlockType: \
                  {function_args.get(f"{BlockType.__name__}")}')
        try:
            block_language = BlockLanguage(
                                    function_args.get(
                                        f'{BlockLanguage.__name__}',
                                        'python'))
        except ValueError:
            print(f'Error not valid BlockLanguage: \
                  {function_args.get(f"{BlockLanguage.__name__}")}')
            block_language = BlockLanguage.PYTHON
        try:
            pipeline_type = PipelineType(
                                    function_args.get(
                                        f'{PipelineType.__name__}',
                                        'python'))
        except ValueError:
            print(f'Error not valid PipelineType: \
                  {function_args.get(f"{PipelineType.__name__}")}')
            pipeline_type = PipelineType.PYTHON
        config = {}
        if block_type == BlockType.TRANSFORMER:
            try:
                config['action_type'] = ActionType(
                                            function_args.get(
                                                f'{ActionType.__name__}'))
            except ValueError:
                print(f'Error not valid ActionType: \
                    {function_args.get(f"{ActionType.__name__}")}')
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
                                                f'{DataSource.__name__}'))
            except ValueError:
                print(f'Error not valid DataSource: \
                    {function_args.get(f"{DataSource.__name__}")}')
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
            is_json_response: bool = True,
            max_new_tokens: int = 800
    ):
        formated_prompt = prompt_template.format(**variable_values)
        data = json.dumps({
            'inputs': formated_prompt,
            'parameters': {
                'temperature': 0.01,
                'return_full_text': False,
                'max_new_tokens': max_new_tokens,
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
        function_params = (
            'block_type',
            'block_language',
            'pipeline_types',
        )
        tasks = []
        tasks.append(asyncio.create_task(self.inference_with_prompt(
            variable_values,
            PROMPT_FOR_BLOCK_TYPE,
            is_json_response=False,
            max_new_tokens=8)))
        tasks.append(asyncio.create_task(self.inference_with_prompt(
            variable_values,
            PROMPT_FOR_BLOCK_LANGUAGE,
            is_json_response=False,
            max_new_tokens=5)))
        tasks.append(asyncio.create_task(self.inference_with_prompt(
            variable_values,
            PROMPT_FOR_PIPELINE_TYPES,
            is_json_response=False,
            max_new_tokens=5)))

        results = await asyncio.gather(*tasks)
        function_params_response = dict(zip(function_params, results))

        # Remove prefix:
        function_params_response['block_type'] = \
            function_params_response['block_type'].replace('type: ', '', 1)
        function_params_response['block_language'] = \
            function_params_response['block_language'].replace('programming language: ', '', 1)
        function_params_response['pipeline_types'] = \
            function_params_response['pipeline_types'].replace('type: ', '', 1)

        # Generate data source and action type
        data_source = ''
        action_type = ''
        if function_params_response['block_type'] == 'data_loader' or \
                function_params_response['block_type'] == 'data_exporter':
            data_source = await self.inference_with_prompt(
                variable_values,
                PROMPT_FOR_DATA_SOURCE,
                is_json_response=False,
                max_new_tokens=5)
            data_source = data_source.replace('source: ', '', 1)
        elif function_params_response['block_type'] == 'transformer':
            action_type = await self.inference_with_prompt(
                variable_values,
                PROMPT_FOR_ACTION_TYPE,
                is_json_response=False,
                max_new_tokens=5)
            action_type = action_type.replace('action: ', '', 1)

        function_params_response = {
            f'{BlockType.__name__}': function_params_response['block_type'],
            f'{BlockLanguage.__name__}': function_params_response['block_language'],
            f'{PipelineType.__name__}': function_params_response['pipeline_types'],
            f'{ActionType.__name__}': action_type,
            f'{DataSource.__name__}': data_source
        }
        return self.__parse_function_args(function_params_response)
