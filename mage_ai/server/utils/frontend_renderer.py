from IPython import get_ipython
from IPython.display import IFrame, Javascript, display
from enum import Enum
from mage_ai.server.app import (
    server_config,
)
from mage_ai.server.constants import SERVER_PORT
import logging
import os


FRONTEND_DIST_PATH = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend_dist'),
)
FRONTEND_STATIC_PATH = '/_next/static'
IFRAME_HEIGHT = 1000

logger = logging.getLogger(__name__)


class NotebookType(str, Enum):
    DATABRICKS = 'databricks'
    GOOGLE_COLAB = 'google_colab'
    SAGEMAKER = 'sagemaker'


def infer_notebook_type():
    if os.environ.get('DATABRICKS_RUNTIME_VERSION'):
        return NotebookType.DATABRICKS
    elif type(get_ipython()).__module__.startswith('google.colab'):
        return NotebookType.GOOGLE_COLAB
    elif os.environ.get('AWS_PATH'):
        return NotebookType.SAGEMAKER
    else:
        return None


def display_inline_iframe(host='localhost', port=SERVER_PORT, notebook_type=None, config={}):
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
        databricks_host = config.get('databricks_host')
        base_path = server_config.server_base_path
        url_params = server_config.server_url_params
        path_to_server = f'https://{databricks_host}{base_path}{url_params}'
        __print_url()
    elif notebook_type == NotebookType.SAGEMAKER:
        sagemaker_host = config.get('sagemaker_host')
        path_to_server = f'https://{sagemaker_host}/proxy/{port}'
        __print_url()
        display(IFrame(path_to_server, width='95%', height=1000))
    else:
        __print_url()
        display(IFrame(path_to_server, width='95%', height=1000))


def update_frontend_urls(host=None, port=None, notebook_type=None, config={}):
    if notebook_type == NotebookType.DATABRICKS:
        required_args = [
            'cluster_id',
            'databricks_host',
            'workspace_id',
            'token',
        ]
        for arg in required_args:
            if arg not in config:
                logger.error(f'Parameter "{arg}" is required to generate proxy url.')
                return
        cluster_id = config.get('cluster_id')
        workspace_id = config.get('workspace_id')
        token = config.get('token')
        base_path = f'/driver-proxy-api/o/{workspace_id}/{cluster_id}/{port}/'
        url_params = f'?token={token}'
        server_config.server_base_path = base_path
        server_config.server_url_params = url_params
    elif notebook_type == NotebookType.SAGEMAKER:
        base_path = f'/proxy/{port}'
