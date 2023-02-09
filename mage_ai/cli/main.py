from click import Context
from mage_ai.cli.utils import parse_runtime_variables
from rich import print
from typer.core import TyperGroup
from typing import List, Union
import os
import sys
import typer


class OrderCommands(TyperGroup):
    def list_commands(self, ctx: Context):
        """Return list of commands in the order they appear."""
        return list(self.commands)


app = typer.Typer(
    cls=OrderCommands,
)


@app.command()
def init(
    project_path: str = typer.Argument(..., help='path of the Mage project to be created.')
):
    """
    Initialize Mage project.
    """
    from mage_ai.data_preparation.repo_manager import init_repo

    repo_path = os.path.join(os.getcwd(), project_path)
    init_repo(repo_path)
    print(f'Initialized Mage project at {repo_path}')


@app.command()
def start(
    project_path: str = typer.Argument(os.getcwd(), help='path of the Mage project to be loaded.'),
    host: str = typer.Option('localhost', help='specify the host.'),
    port: str = typer.Option('6789', help='specify the port.'),
    manage_instance: str = typer.Option('0', help=''),
    dbt_docs_instance: str = typer.Option('0', help=''),
):
    """
    Start Mage server and UI.
    """
    from mage_ai.data_preparation.repo_manager import set_repo_path

    # Set repo_path before intializing the DB so that we can get correct db_connection_url
    project_path = os.path.abspath(project_path)
    set_repo_path(project_path)

    from mage_ai.server.server import start_server

    start_server(
        host=host,
        port=port,
        project=project_path,
        manage=manage_instance == "1",
        dbt_docs=dbt_docs_instance == "1",
    )


@app.command()
def run(
    project_path: str = typer.Argument(
        ..., help='path of the Mage project that contains the pipeline.'
    ),
    pipeline_uuid: str = typer.Argument(
        ..., help='uuid of the pipeline to be run.'
    ),
    test: bool = typer.Option(
        False, help='specify if tests should be run.'
    ),
    block_uuid: Union[str, None] = typer.Option(
        None, help='uuid of the block to be run.'
    ),
    execution_partition: Union[str, None] = typer.Option(
        None, help=''
    ),
    executor_type: Union[str, None] = typer.Option(
        None, help=''
    ),
    callback_url: Union[str, None] = typer.Option(
        None, help=''
    ),
    block_run_id: Union[int, None] = typer.Option(
        None, help=''
    ),
    runtime_vars: Union[List[str], None] = typer.Option(
        None, help='specify runtime variables. These will overwrite the pipeline global variables.'
    ),
    skip_sensors: bool = typer.Option(
        False, help='specify if the sensors should be skipped.'
    ),
):
    """
    Run pipeline.
    """
    from mage_ai.data_preparation.executors.executor_factory import ExecutorFactory
    from mage_ai.data_preparation.models.pipeline import Pipeline
    from mage_ai.data_preparation.repo_manager import set_repo_path
    from mage_ai.data_preparation.variable_manager import get_global_variables
    from mage_ai.orchestration.db import db_connection
    from mage_ai.shared.hash import merge_dict

    runtime_variables = dict()
    if runtime_vars is not None:
        runtime_variables = parse_runtime_variables(runtime_vars)

    project_path = os.path.abspath(project_path)
    set_repo_path(project_path)
    sys.path.append(os.path.dirname(project_path))
    pipeline = Pipeline(pipeline_uuid, repo_path=project_path)

    default_variables = get_global_variables(pipeline_uuid)
    global_vars = merge_dict(default_variables, runtime_variables)

    db_connection.start_session()

    if block_uuid is None:
        ExecutorFactory.get_pipeline_executor(pipeline).execute(
            analyze_outputs=False,
            global_vars=global_vars,
            run_sensors=not skip_sensors,
            run_tests=test,
            update_status=False,
        )
    else:
        ExecutorFactory.get_block_executor(
            pipeline,
            block_uuid,
            execution_partition=execution_partition,
            executor_type=executor_type,
        ).execute(
            analyze_outputs=False,
            callback_url=callback_url,
            global_vars=global_vars,
            update_status=False,
        )
    print('Pipeline run completed.')


@app.command()
def create_spark_cluster(
    project_path: str = typer.Argument(
        ..., help='path of the Mage project that contains the EMR config.'
    ),
):
    """
    Create EMR cluster for Mage project.
    """
    from mage_ai.services.aws.emr.launcher import create_cluster

    project_path = os.path.abspath(project_path)
    create_cluster(project_path)


if __name__ == '__main__':
    app()
