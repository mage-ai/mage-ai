from mage_ai.data_preparation.repo_manager import init_repo
from mage_ai.server.server import main as start_server

import asyncio
import os

def main():
    import sys
    command = sys.argv[1]

    if command == 'init':
        repo_path = os.path.join(os.getcwd(), sys.argv[2])
        init_repo(repo_path)
    elif command == 'start':
        print('Starting server...')

        asyncio.run(start_server())

if __name__ == "__main__":
    main()
