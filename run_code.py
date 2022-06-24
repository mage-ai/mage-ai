from jupyter_client import KernelManager
import argparse
import json


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--conn_file', type=str, default=None)
    parser.add_argument('--host', type=str, default=None)
    args = parser.parse_args()

    connection_file = args.conn_file
    print(connection_file)
    with open(connection_file) as f:
        connection = json.loads(f.read())

    manager = KernelManager(**connection)
    client = manager.client()

    client.execute("""
from datetime import datetime


datetime.now()
""")
