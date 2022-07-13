from mage_ai.data_preparation.models.pipeline import Pipeline
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
        host = None
        port = None
        if len(sys.argv) >= 3:
            repo_path = os.path.join(os.getcwd(), sys.argv[2])
            if len(sys.argv) >= 4:
                host = sys.argv[3]
            if len(sys.argv) >= 5:
                port = sys.argv[4]
        else:
            repo_path = os.getcwd()

        asyncio.run(start_server(
            host=host,
            port=port,
            project=repo_path,
        ))
    elif command == 'run':
        project_path = sys.argv[2]
        pipeline_uuid = sys.argv[3]
        project_path = os.path.abspath(project_path)
        sys.path.append(os.path.dirname(project_path))
        pipeline = Pipeline(pipeline_uuid, project_path)

        asyncio.run(pipeline.execute(analyze_outputs=False))


if __name__ == "__main__":
    main()
