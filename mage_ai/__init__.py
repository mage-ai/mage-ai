from IPython import get_ipython
from IPython.display import IFrame, Javascript, display
from mage_ai.server.app import (
    clean_df,
    clean_df_with_pipeline,
    connect_df,
    kill as kill_flask,
    launch as launch_flask,
)
from mage_ai.server.constants import SERVER_PORT

IFRAME_HEIGHT = 1000
MAX_NUM_OF_ROWS = 100_000


def launch():
    thread = launch_flask()
    display_inline_iframe()
    return thread


def kill():
    kill_flask()


def display_inline_iframe():
    path_to_local_server = f'http://localhost:{SERVER_PORT}'
    if type(get_ipython()).__module__.startswith('google.colab'):
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
    else:
        display(IFrame(path_to_local_server, width='95%', height=1000))


def connect_data(df, name):
    if df.shape[0] > MAX_NUM_OF_ROWS:
        feature_set, _ = connect_df(df.sample(MAX_NUM_OF_ROWS), name)
    else:
        feature_set, _ = connect_df(df, name)
    return feature_set


def clean(df, pipeline_uuid=None, pipeline_path=None):
    if pipeline_uuid is not None:
        df_clean = clean_df_with_pipeline(df, id=pipeline_uuid)
    elif pipeline_path is not None:
        df_clean = clean_df_with_pipeline(df, path=pipeline_path)
    else:
        _, df_clean = clean_df(df)
    return df_clean


def init(api_key):
    # verify api_key with Mage backend
    pass
