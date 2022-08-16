import asyncio
import os


def main():
    import sys

    try:
        command = sys.argv[1]
    except IndexError:
        command = 'help'
    if command == 'help':
        print("""Usage:
    mage <command> 

Commands:
    init <project_path>                 Initialize Mage project.
    args:
        project_path                    path of the Mage project to be created.

    start <project_path> [host] [port]  Start Mage server and UI.
    args:
        project_path                    path of the Mage project to be loaded.
        host                            optional argument to specify the host, defaults to localhost
        port                            optional argument to specify the port, defaults to 6789

    run <project_path> <pipeline_uuid>  Run pipeline.
    args:
        project_path                    path of the Mage project that contains the pipeline.
        pipeline_uuid                   uuid of the pipeline to be run.

    test <project_path> <pipeline_uuid> Run pipeline and output tests.
    args:
        project_path                    path of the Mage project that contains the pipeline.
        pipeline_uuid                   uuid of the pipeline to be run and tested.

    create_spark_cluster <project_path>
      args:
        project_path                    path of the Mage project that contains the EMR config.
        """)
    elif command == 'init':
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
    elif command == 'create_spark_cluster':
        from mage_ai.services.emr.launcher import create_cluster

        project_path = os.path.abspath(sys.argv[2])
        create_cluster(project_path)
    else:
        print(f'Unknown command "{command}". Type "mage help" to see what commands are available.')


if __name__ == "__main__":
    main()
