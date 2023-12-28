import json
import os
from typing import Dict

import openai
from langchain.chains import LLMChain
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate

from mage_ai.ai.ai_client import AIClient
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_preparation.models.constants import (
    BlockLanguage,
    BlockType,
    PipelineType,
)
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.io.base import DataSource
from mage_ai.orchestration.ai.config import OpenAIConfig

CLASSIFICATION_FUNCTION_NAME = "classify_description"
TEMPLATE_CLASSIFICATION_FUNCTION = [
    {
        "name": CLASSIFICATION_FUNCTION_NAME,
        "description": "Classify the code description provided into following properties.",
        "parameters": {
            "type": "object",
            "properties": {
                BlockType.__name__: {
                    "type": "string",
                    "description": "Type of the code block. It either "
                                   "loads data from a source, export data to a source "
                                   "or transform data from one format to another.",
                    "enum": [f"{BlockType.__name__}__data_exporter",
                             f"{BlockType.__name__}__data_loader",
                             f"{BlockType.__name__}__transformer"]
                },
                BlockLanguage.__name__: {
                    "type": "string",
                    "description": "Programming language of the code block. "
                                   f"Default value is {BlockLanguage.__name__}__python.",
                    "enum": [f"{BlockLanguage.__name__}__{type.name.lower()}"
                             for type in BlockLanguage]
                },
                PipelineType.__name__: {
                    "type": "string",
                    "description": "Type of pipeline to build. Default value is "
                                   f"{PipelineType.__name__}__python if pipeline type "
                                   "is not mentioned in the description.",
                    "enum": [f"{PipelineType.__name__}__{type.name.lower()}"
                             for type in PipelineType]
                },
                ActionType.__name__: {
                    "type": "string",
                    "description": f"If {BlockType.__name__} is transformer, "
                                   f"{ActionType.__name__} specifies what kind "
                                   "of action the code performs.",
                    "enum": [f"{ActionType.__name__}__{type.name.lower()}" for type in ActionType]
                },
                DataSource.__name__: {
                    "type": "string",
                    "description": f"If {BlockType.__name__} is data_loader or "
                                   f"data_exporter, {DataSource.__name__} field specify "
                                   "where the data loads from or exports to.",
                    "enum": [f"{DataSource.__name__}__{type.name.lower()}" for type in DataSource]
                },
            },
            "required": [BlockType.__name__, BlockLanguage.__name__, PipelineType.__name__],
        },
    }
]


class OpenAIClient(AIClient):
    def __init__(self, open_ai_config: OpenAIConfig):
        repo_config = get_repo_config()
        openai_api_key = repo_config.openai_api_key or \
            open_ai_config.openai_api_key or os.getenv('OPENAI_API_KEY')
        openai.api_key = openai_api_key
        self.llm = OpenAI(openai_api_key=openai_api_key, temperature=0)

    async def inference_with_prompt(
            self,
            variable_values: Dict[str, str],
            prompt_template: str,
            is_json_response: bool = True
    ):
        """Generic function to call OpenAI LLM and return JSON response by default.

        Fill variables and values into template, and run against LLM
        to genenrate JSON format response.

        Args:
            variable_values: all required variable and values in prompt.
            prompt_template: prompt template for LLM call.
            is_json_response: default is json formatted response.

        Returns:
            We typically suggest response in JSON format. For example:
                {
                    'action_code': 'grade == 5 or grade == 6',
                    'arguments': ['class']
                }
        """
        filled_prompt = PromptTemplate(
            input_variables=list(variable_values.keys()),
            template=prompt_template,
        )
        chain = LLMChain(llm=self.llm, prompt=filled_prompt)
        if is_json_response:
            resp = await chain.arun(variable_values)
            if resp:
                try:
                    return json.loads(resp)
                except json.decoder.JSONDecodeError as err:
                    print(f'[ERROR] OpenAIClient.inference_with_prompt {resp}: {err}.')
                    return resp
            else:
                return {}
        return await chain.arun(variable_values)

    def __parse_argument_value(self, value: str) -> str:
        if value is None:
            return None
        return value.lower().split('__')[1]

    def __load_template_params(self, function_args: json):
        block_type = BlockType(self.__parse_argument_value(function_args[BlockType.__name__]))
        block_language = BlockLanguage(
                            self.__parse_argument_value(
                                function_args.get(BlockLanguage.__name__)
                            ) or "python")
        pipeline_type = PipelineType(
                            self.__parse_argument_value(
                                function_args.get(PipelineType.__name__)
                            ) or "python")
        config = {}
        config['action_type'] = self.__parse_argument_value(
                                    function_args.get(ActionType.__name__))
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
        config['data_source'] = self.__parse_argument_value(
                                    function_args.get(DataSource.__name__))
        return block_type, block_language, pipeline_type, config

    async def find_block_params(
            self,
            block_description: str):
        messages = [{'role': 'user', 'content': block_description}]
        response = await openai.ChatCompletion.acreate(
            model='gpt-3.5-turbo-0613',
            messages=messages,
            functions=TEMPLATE_CLASSIFICATION_FUNCTION,
            function_call={'name': CLASSIFICATION_FUNCTION_NAME},  # explicitly set function call
        )
        response_message = response['choices'][0]['message']
        if response_message.get('function_call'):
            function_args = json.loads(response_message['function_call']['arguments'])
            block_type, block_language, pipeline_type, config = self.__load_template_params(
                function_args)
            output = {}
            output['block_type'] = block_type
            output['block_language'] = block_language
            output['pipeline_type'] = pipeline_type
            output['config'] = config
            return output
        else:
            raise Exception('Failed to interpret the description as a block template.')
