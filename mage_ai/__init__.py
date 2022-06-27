from mage_ai.data_cleaner.shared.utils import is_spark_dataframe
from mage_ai.server.app import (
    clean_df,
    clean_df_with_pipeline,
    connect_df,
    kill as kill_flask,
    launch as launch_flask,
    sync_pipelines,
)
from mage_ai.server.constants import SERVER_HOST, SERVER_PORT
from mage_ai.server.utils.frontend_renderer import (
    NotebookType,
    display_inline_iframe,
    infer_notebook_type,
    update_frontend_urls,
)
import logging


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
    sync_pipelines(api_key)


def kill():
    kill_flask()


def connect_data(df, name, verbose=False):
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
