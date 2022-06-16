from IPython import get_ipython
from IPython.display import IFrame, Javascript, display
from enum import Enum
from mage_ai.server.app import (
    clean_df,
    clean_df_with_pipeline,
    connect_df,
    kill as kill_flask,
    launch as launch_flask,
)
from mage_ai.server.constants import SERVER_PORT
import os

IFRAME_HEIGHT = 1000
MAX_NUM_OF_ROWS = 100_000


class NotebookType(str, Enum):
    DATABRICKS = 'databricks'
    GOOGLE_COLAB = 'google_colab'


def infer_notebook_type():
    if os.environ.get('DATABRICKS_RUNTIME_VERSION'):
        return NotebookType.DATABRICKS
    elif type(get_ipython()).__module__.startswith('google.colab'):
        return NotebookType.GOOGLE_COLAB
    return None


def launch(
    host=None,
    port=None,
    inline=True,
    api_key=None,
    notebook_type=None,
    config={},
):
    if notebook_type is None:
        notebook_type = infer_notebook_type()
    if notebook_type == NotebookType.DATABRICKS:
        host = '0.0.0.0'
    thread = launch_flask(mage_api_key=api_key, host=host, port=port)
    if inline:
        display_inline_iframe(
            host=host,
            port=port,
            notebook_type=notebook_type,
            config=config,
        )

    return thread


def kill():
    kill_flask()


def display_inline_iframe(host=None, port=None, notebook_type=None, config={}):
    host = host or 'localhost'
    port = port or SERVER_PORT

    path_to_server = f'http://{host}:{port}'

    def __print_url():
        print(f'Open UI in another tab with url: {path_to_server}')

    if notebook_type == NotebookType.GOOGLE_COLAB:
        from google.colab.output import eval_js
        path_to_server = eval_js(f'google.colab.kernel.proxyPort({SERVER_PORT})')
        __print_url()
        display(Javascript("""
            (async ()=>{
                fm = document.createElement('iframe')
                fm.src = await google.colab.kernel.proxyPort(%s)
                fm.width = '95%%'
                fm.height = '%d'
                fm.frameBorder = 0
                document.body.append(fm)
            })();
            """ % (SERVER_PORT, IFRAME_HEIGHT)))
    elif notebook_type == NotebookType.DATABRICKS:
        required_args = [
            'cluster_id',
            'databricks_host',
            'workspace_id',
            'token',
        ]
        for arg in required_args:
            if arg not in config:
                print(f'Parameter "{arg}" is required to generate proxy url.')
                return
        databricks_host = config.get('databricks_host')
        cluster_id = config.get('cluster_id')
        workspace_id = config.get('workspace_id')
        token = config.get('token')
        path_to_server = f'https://{databricks_host}/driver-proxy-api/o/'\
                         f'{workspace_id}/{cluster_id}/{port}/?token={token}'
        __print_url()
    else:
        __print_url()
        display(IFrame(path_to_server, width='95%', height=1000))


def connect_data(df, name):
    if df.shape[0] > MAX_NUM_OF_ROWS:
        feature_set, _ = connect_df(df.sample(MAX_NUM_OF_ROWS), name)
    else:
        feature_set, _ = connect_df(df, name)
    return feature_set


def clean(
    df,
    pipeline_uuid=None,
    pipeline_path=None,
    remote_pipeline_uuid=None,
    api_key=None,
):
    if pipeline_uuid is not None:
        df_clean = clean_df_with_pipeline(df, id=pipeline_uuid)
    elif pipeline_path is not None:
        df_clean = clean_df_with_pipeline(df, path=pipeline_path)
    elif remote_pipeline_uuid is not None:
        df_clean = clean_df_with_pipeline(df, remote_id=remote_pipeline_uuid, mage_api_key=api_key)
    else:
        _, df_clean = clean_df(df)
    return df_clean


def init(api_key):
    # verify api_key with Mage backend
    pass
