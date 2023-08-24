import ast
import asyncio
import json
import os
import re
from typing import Dict, List

import openai
from jinja2.exceptions import TemplateNotFound
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
from mage_ai.data_preparation.repo_manager import get_repo_config, get_repo_path
from mage_ai.data_preparation.templates.template import (
    fetch_template_source,
    fetch_transformer_default_template,
    is_default_transformer_template,
)
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
        repo_config = get_repo_config()
        openai_api_key = repo_config.openai_api_key or os.getenv('OPENAI_API_KEY')
        openai.api_key = openai_api_key
        self.llm = OpenAI(openai_api_key=openai_api_key, temperature=0)

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

    async def __async_llm_inferene_with_code_description_variable(
            self,
            code_description: str,
            template: str) -> Dict:
        """Calls LLM with prompt with template and code_description.

        Fill the code_description variable into template, and run against LLM
        to genenrate JSON format response.

        Args:
            code_description: description of the block code. It is used in the template prompt.
            template: template prompt with variable used to call LLM.

        Returns:
            JSON formated response.
            If template is PROMPT_FOR_CUSTOMIZED_CODE_IN_PYTHON, response contains key 'action_code'
            and 'arguments'. 'action_code' is the filter logic mentioned in code_description
            applying to data. 'arguments' are columns to be aggregrated on.
            Example:
                For PROMPT_FOR_CUSTOMIZED_CODE_IN_PYTHON prompt, format of response is:
                {
                    'action_code': 'grade == 5 or grade == 6',
                    'arguments': ['class']
                }
            If template is PROMPT_FOR_CUSTOMIZED_CODE_IN_SQL, response contains key 'sql_code'
            , which is the SQL code based on the code_description.
            {
                'sql_code': 'SELECT book_id, book_price FROM book_table WHERE book_price > 100'
            }
        """
        prompt_template = PromptTemplate(
            input_variables=[
                'code_description',
            ],
            template=template,
        )
        chain = LLMChain(llm=self.llm, prompt=prompt_template)
        customized_logic_json = await chain.arun(code_description=code_description)
        return json.loads(customized_logic_json)

    async def __async_llm_generate_customized_code_with_base_template(
            self,
            code_description: str,
            code_language: str,
            template: str) -> Dict:
        """Calls LLM with prompt with template, code_description and language variables.

        Fill the code_description and code_language variables into template, and run against LLM
        to genenrate JSON format response.

        Args:
            code_description: description of the block code. It is used in the template prompt.
            code_language: language of the block code. It is used in the template prompt.
            template: template prompt with variable used to call LLM.

        Returns:
            Response is in JSON format with key 'code'. Example:
                {
                    'code': 'data.groupby('class_name').sort_values()'
                }
        """
        prompt_template = PromptTemplate(
            input_variables=[
                'code_description',
                'code_language',
            ],
            template=template,
        )
        chain = LLMChain(llm=self.llm, prompt=prompt_template)
        customized_logic_json = await chain.arun(
            code_description=code_description,
            code_language=code_language)
        return json.loads(customized_logic_json)

    async def async_create_customized_code_in_block(
            self,
            block_code: str,
            block_language: str,
            code_description: str) -> str:
        """
        Based on the code description to generate code.
        It supports both python or SQL languages.
        """
        if block_language == BlockLanguage.PYTHON:
            customized_logic = await self.__async_llm_inferene_with_code_description_variable(
                code_description,
                PROMPT_FOR_CUSTOMIZED_CODE_IN_PYTHON
            )
            if 'action_code' in customized_logic.keys():
                block_code = block_code.replace(
                    'action_code=\'\'',
                    f'action_code=\'{customized_logic.get("action_code")}\'')
            if 'arguments' in customized_logic.keys():
                block_code = block_code.replace(
                    'arguments=[]',
                    f'arguments={customized_logic.get("arguments")}')
        elif block_language == BlockLanguage.SQL:
            customized_logic = await self.__async_llm_inferene_with_code_description_variable(
                code_description,
                PROMPT_FOR_CUSTOMIZED_CODE_IN_SQL
            )
            if "sql_code" in customized_logic.keys():
                block_code = f'{block_code}\n{customized_logic.get("sql_code")}'
        return block_code

    async def async_generate_block_with_description(
            self,
            block_description: str,
            upstream_blocks: List[str] = None) -> dict:
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
            if is_default_transformer_template(config):
                customized_logic = await \
                    self.__async_llm_generate_customized_code_with_base_template(
                        block_description,
                        block_language,
                        PROMPT_FOR_CUSTOMIZED_CODE_WITH_BASE_TEMPLATE
                    )
                if 'code' in customized_logic.keys():
                    config["existing_code"] = customized_logic.get("code")
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
                    block_code = await self.async_create_customized_code_in_block(
                        block_code_template,
                        block_language,
                        block_description)
                except TemplateNotFound:
                    # Use default template if template not found and
                    # ask LLM to fully generate the customized code.
                    customized_logic = await \
                        self.__async_llm_generate_customized_code_with_base_template(
                            block_description,
                            block_language,
                            PROMPT_FOR_CUSTOMIZED_CODE_WITH_BASE_TEMPLATE
                        )
                    block_code = fetch_transformer_default_template(customized_logic)

            return dict(
                block_type=block_type,
                configuration=config,
                content=block_code,
                language=block_language,
                upstream_blocks=upstream_blocks,
            )
        else:
            logger.error("Failed to interpret the description as a block template.")
            return None

    async def __async_split_description_by_blocks(self, code_description: str) -> str:
        prompt_template = PromptTemplate(
            input_variables=[
                'code_description',
            ],
            template=PROMPT_TO_SPLIT_BLOCKS,
        )
        chain = LLMChain(llm=self.llm, prompt=prompt_template)
        return await chain.arun(code_description=code_description)

    async def __async_generate_blocks(self,
                                      block_dict: dict,
                                      block_id: int,
                                      block_description: str,
                                      upstream_blocks: [str]) -> dict:
        block = await self.async_generate_block_with_description(block_description, upstream_blocks)
        block_dict[block_id] = block

    async def async_generate_pipeline_from_description(self, pipeline_description: str) -> dict:
        splited_block_descriptions = await self.__async_split_description_by_blocks(
            pipeline_description)
        blocks = {}
        block_tasks = []
        for line in splited_block_descriptions.strip().split('\n'):
            if line.startswith("BLOCK") and ":" in line:
                # Extract the block_id and block_description from the line
                match = re.search(BLOCK_SPLIT_PATTERN, line)
                if match:
                    block_id = match.group(1)
                    block_description = match.group(2).strip()
                    upstream_blocks = match.group(3).split(", ")
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
        return ast.unparse(tree)

    async def async_generate_comment_for_block(self, block_content: str) -> str:
        prompt_template = PromptTemplate(
            input_variables=[
                'block_content',
            ],
            template=PROMPT_FOR_FUNCTION_COMMENT,
        )
        chain = LLMChain(llm=self.llm, prompt=prompt_template)
        function_comments_json = await chain.arun(block_content=block_content)
        function_comments = json.loads(function_comments_json)
        return self.__insert_comments_in_functions(block_content, function_comments)

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
