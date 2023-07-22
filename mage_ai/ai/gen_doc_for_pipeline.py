import asyncio

import typer

from mage_ai.ai.llm_pipeline_wizard import LLMPipelineWizard

app = typer.Typer()

PROJECT_NAME_DEFAULT = typer.Argument(
    ..., help='Mage project path'
)
PIPELINE_NAME_DEFAULT = typer.Argument(
    ..., help='Mage pipeline uuid'
)
BLOCK_NAME_DEFAULT = typer.Argument(
    ..., help='Mage block uuid in the pipeline'
)
PRINT_BLOCK_DOC_DEFAULT = typer.Option(
    False, help='specify if block documentation should be printed.'
)


@app.command()
def generate_block_documentation(project_path: str = PROJECT_NAME_DEFAULT,
                                 pipeline_uuid: str = PROJECT_NAME_DEFAULT,
                                 block_uuid: str = BLOCK_NAME_DEFAULT):
    print(asyncio.run(LLMPipelineWizard().async_generate_block_documentation_with_name(
        pipeline_uuid,
        block_uuid,
        project_path=project_path,
    )))


@app.command()
def generate_pipeline_documentation(project_path: str = PROJECT_NAME_DEFAULT,
                                    pipeline_uuid: str = PROJECT_NAME_DEFAULT,
                                    print_block_doc: bool = PRINT_BLOCK_DOC_DEFAULT):
    print(asyncio.run(LLMPipelineWizard().async_generate_pipeline_documentation(
        pipeline_uuid,
        print_block_doc=print_block_doc,
        project_path=project_path,
    ))['pipeline_doc'])


if __name__ == '__main__':
    app()
