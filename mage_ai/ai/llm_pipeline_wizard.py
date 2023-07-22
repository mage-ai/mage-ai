import asyncio

from langchain.chains import LLMChain
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import (
    NON_PIPELINE_EXECUTABLE_BLOCK_TYPES,
    BlockLanguage,
    BlockType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_path

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
            block_content=block_docs,
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
