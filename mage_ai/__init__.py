from mage_ai.server.constants import SERVER_HOST, SERVER_PORT
import logging
import os
import sys

MAX_NUM_OF_ROWS = 100_000

logger = logging.getLogger(__name__)


def launch(
    host=SERVER_HOST,
    port=SERVER_PORT,
    inline=True,
    api_key=None,
    notebook_type=None,
    iframe_host=None,
    iframe_port=None,
    config={},
):
    from mage_ai.server.app import launch as launch_flask
    from mage_ai.server.utils.frontend_renderer import (
        NotebookType,
        display_inline_iframe,
        infer_notebook_type,
        update_frontend_urls,
    )
    iframe_host = iframe_host or host
    iframe_port = iframe_port or port
    if notebook_type is None:
        notebook_type = infer_notebook_type()
    if notebook_type == NotebookType.DATABRICKS:
        host = '0.0.0.0'
        update_frontend_urls(
            host=iframe_host,
            port=iframe_port,
            notebook_type=notebook_type,
            config=config,
        )
    elif notebook_type == NotebookType.SAGEMAKER:
        update_frontend_urls(
            host=host,
            port=port,
            notebook_type=notebook_type,
            config=config,
        )
    thread = launch_flask(mage_api_key=api_key, host=host, port=port)
    if inline:
        display_inline_iframe(
            host=iframe_host,
            port=iframe_port,
            notebook_type=notebook_type,
            config=config,
        )

    return thread


def remote_sync(api_key=None):
    from mage_ai.server.app import sync_pipelines
    sync_pipelines(api_key)


def kill():
    from mage_ai.server.app import kill as kill_flask
    kill_flask()


def connect_data(df, name, verbose=False):
    from mage_ai.data_cleaner.shared.utils import is_spark_dataframe
    from mage_ai.server.app import connect_df

    if is_spark_dataframe(df):
        # Convert pyspark dataframe to pandas
        df_spark = df
        row_count = df_spark.count()
        if row_count >= MAX_NUM_OF_ROWS:
            sample_fraction = MAX_NUM_OF_ROWS / row_count
            df = df_spark.sample(withReplacement=False, fraction=sample_fraction).toPandas()
        else:
            df = df_spark.toPandas()

    if df.shape[0] > MAX_NUM_OF_ROWS:
        feature_set, _ = connect_df(
            df.sample(MAX_NUM_OF_ROWS).reset_index(drop=True),
            name,
            verbose=verbose,
        )
    else:
        feature_set, _ = connect_df(df, name, verbose=verbose)
    return feature_set


def clean(
    df,
    name=None,
    pipeline_uuid=None,
    pipeline_path=None,
    remote_pipeline_uuid=None,
    api_key=None,
    verbose=False,
):
    from mage_ai.server.app import (
        clean_df,
        clean_df_with_pipeline,
    )
    if pipeline_uuid is not None:
        df_clean = clean_df_with_pipeline(df, id=pipeline_uuid, verbose=verbose)
    elif pipeline_path is not None:
        df_clean = clean_df_with_pipeline(df, path=pipeline_path, verbose=verbose)
    elif remote_pipeline_uuid is not None:
        df_clean = clean_df_with_pipeline(
            df, remote_id=remote_pipeline_uuid, mage_api_key=api_key, verbose=verbose
        )
    else:
        _, df_clean = clean_df(df, name=name, verbose=verbose)
    return df_clean


# --------------- Data preparation methods --------------- #


def run(
    pipeline_uuid: str,
    project_path: str = None,
    block_uuid: str = None,
    run_sensors: bool = True,
    **global_vars,
) -> None:
    from mage_ai.data_preparation.models.pipeline import Pipeline
    from mage_ai.data_preparation.executors.executor_factory import ExecutorFactory

    project_path = os.getcwd() if project_path is None else os.path.abspath(project_path)
    sys.path.append(os.path.dirname(project_path))
    pipeline = Pipeline(pipeline_uuid, project_path)
    if block_uuid is None:
        ExecutorFactory.get_pipeline_executor(pipeline).execute(
            analyze_outputs=False,
            global_vars=global_vars,
            run_sensors=run_sensors,
            update_status=False,
        )
    else:
        ExecutorFactory.get_block_executor(pipeline, block_uuid).execute(
            analyze_outputs=False,
            global_vars=global_vars,
            update_status=False,
        )
