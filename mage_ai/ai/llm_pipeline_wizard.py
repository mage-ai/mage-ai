import os
from typing import Dict, Tuple

import yaml
from langchain.chains import LLMChain
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate

from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType

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

    def __define_script_path_and_file_type_variables(self,
                                                     project_name_with_underscore: str,
                                                     folder: str,
                                                     block_config: Dict) -> Tuple[str, str]:
        if block_config["language"] == BlockLanguage.YAML:
            block_script_path = os.path.join(
                                os.getcwd(),
                                f'{project_name_with_underscore}/{folder}'
                                f'/{block_config["uuid"]}.yaml')
            file_type = "yaml configuration"
        elif block_config["language"] == BlockLanguage.PYTHON:
            block_script_path = os.path.join(
                                os.getcwd(),
                                f'{project_name_with_underscore}/{folder}'
                                f'/{block_config["uuid"]}.py')
            file_type = "python code"
        elif block_config["language"] == BlockLanguage.SQL:
            block_script_path = os.path.join(
                                os.getcwd(),
                                f'{project_name_with_underscore}/{folder}'
                                f'/{block_config["uuid"]}.sql')
            file_type = "SQL script"
        elif block_config["language"] == BlockLanguage.MARKDOWN:
            block_script_path = os.path.join(
                                os.getcwd(),
                                f'{project_name_with_underscore}/{folder}'
                                f'/{block_config["uuid"]}.md')
            file_type = "markdown script"
        elif block_config["language"] == BlockLanguage.R:
            block_script_path = os.path.join(
                                os.getcwd(),
                                f'{project_name_with_underscore}/{folder}'
                                f'/{block_config["uuid"]}.r')
            file_type = "R script"
        return block_script_path, file_type

    def generate_pipeline_documentation(self,
                                        project_name: str,
                                        pipeline_name: str,
                                        print_block_doc: bool = False) -> str:
        project_name_with_underscore = project_name.replace(" ", "_")
        pipeline_metadata_path = os.path.join(os.getcwd(),
                                              f'{project_name_with_underscore}/pipelines'
                                              f'/{pipeline_name.replace(" ", "_")}/{METADATA_FILE}')
        with open(pipeline_metadata_path, 'r') as file:
            pipeline_metadata = yaml.safe_load(file)
        block_docs = []
        for block in pipeline_metadata["blocks"]:
            block_docs.append(self.generate_block_documentation(project_name, block))
        block_docs_content = '\n'.join(block_docs)
        if print_block_doc:
            print(block_docs_content)
        prompt_template = PromptTemplate(input_variables=["block_content"],
                                         template=PROMPT_FOR_SUMMARIZE_BLOCK_DOC)
        chain = LLMChain(llm=self.llm, prompt=prompt_template)
        return chain.run(block_content=block_docs_content)

    def generate_block_documentation(
            self,
            project_name: str,
            block_config: dict) -> str:
        project_name_with_underscore = project_name.replace(" ", "_")
        add_on_prompt = ""
        if block_config["type"] == BlockType.DATA_LOADER:
            purpose = "load data from a specific data source."
            block_script_path, file_type = self.__define_script_path_and_file_type_variables(
                project_name_with_underscore, DATA_LOADERS_FOLDER, block_config)
        elif block_config["type"] == BlockType.DATA_EXPORTER:
            purpose = "export data to a specific data source."
            block_script_path, file_type = self.__define_script_path_and_file_type_variables(
                project_name_with_underscore, DATA_EXPORTERS_FOLDER, block_config)
        elif block_config["type"] == BlockType.TRANSFORMER:
            purpose = "transform data from one format into different format."
            block_script_path, file_type = self.__define_script_path_and_file_type_variables(
                project_name_with_underscore, TRANSFORMERS_FOLDER, block_config)
            add_on_prompt = "Focus on the customized business logic in execute_transformer_action \
                             function."
        else:
            return ""
        with open(block_script_path, 'r') as blcock_script_file:
            block_doc = self.__llm_generate_documentation(
                        blcock_script_file.read(),
                        file_type,
                        purpose,
                        PROMPT_FOR_BLOCK,
                        add_on_prompt
                    )
        return block_doc
