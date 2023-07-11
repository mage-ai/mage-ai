import typer

from mage_ai.ai.llm_pipeline_wizard import LLMPipelineWizard

app = typer.Typer()

PROJECT_NAME_DEFAULT = typer.Argument(
    ..., help='Mage project name'
)
PIPELINE_NAME_DEFAULT = typer.Argument(
    ..., help='Mage pipeline name'
)
BLOCK_NAME_DEFAULT = typer.Argument(
    ..., help='Mage block name in the pipeline'
)
PRINT_BLOCK_DOC_DEFAULT = typer.Option(
    False, help='specify if block documentation should be printed.'
)


@app.command()
def generate_block_documentation(project_name: str = PROJECT_NAME_DEFAULT,
                                 pipeline_name: str = PROJECT_NAME_DEFAULT,
                                 block_name: str = BLOCK_NAME_DEFAULT):
    print(LLMPipelineWizard().generate_block_documentation_with_name(
        project_name, pipeline_name, block_name))


@app.command()
def generate_pipeline_documentation(project_name: str = PROJECT_NAME_DEFAULT,
                                    pipeline_name: str = PROJECT_NAME_DEFAULT,
                                    print_block_doc: bool = PRINT_BLOCK_DOC_DEFAULT):
    print(LLMPipelineWizard().generate_pipeline_documentation(project_name,
                                                              pipeline_name,
                                                              print_block_doc))


if __name__ == '__main__':
    app()
