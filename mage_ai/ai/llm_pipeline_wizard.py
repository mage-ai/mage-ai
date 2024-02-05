import ast
import asyncio
import json
import re
from typing import Dict, List

import astor
from jinja2.exceptions import TemplateNotFound
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

from mage_ai.ai.hugging_face_client import HuggingFaceClient
from mage_ai.ai.openai_client import OpenAIClient
from mage_ai.data_cleaner.transformer_actions.constants import ActionType
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import (
    NON_PIPELINE_EXECUTABLE_BLOCK_TYPES,
    AIMode,
    BlockLanguage,
    BlockType,
    PipelineType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_config, get_repo_path
from mage_ai.data_preparation.templates.template import (
    fetch_template_source,
    fetch_transformer_default_template,
    is_default_transformer_template,
)
from mage_ai.io.base import DataSource
from mage_ai.orchestration.ai.config import AIConfig
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
```{block_content}```"""

# Prompt to ask LLM to generate code based on the code description.
# Respond in JSON format.
PROMPT_FOR_CUSTOMIZED_CODE_IN_PYTHON = """
The content within the triple backticks is a code description.

Your task is to answer the following two questions.

1. Is there any filter logic mentioned in the description to remove rows or columns of the data?
If yes, write ONLY the filter logic as a if condition without "if" at beginning.
Return your response as one field in JSON format with the key "action_code".

2. Does the description mention any columns or rows to aggregrate on or group by?
If yes, list ONLY those columns in an array and return it as a field in JSON response
with the key "arguments".

<code description>: ```{code_description}```

Provide your response in JSON format.
"""

# Prompt to ask LLM to generate SQL code based on the code description.
# Respond in JSON format.
PROMPT_FOR_CUSTOMIZED_CODE_IN_SQL = """
The content within the triple backticks is a code description.
Implement it in SQL language.

<code description>: ```{code_description}```

Return your response in JSON format with the key "sql_code".
"""

# Prompt to ask LLM to generate code when base template is used.
# Respond in JSON format.
PROMPT_FOR_CUSTOMIZED_CODE_WITH_BASE_TEMPLATE = """
The content within the triple backticks is a code description.
Implement it in {code_language} language.

<code description>: ```{code_description}```

Provide your response in JSON format with the key "code".
"""
PROMPT_TO_SPLIT_BLOCKS = """
A BLOCK does one action either reading data from one data source, transforming the data from
one format to another or exporting data into a data source.
Based on the code description delimited by triple backticks, your task is to identify
how many BLOCKS required, function for each BLOCK and upstream blocks between BLOCKs.

Use the following format:
BLOCK 1: function: <block function>. upstream: <upstream blocks>
BLOCK 2: function: <block function>. upstream: <upstream blocks>
BLOCK 3: function: <block function>. upstream: <upstream blocks>
...

Example:
<code description>: ```
Read data from MySQL and Postgres, filter out rows with book_price > 100, and save data to BigQuery.
```

Answer:
BLOCK 1: function: load data from MySQL. upstream:
BLOCK 2: function: load data from Postgres. upstream:
BLOCK 3: function: filter out rows with book_price > 100. upstream: 1, 2
BLOCK 4: function: export data to BigQuery. upstream: 3

<code description>: ```{code_description}```"""
PROMPT_FOR_FUNCTION_COMMENT = """
The content within the triple backticks is a code block.
Your task is to write comments for each function inside.

```{block_content}```

The comment should follow Google Docstring format.
Return your response in JSON format with function name as key and the comment as value.
"""
BLOCK_SPLIT_PATTERN = r"BLOCK\s+(\w+):\s+function:\s+(.*?)\.\s+upstream:\s*(.*?)$"
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


class LLMPipelineWizard:
    def __init__(self):
        ai_config = AIConfig.load(config=get_repo_config().ai_config)
        if ai_config.mode == AIMode.OPEN_AI:
            self.client = OpenAIClient(ai_config.open_ai_config)
        elif ai_config.mode == AIMode.HUGGING_FACE:
            self.client = HuggingFaceClient(ai_config.hugging_face_config)
        else:
            raise Exception('AI Mode is not available.')

    async def __async_llm_call(
        self,
        variable_values: Dict[str, str],
        prompt_template: str,
        is_json_response: bool = True,
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
            return json.loads(await chain.arun(variable_values))
        return await chain.arun(variable_values)

    async def __async_create_customized_code_in_block(
            self,
            block_code: str,
            block_language: str,
            code_description: str) -> str:
        """
        Based on the code description to generate code.
        It supports both python or SQL languages.
        """
        variable_values = dict()
        variable_values['code_description'] = code_description
        if block_language == BlockLanguage.PYTHON:
            customized_logic = await self.client.inference_with_prompt(
                variable_values,
                PROMPT_FOR_CUSTOMIZED_CODE_IN_PYTHON
            )
            if 'action_code' in customized_logic.keys() \
                and customized_logic.get('action_code') \
                    and "null" != customized_logic.get('action_code'):
                block_code = block_code.replace(
                    'action_code=\'\'',
                    f'action_code=\'{customized_logic.get("action_code")}\'')
            if 'arguments' in customized_logic.keys():
                block_code = block_code.replace(
                    'arguments=[]',
                    f'arguments={customized_logic.get("arguments")}')
        elif block_language == BlockLanguage.SQL:
            customized_logic = await self.client.inference_with_prompt(
                variable_values,
                PROMPT_FOR_CUSTOMIZED_CODE_IN_SQL
            )
            if 'sql_code' in customized_logic.keys():
                block_code = f'{block_code}\n{customized_logic.get("sql_code")}'
        return block_code

    async def generate_code_async(
        self,
        block_description: str,
        code_language: BlockLanguage,
        block_type: BlockType = None,
    ) -> Dict:
        resp = await self.client.inference_with_prompt(
            dict(
                code_description=block_description,
                code_language=code_language,
            ),
            PROMPT_FOR_CUSTOMIZED_CODE_WITH_BASE_TEMPLATE,
        )

        if not block_type:
            return resp

        code = resp.get('code')
        if code:
            block_code = fetch_template_source(
                block_type=block_type,
                config=dict(existing_code='\n'.join([f'    {line}' for line in code.split('\n')])),
                language=code_language,
            )

            return dict(
                code=code,
                content=block_code,
                block_type=block_type,
                language=code_language,
            )

    async def async_generate_block_with_description(
            self,
            block_description: str,
            upstream_blocks: List[str] = None) -> dict:
        function_params = await self.client.find_block_params(block_description)
        block_type = function_params['block_type']
        block_language = function_params['block_language']
        pipeline_type = function_params['pipeline_type']
        config = function_params['config']
        variable_values = dict()
        variable_values['code_description'] = block_description
        variable_values['code_language'] = block_language
        if is_default_transformer_template(config):
            customized_logic = await self.client.inference_with_prompt(
                variable_values,
                PROMPT_FOR_CUSTOMIZED_CODE_WITH_BASE_TEMPLATE
            )
            if 'code' in customized_logic.keys():
                config['existing_code'] = customized_logic.get('code')
            block_code = fetch_template_source(
                    block_type=block_type,
                    config=config,
                    language=block_language,
                    pipeline_type=pipeline_type,
                )
        else:
            try:
                block_code_template = fetch_template_source(
                        block_type=block_type,
                        config=config,
                        language=block_language,
                        pipeline_type=pipeline_type,
                    )
                block_code = await self.__async_create_customized_code_in_block(
                    block_code_template,
                    block_language,
                    block_description)
            except TemplateNotFound:
                # Use default template if template not found and
                # ask LLM to fully generate the customized code.
                customized_logic = await self.client.inference_with_prompt(
                    variable_values,
                    PROMPT_FOR_CUSTOMIZED_CODE_WITH_BASE_TEMPLATE
                )
                if 'code' in customized_logic.keys():
                    block_code = fetch_transformer_default_template(
                        customized_logic.get('code'))

        return dict(
            block_type=block_type,
            configuration=config,
            content=block_code,
            language=block_language,
            upstream_blocks=upstream_blocks,
        )

    async def __async_generate_blocks(self,
                                      block_dict: dict,
                                      block_id: int,
                                      block_description: str,
                                      upstream_blocks: [str]) -> dict:
        block = await self.async_generate_block_with_description(block_description, upstream_blocks)
        block_dict[block_id] = block

    async def async_generate_pipeline_from_description(self, pipeline_description: str) -> dict:
        variable_values = dict()
        variable_values['code_description'] = pipeline_description
        splited_block_descriptions = await self.client.inference_with_prompt(
            variable_values,
            PROMPT_TO_SPLIT_BLOCKS,
            is_json_response=False,
        )
        blocks = {}
        block_tasks = []
        for line in splited_block_descriptions.strip().split('\n'):
            if line.startswith('BLOCK') and ':' in line:
                # Extract the block_id and block_description from the line
                match = re.search(BLOCK_SPLIT_PATTERN, line)
                if match:
                    block_id = match.group(1)
                    block_description = match.group(2).strip()
                    upstream_blocks = match.group(3).split(', ')
                    block_tasks.append(
                        self.__async_generate_blocks(
                            blocks,
                            block_id,
                            block_description,
                            upstream_blocks))
        await asyncio.gather(*block_tasks)
        return blocks

    def __insert_comments_in_functions(self, code: str, function_comments: Dict):
        # Parse the input code into an abstract syntax tree (AST).
        tree = ast.parse(code)
        # Traverse the AST and find function definitions.
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                function_name = node.name
                if function_comments.get(function_name):
                    comment_text = function_comments[function_name]
                    # Insert a comment node below a given node.
                    if isinstance(node.body[0], ast.Expr) and \
                       isinstance(node.body[0].value, ast.Constant):
                        # If there is existing doc string, combine the new comment with it.
                        existing_comment_node = node.body[0]
                        existing_comment_text = node.body[0].value.value
                        new_comment = ast.Expr(
                            value=ast.Str(s=f"{comment_text}\n{existing_comment_text}"))
                        node.body.remove(existing_comment_node)
                    else:
                        # Add newly generated doc string.
                        new_comment = ast.Expr(value=ast.Str(s=comment_text))
                    node.body.insert(0, new_comment)
        return astor.to_source(tree)

    async def async_generate_comment_for_block(self, block_content: str) -> str:
        variable_values = dict()
        variable_values['block_content'] = block_content
        function_comments = await self.client.inference_with_prompt(
            variable_values,
            PROMPT_FOR_FUNCTION_COMMENT
        )
        return self.__insert_comments_in_functions(block_content, function_comments)

    async def async_generate_doc_for_pipeline(
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
            async_block_docs.append(self.__async_generate_doc_for_block(block))
        block_docs = await asyncio.gather(*async_block_docs)
        block_docs_content = '\n'.join(block_docs)
        if print_block_doc:
            print(block_docs_content)
        variable_values = dict()
        variable_values['block_content'] = block_docs_content
        pipeline_doc = await self.client.inference_with_prompt(
                variable_values,
                PROMPT_FOR_SUMMARIZE_BLOCK_DOC,
                is_json_response=False
            )
        return dict(
            block_docs=block_docs,
            pipeline_doc=pipeline_doc,
        )

    async def async_generate_doc_for_block(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        project_path: str = None,
    ) -> str:
        pipeline = Pipeline.get(uuid=pipeline_uuid,
                                repo_path=project_path or get_repo_path())
        return await self.__async_generate_doc_for_block(pipeline.get_block(block_uuid))

    async def __async_generate_doc_for_block(
        self,
        block: Block,
    ) -> str:
        add_on_prompt = ''
        if block.type == BlockType.TRANSFORMER:
            add_on_prompt = 'Focus on the customized business logic in execute_transformer_action' \
                            'function.'
        variable_values = dict()
        # Remove the @test function so hugging face can generate documentation.
        variable_values['block_content'] = re.sub(
            r'\s*\n*\s*@test.*', '', block.content, flags=re.DOTALL)
        variable_values['file_type'] = BLOCK_LANGUAGE_TO_FILE_TYPE_VARIABLE.get(block.language, "")
        variable_values['purpose'] = BLOCK_TYPE_TO_PURPOSE_VARIABLE.get(block.type, "")
        variable_values['add_on_prompt'] = add_on_prompt
        return await self.client.inference_with_prompt(
            variable_values, PROMPT_FOR_BLOCK, is_json_response=False)
