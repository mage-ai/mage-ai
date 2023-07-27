import asyncio
import json

import openai
from langchain.chains import LLMChain
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate

from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import (
    NON_PIPELINE_EXECUTABLE_BLOCK_TYPES,
    BlockLanguage,
    BlockType,
    PipelineType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.templates.template import fetch_template_source
from mage_ai.io.base import DataSource
from mage_ai.server.logger import Logger

logger = Logger().new_server_logger(__name__)

BLOCK_LANGUAGE_TO_FILE_TYPE_VARIABLE = {
    BlockLanguage.MARKDOWN: 'markdown script',
    BlockLanguage.PYTHON: 'python script',
    BlockLanguage.R: 'R script',
    BlockLanguage.SQL: 'sql script',
    BlockLanguage.YAML: 'yaml configuration',
}
BLOCK_TYPE_TO_PURPOSE_VARIABLE = {
    BlockType.DATA_LOADER: "load data from a specific data source.",
    BlockType.DATA_EXPORTER: "export data to a specific data source.",
    BlockType.TRANSFORMER: "transform data from one format into different format.",
}
DATA_LOADERS_FOLDER = 'data_loaders'
DATA_EXPORTERS_FOLDER = 'data_exporters'
PROMPT_FOR_BLOCK = """
The {file_type} delimited by triple backticks is used to {purpose}.
Write a documentation based on the {file_type}. {add_on_prompt}
Ignore the imported libraries and the @test decorator.
```{block_content}```"""
PROMPT_FOR_SUMMARIZE_BLOCK_DOC = """
A data pipeline reads data from source, transform the data and export data into another source.
The content delimited by triple backticks contains explains of all components in one data pipeline.
Write a detailed summarization of the data pipeline based on the content provided.
```{block_content}```
"""
TRANSFORMERS_FOLDER = 'transformers'
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
                    "enum": ["data_exporter", "data_loader", "transformer"]
                },
                BlockLanguage.__name__: {
                    "type": "string",
                    "description": "Programming language of the code block.",
                    "enum": [type.name.lower() for type in BlockLanguage]
                },
                PipelineType.__name__: {
                    "type": "string",
                    "description": "Type of pipeline description to build.",
                    "enum": [type.name.lower() for type in PipelineType]
                },
                ActionType.__name__: {
                    "type": "string",
                    "description": f"If {BlockType.__name__} is transformer, "
                                   f"{ActionType.__name__} specifies what kind "
                                   "of action the code performs.",
                    "enum": [type.name.lower() for type in ActionType]
                },
                DataSource.__name__: {
                    "type": "string",
                    "description": f"If {BlockType.__name__} is data_loader or "
                                   f"data_exporter, {DataSource.__name__} field specify "
                                   "where the data loads from or exports to.",
                    "enum": [type.name.lower() for type in DataSource]
                },
            },
            "required": [BlockType.__name__, BlockLanguage.__name__, PipelineType.__name__],
        },
    }
]


class LLMPipelineWizard:
    def __init__(self):
        self.llm = OpenAI(temperature=0)

    async def __async_llm_generate_documentation(
        self,
        block_content: str,
        file_type: str,
        purpose: str,
        template: str,
        add_on_prompt: str = '',
    ):
        prompt_template = PromptTemplate(
            input_variables=[
                'block_content',
                'file_type',
                'purpose',
                'add_on_prompt'
            ],
            template=template,
        )
        chain = LLMChain(llm=self.llm, prompt=prompt_template)
        return await chain.arun(block_content=block_content,
                                file_type=file_type,
                                purpose=purpose,
                                add_on_prompt=add_on_prompt)

    def __load_template_params(self, function_args: json):
        block_type = BlockType(function_args[BlockType.__name__].lower())
        block_language = BlockLanguage(
                            function_args.get(BlockLanguage.__name__, "python").lower())
        pipeline_type = PipelineType(function_args.get(PipelineType.__name__, "python").lower())
        config = {}
        config['action_type'] = function_args.get(ActionType.__name__, None)
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
        config['data_source'] = function_args.get(DataSource.__name__, None)
        return block_type, block_language, pipeline_type, config

    async def async_generate_block_with_description(self, block_description: str) -> dict:
        messages = [{"role": "user", "content": block_description}]
        response = await openai.ChatCompletion.acreate(
            model="gpt-3.5-turbo-0613",
            messages=messages,
            functions=TEMPLATE_CLASSIFICATION_FUNCTION,
            function_call={"name": CLASSIFICATION_FUNCTION_NAME},  # explicitly set function call
        )
        response_message = response["choices"][0]["message"]
        if response_message.get("function_call"):
            function_args = json.loads(response_message["function_call"]["arguments"])
            block_type, block_language, pipeline_type, config = self.__load_template_params(
                function_args)
            return dict(
                block_type=block_type,
                configuration=config,
                content=fetch_template_source(
                    block_type=block_type,
                    config=config,
                    language=block_language,
                    pipeline_type=pipeline_type,
                ),
                language=block_language,
            )
        else:
            logger.error("Failed to interpret the description as a block template.")
            return None

    async def async_generate_pipeline_documentation(
        self,
        pipeline_uuid: str,
        project_path: str = None,
        print_block_doc: bool = False,
    ) -> dict:
        pipeline = Pipeline.get(
            uuid=pipeline_uuid,
            repo_path=project_path or get_repo_path(),
        )
        async_block_docs = []
        for block in pipeline.blocks_by_uuid.values():
            if block.type in NON_PIPELINE_EXECUTABLE_BLOCK_TYPES:
                continue
            async_block_docs.append(self.__async_generate_block_documentation(block))
        block_docs = await asyncio.gather(*async_block_docs)
        block_docs_content = '\n'.join(block_docs)
        if print_block_doc:
            print(block_docs_content)
        prompt_template = PromptTemplate(input_variables=['block_content'],
                                         template=PROMPT_FOR_SUMMARIZE_BLOCK_DOC)
        chain = LLMChain(llm=self.llm, prompt=prompt_template)
        pipeline_doc = chain.run(block_content=block_docs_content)
        return dict(
            block_docs=block_docs,
            pipeline_doc=pipeline_doc,
        )

    async def async_generate_block_documentation_with_name(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        project_path: str = None,
    ) -> str:
        pipeline = Pipeline.get(uuid=pipeline_uuid,
                                repo_path=project_path or get_repo_path())
        return asyncio.run(
            self.__async_generate_block_documentation(pipeline.get_block(block_uuid)))

    async def __async_generate_block_documentation(
        self,
        block: Block,
    ) -> str:
        add_on_prompt = ""
        if block.type == BlockType.TRANSFORMER:
            add_on_prompt = "Focus on the customized business logic in execute_transformer_action \
                             function."
        return await self.__async_llm_generate_documentation(
                    block.content,
                    BLOCK_LANGUAGE_TO_FILE_TYPE_VARIABLE[block.language],
                    BLOCK_TYPE_TO_PURPOSE_VARIABLE.get(block.type, ""),
                    PROMPT_FOR_BLOCK,
                    add_on_prompt
                )
