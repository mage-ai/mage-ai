import asyncio
import os


def main():
    import sys
    command = sys.argv[1]

    if command == 'init':
        from mage_ai.data_preparation.repo_manager import init_repo

        repo_path = os.path.join(os.getcwd(), sys.argv[2])
        init_repo(repo_path)
    elif command == 'start':
        from mage_ai.server.server import main as start_server

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
        from mage_ai.data_preparation.models.pipeline import Pipeline
        from mage_ai.data_preparation.pipeline_executor import PipelineExecutor

        project_path = sys.argv[2]
        pipeline_uuid = sys.argv[3]
        project_path = os.path.abspath(project_path)
        sys.path.append(os.path.dirname(project_path))
        pipeline = Pipeline(pipeline_uuid, project_path)

        PipelineExecutor.get_executor(pipeline).execute(
            analyze_outputs=False,
            update_status=False,
        )
    elif command == 'test':
        from mage_ai.data_preparation.models.pipeline import Pipeline

        project_path = sys.argv[2]
        pipeline_uuid = sys.argv[3]
        project_path = os.path.abspath(project_path)
        sys.path.append(os.path.dirname(project_path))
        pipeline = Pipeline(pipeline_uuid, project_path)

        asyncio.run(
            pipeline.execute(
                analyze_outputs=False,
                run_tests=True,
                update_status=False,
            )
        )


if __name__ == "__main__":
    main()
