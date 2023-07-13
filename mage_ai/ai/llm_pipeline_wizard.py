from langchain.chains import LLMChain
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline

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
METADATA_FILE = 'metadata.yaml'
PROMPT_FOR_BLOCK = """
The {file_type} delimited by triple backticks is used to {purpose}.
Write a documentation based on the {file_type}. {add_on_prompt}
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

    def __llm_generate_documentation(self, block_content: str, file_type: str,
                                     purpose: str, template: str, add_on_prompt: str = ""):
        prompt_template = PromptTemplate(input_variables=["block_content", "file_type",
                                                          "purpose", "add_on_prompt"],
                                         template=template)
        chain = LLMChain(llm=self.llm, prompt=prompt_template)
        return chain.run(block_content=block_content,
                         file_type=file_type,
                         purpose=purpose,
                         add_on_prompt=add_on_prompt)

    def generate_pipeline_documentation(self,
                                        project_name: str,
                                        pipeline_name: str,
                                        print_block_doc: bool = False) -> str:
        pipeline = Pipeline.get(uuid=pipeline_name.replace(" ", "_"),
                                repo_path=project_name.replace(" ", "_"))

        block_docs = []
        for block_config in pipeline.block_configs:
            block_docs.append(self.generate_block_documentation(
                pipeline.get_block(block_config['uuid'])))
        block_docs_content = '\n'.join(block_docs)
        if print_block_doc:
            print(block_docs_content)
        prompt_template = PromptTemplate(input_variables=["block_content"],
                                         template=PROMPT_FOR_SUMMARIZE_BLOCK_DOC)
        chain = LLMChain(llm=self.llm, prompt=prompt_template)
        return chain.run(block_content=block_docs_content)

    def generate_block_documentation_with_name(
            self,
            project_name: str,
            pipeline_name: str,
            block_name: str) -> str:
        pipeline = Pipeline.get(uuid=pipeline_name.replace(" ", "_"),
                                repo_path=project_name.replace(" ", "_"))
        return self.generate_block_documentation(pipeline.get_block(block_name.replace(" ", "_")))

    def generate_block_documentation(
            self,
            block: Block) -> str:
        add_on_prompt = ""
        if block.type == BlockType.TRANSFORMER:
            add_on_prompt = "Focus on the customized business logic in execute_transformer_action \
                             function."
        block_doc = self.__llm_generate_documentation(
                    block.content,
                    BLOCK_LANGUAGE_TO_FILE_TYPE_VARIABLE[block.language],
                    BLOCK_TYPE_TO_PURPOSE_VARIABLE.get(block.type, ""),
                    PROMPT_FOR_BLOCK,
                    add_on_prompt
                )
        return block_doc
