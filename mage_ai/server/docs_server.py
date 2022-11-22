from http.server import SimpleHTTPRequestHandler
import os
import socketserver
import time

from mage_ai.orchestration.db.process import create_process
from mage_ai.data_preparation.repo_manager import get_repo_path

def get_dbt_target_path():
    return os.path.join(get_repo_path(), 'dbt/target')

def run_docs_server():
    while True:
        print('Checking if DBT docs have been generated...')
        if (os.path.exists(get_dbt_target_path())):
            os.chdir(get_dbt_target_path())

            httpd = socketserver.TCPServer(('', 7789), SimpleHTTPRequestHandler)

            try:
                print('Start DBT docs server.')
                httpd.serve_forever()
            finally:
                httpd.shutdown()
                httpd.server_close()
        else:
            time.sleep(10)
