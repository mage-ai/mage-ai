from jupyter_client import KernelManager
import json
import os
import sys
sys.path.append(os.getcwd())


if __name__ == '__main__':
    # import mage_ai

    # mage_ai.launch()

    manager = KernelManager()
    manager.start_kernel()
    client = manager.client()

    connection = client.get_connection_info()
    connection_file = manager.connection_file
    print(connection)
    print(connection_file)

    with open('kernel_connection.json', 'w') as f:
        if connection.get('key'):
            connection['key'] = connection['key'].decode()
        f.write(json.dumps(connection))

    with open('kernel_connection_file_0.txt', 'w') as f:
        f.write(connection_file)
