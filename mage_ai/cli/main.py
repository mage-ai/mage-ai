import json
import os
import sys
from typing import List, Union

import typer
from click import Context
from rich import print
from typer.core import TyperGroup

from mage_ai.cli.utils import parse_runtime_variables


class OrderCommands(TyperGroup):
    def list_commands(self, ctx: Context):
        """Return list of commands in the order they appear."""
        return list(self.commands)


app = typer.Typer(
    cls=OrderCommands,
)


@app.command()
def init(
    project_path: str = typer.Argument(..., help='path of the Mage project to be created.'),
    # project_type: Union[str, None] = typer.Option(
    #     'standalone', help='type of project to create, options are main, sub, or standalone'
    # ),
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
    pipeline_run_id: Union[int, None] = typer.Option(
        None, help=''
    ),
    runtime_vars: Union[List[str], None] = typer.Option(
        None, help='specify runtime variables. These will overwrite the pipeline global variables.'
    ),
    skip_sensors: bool = typer.Option(
        False, help='specify if the sensors should be skipped.'
    ),
    template_runtime_configuration: Union[str, None] = typer.Option(
        None, help='runtime configuration of data integration block runs.'
    ),
):
    """
    Run pipeline.
    """
    from mage_ai.data_preparation.repo_manager import set_repo_path

    # Set repo_path before intializing the DB so that we can get correct db_connection_url
    project_path = os.path.abspath(project_path)
    set_repo_path(project_path)

    import sentry_sdk

    from mage_ai.data_preparation.executors.executor_factory import ExecutorFactory
    from mage_ai.data_preparation.models.pipeline import Pipeline
    from mage_ai.data_preparation.variable_manager import get_global_variables
    from mage_ai.orchestration.db import db_connection
    from mage_ai.settings import SENTRY_DSN, SENTRY_TRACES_SAMPLE_RATE
    from mage_ai.shared.hash import merge_dict

    sentry_dsn = SENTRY_DSN
    if sentry_dsn:
        sentry_sdk.init(
            sentry_dsn,
            traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
        )

    runtime_variables = dict()
    if runtime_vars is not None:
        runtime_variables = parse_runtime_variables(runtime_vars)

    sys.path.append(os.path.dirname(project_path))
    pipeline = Pipeline.get(pipeline_uuid, repo_path=project_path)

    default_variables = get_global_variables(pipeline_uuid)
    global_vars = merge_dict(default_variables, runtime_variables)

    db_connection.start_session()

    if template_runtime_configuration is not None:
        template_runtime_configuration = json.loads(template_runtime_configuration)

    if block_uuid is None:
        ExecutorFactory.get_pipeline_executor(
            pipeline,
            execution_partition=execution_partition,
            executor_type=executor_type,
        ).execute(
            analyze_outputs=False,
            global_vars=global_vars,
            pipeline_run_id=pipeline_run_id,
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
            block_run_id=block_run_id,
            callback_url=callback_url,
            global_vars=global_vars,
            pipeline_run_id=pipeline_run_id,
            template_runtime_configuration=template_runtime_configuration,
            update_status=False,
        )
    print('Pipeline run completed.')


@app.command()
def clean_cached_variables(
    project_path: str = typer.Argument(
        ..., help='path of the Mage project to clean variables.'
    ),
    pipeline_uuid: str = typer.Option(
        None, help='uuid of the pipeline to clean.'
    ),
):
    from mage_ai.data_preparation.repo_manager import set_repo_path

    project_path = os.path.abspath(project_path)
    set_repo_path(project_path)

    from mage_ai.data_preparation.variable_manager import clean_variables

    clean_variables(pipeline_uuid=pipeline_uuid)


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
