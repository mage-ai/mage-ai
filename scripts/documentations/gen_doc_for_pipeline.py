import os
import typer
import yaml
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

from mage_ai.data_preparation.models.constants import BlockType

app = typer.Typer()

PROJECT_NAME_DEFAULT = typer.Argument(
    ..., help='Mage project name'
)
PIPELINE_NAME_DEFAULT = typer.Argument(
    ..., help='Mage pipeline name'
)
DEBUG_INFO_DEFAULT = typer.Option(
    False, help='specify if debug info should be printed.'
)

DATA_LOADERS_FOLDER = 'data_loaders'
DATA_EXPORTERS_FOLDER = 'data_exporters'
TRANSFORMERS_FOLDER = 'transformers'

METADATA_FILE = 'metadata.yaml'

# Prompts
PROMPT_FOR_BLOCK = """
The {file_type} delimited by triple backticks is used to {purpose}.
Write a documentation based on the {file_type}.
```{block_content}```"""

PROMPT_FOR_SUMMARIZE_BLOCK_DOC = """
A data pipeline reads data from source, transform the data and export data into another source.
The content delimited by triple backticks contains explains of all components in one data pipeline.
Write a summarization of the data pipeline based on the content.
```{block_content}```
"""


def read_file(path: str):
    with open(path, 'r') as file:
        return file.read()


def llm_generate_documentation(block_content: str, file_type: str,
                               purpose: str, template: str, llm: OpenAI):
    prompt_template = PromptTemplate(input_variables=["block_content", "file_type", "purpose"],
                                     template=template)
    chain = LLMChain(llm=llm, prompt=prompt_template)
    data_loader_doc = chain.run(block_content=block_content, file_type=file_type, purpose=purpose)
    return data_loader_doc


def print_debug_info(block: dict, doc: str):
    print(f"Block UUID: {block['uuid']}, Block type: {block['type']}, Documentation:")
    print(doc)


@app.command()
def generate_documents(project_name: str = PROJECT_NAME_DEFAULT,
                       pipeline_name: str = PROJECT_NAME_DEFAULT,
                       debug_info: bool = DEBUG_INFO_DEFAULT):
    # Read pipeline metadata yaml from from input
    project_name_with_underscore = project_name.replace(" ", "_")
    pipeline_metadata_path = os.path.join(os.getcwd(),
                                          f'{project_name_with_underscore}/pipelines'
                                          f'/{pipeline_name.replace(" ", "_")}/{METADATA_FILE}')
    with open(pipeline_metadata_path, 'r') as file:
        pipeline_metadata = yaml.safe_load(file)
    llm = OpenAI(temperature=0)
    block_docs = []
    for block in pipeline_metadata["blocks"]:
        if block["type"] == BlockType.DATA_LOADER:
            purpose = "load data from a specific data source."
            if block["language"] == "yaml":
                block_script_path = os.path.join(
                                    os.getcwd(),
                                    f'{project_name_with_underscore}/{DATA_LOADERS_FOLDER}'
                                    f'/{block["uuid"]}.yaml')
                file_type = "yaml configuration"
            elif block["language"] == "python":
                block_script_path = os.path.join(
                                    os.getcwd(),
                                    f'{project_name_with_underscore}/{DATA_LOADERS_FOLDER}'
                                    f'/{block["uuid"]}.py')
                file_type = "python code"
        elif block["type"] == BlockType.DATA_EXPORTER:
            purpose = "export data to a specific data source."
            if block["language"] == "yaml":
                block_script_path = os.path.join(
                                    os.getcwd(),
                                    f'{project_name_with_underscore}/{DATA_EXPORTERS_FOLDER}'
                                    f'/{block["uuid"]}.yaml')
                file_type = "yaml configuration"
            elif block["language"] == "python":
                block_script_path = os.path.join(
                                    os.getcwd(),
                                    f'{project_name_with_underscore}/{DATA_EXPORTERS_FOLDER}'
                                    f'/{block["uuid"]}.py')
                file_type = "python code"
        elif block["type"] == BlockType.TRANSFORMER:
            purpose = "transform data from one format into different format."
            block_script_path = os.path.join(
                os.getcwd(),
                f'{project_name_with_underscore}/{TRANSFORMERS_FOLDER}'
                f'/{block["uuid"]}.py')
            file_type = "python code"
        block_doc = llm_generate_documentation(
                    read_file(block_script_path),
                    file_type,
                    purpose,
                    PROMPT_FOR_BLOCK,
                    llm
                )
        if debug_info:
            print_debug_info(block, block_doc)
        block_docs.append(block_doc)
    block_docs_content = '\n'.join(block_docs)
    prompt_template = PromptTemplate(input_variables=["block_content"],
                                     template=PROMPT_FOR_SUMMARIZE_BLOCK_DOC)
    chain = LLMChain(llm=llm, prompt=prompt_template)
    pipeline_summarization = chain.run(block_content=block_docs_content)
    print("Pipeline Summarization:")
    print(pipeline_summarization)


if __name__ == '__main__':
    app()
