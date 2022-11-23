from http.server import SimpleHTTPRequestHandler
from mage_ai.data_preparation.repo_manager import get_repo_path
import os
import socketserver


def get_dbt_target_path():
    return os.path.join(get_repo_path(), 'dbt/target')

def run_docs_server():
    target_path = get_dbt_target_path()
    if not os.path.exists(target_path):
        os.makedirs(target_path)

    os.chdir(target_path)

    httpd = socketserver.TCPServer(('', 7789), SimpleHTTPRequestHandler)

    try:
        print('Starting DBT docs server...')
        httpd.serve_forever()
    finally:
        httpd.shutdown()
        httpd.server_close()
