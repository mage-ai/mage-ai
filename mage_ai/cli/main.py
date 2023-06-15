import json
import os
import sys
from typing import List, Union

import typer
from click import Context
from rich import print
from typer.core import TyperGroup

from mage_ai.cli.utils import parse_runtime_variables
from mage_ai.shared.constants import InstanceType


class OrderCommands(TyperGroup):
    def list_commands(self, ctx: Context):
        """Return list of commands in the order they appear."""
        return list(self.commands)


app = typer.Typer(
    cls=OrderCommands,
)

# Defaults

INIT_PROJECT_PATH_DEFAULT = typer.Argument(..., help='path of the Mage project to be created.')
INIT_PROJECT_TYPE_DEFAULT = typer.Option(
    'standalone', help='type of project to create, options are main, sub, or standalone')

START_PROJECT_PATH_DEFAULT = typer.Argument(
    os.getcwd(), help='path of the Mage project to be loaded.')
START_HOST_DEFAULT = typer.Option('localhost', help='specify the host.')
START_PORT_DEFAULT = typer.Option('6789', help='specify the port.')
START_MANAGE_INSTANCE_DEFAULT = typer.Option('0', help='')
START_DBT_DOCS_INSTANCE_DEFAULT = typer.Option('0', help='')
START_INSTANCE_TYPE_DEFAULT = typer.Option(
    InstanceType.SERVER_AND_SCHEDULER.value, help='specify the instance type.')
START_PROJECT_TYPE_DEFAULT = typer.Option(
    'standalone',
    help='create project of this type if does not exist, options are main, sub, or standalone',
)

RUN_PROJECT_PATH_DEFAULT = typer.Argument(
    ..., help='path of the Mage project that contains the pipeline.'
)
RUN_PIPELINE_UUID_DEFAULT = typer.Argument(
    ..., help='uuid of the pipeline to be run.'
)
RUN_TEST_DEFAULT = typer.Option(
    False, help='specify if tests should be run.'
)
RUN_BLOCK_UUID_DEFAULT = typer.Option(
    None, help='uuid of the block to be run.'
)
RUN_EXECUTION_PARTITION_DEFAULT = typer.Option(
    None, help=''
)
RUN_EXECUTOR_TYPE_DEFAULT = typer.Option(
    None, help=''
)
RUN_CALLBACK_URL_DEFAULT = typer.Option(
    None, help=''
)
RUN_BLOCK_RUN_ID_DEFAULT = typer.Option(
    None, help=''
)
RUN_PIPELINE_RUN_ID_DEFAULT = typer.Option(
    None, help=''
)
RUN_RUNTIME_VARS_DEFAULT = typer.Option(
    None, help='specify runtime variables. These will overwrite the pipeline global variables.'
)
RUN_SKIP_SENSORS_DEFAULT = typer.Option(
    False, help='specify if the sensors should be skipped.'
)
RUN_TEMPLATE_RUNTIME_CONFIGURATION_DEFAULT = typer.Option(
    None, help='runtime configuration of data integration block runs.'
)

CLEAN_VARIABLES_PROJECT_PATH_DEFAULT = typer.Argument(
    ..., help='path of the Mage project to clean variables.'
)
CLEAN_VARIABLES_PIPELINE_UUID_DEFAULT = typer.Option(
    None, help='uuid of the pipeline to clean.'
)

CREATE_SPARK_CLUSTER_PROJECT_PATH_DEFAULT = typer.Argument(
    ..., help='path of the Mage project that contains the EMR config.'
)


@app.command()
def init(
    project_path: str = INIT_PROJECT_PATH_DEFAULT,
    project_type: Union[str, None] = INIT_PROJECT_TYPE_DEFAULT,
):
    """
    Initialize Mage project.
    """
    from mage_ai.data_preparation.repo_manager import init_repo

    repo_path = os.path.join(os.getcwd(), project_path)
    init_repo(repo_path, project_type=project_type)
    print(f'Initialized Mage project at {repo_path}')


@app.command()
def start(
    project_path: str = START_PROJECT_PATH_DEFAULT,
    host: str = START_HOST_DEFAULT,
    port: str = START_PORT_DEFAULT,
    manage_instance: str = START_MANAGE_INSTANCE_DEFAULT,
    dbt_docs_instance: str = START_DBT_DOCS_INSTANCE_DEFAULT,
    instance_type: str = START_INSTANCE_TYPE_DEFAULT,
    project_type: Union[str, None] = START_PROJECT_TYPE_DEFAULT,
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
        instance_type=instance_type,
        project_type=project_type,
    )


@app.command()
def run(
    project_path: str = RUN_PROJECT_PATH_DEFAULT,
    pipeline_uuid: str = RUN_PIPELINE_UUID_DEFAULT,
    test: bool = RUN_TEST_DEFAULT,
    block_uuid: Union[str, None] = RUN_BLOCK_UUID_DEFAULT,
    execution_partition: Union[str, None] = RUN_EXECUTION_PARTITION_DEFAULT,
    executor_type: Union[str, None] = RUN_EXECUTOR_TYPE_DEFAULT,
    callback_url: Union[str, None] = RUN_CALLBACK_URL_DEFAULT,
    block_run_id: Union[int, None] = RUN_BLOCK_RUN_ID_DEFAULT,
    pipeline_run_id: Union[int, None] = RUN_PIPELINE_RUN_ID_DEFAULT,
    runtime_vars: Union[List[str], None] = RUN_RUNTIME_VARS_DEFAULT,
    skip_sensors: bool = RUN_SKIP_SENSORS_DEFAULT,
    template_runtime_configuration: Union[str, None] = RUN_TEMPLATE_RUNTIME_CONFIGURATION_DEFAULT,
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
    from mage_ai.orchestration.db.models.schedules import PipelineRun
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

    db_connection.start_session()

    if pipeline_run_id is None:
        default_variables = get_global_variables(pipeline_uuid)
        global_vars = merge_dict(default_variables, runtime_variables)
    else:
        pipeline_run = PipelineRun.query.get(pipeline_run_id)
        global_vars = pipeline_run.get_variables(extra_variables=runtime_variables)

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
    project_path: str = CLEAN_VARIABLES_PROJECT_PATH_DEFAULT,
    pipeline_uuid: str = CLEAN_VARIABLES_PIPELINE_UUID_DEFAULT,
):
    from mage_ai.data_preparation.repo_manager import set_repo_path

    project_path = os.path.abspath(project_path)
    set_repo_path(project_path)

    from mage_ai.data_preparation.variable_manager import clean_variables

    clean_variables(pipeline_uuid=pipeline_uuid)


@app.command()
def create_spark_cluster(
    project_path: str = CREATE_SPARK_CLUSTER_PROJECT_PATH_DEFAULT,
):
    """
    Create EMR cluster for Mage project.
    """
    from mage_ai.services.aws.emr.launcher import create_cluster

    project_path = os.path.abspath(project_path)
    create_cluster(project_path)


if __name__ == '__main__':
    app()
