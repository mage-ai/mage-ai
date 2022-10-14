from mage_ai.cli.utils import parse_runtime_variables
import argparse
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

    start <project_path>                Start Mage server and UI.
      args:
        project_path                    path of the Mage project to be loaded.
      options:
        --host <host>                   specify the host, defaults to localhost
        --port <port>                   specify the port, defaults to 6789

    run <project_path> <pipeline_uuid>  Run pipeline.
      args:
        project_path                    path of the Mage project that contains the pipeline.
        pipeline_uuid                   uuid of the pipeline to be run.
      options:
        --runtime-vars [key value]...   specify runtime variables. These will overwrite the pipeline global variables.   

    test <project_path> <pipeline_uuid> Run pipeline and output tests.
      args:
        project_path                    path of the Mage project that contains the pipeline.
        pipeline_uuid                   uuid of the pipeline to be run and tested.
      options:
        --runtime-vars [key value]...   specify runtime variables. These will overwrite the pipeline global variables.

    create_spark_cluster <project_path>
      args:
        project_path                    path of the Mage project that contains the EMR config.
        """)
    elif command == 'init':
        from mage_ai.data_preparation.repo_manager import init_repo

        repo_path = os.path.join(os.getcwd(), sys.argv[2])
        init_repo(repo_path)
    elif command == 'start':
        from mage_ai.server.server import start_server

        parser = argparse.ArgumentParser()
        parser.add_argument('repo_path', metavar='project_path', type=str)
        parser.add_argument('--host', nargs='?', type=str)
        parser.add_argument('--port', nargs='?', type=int)
        parser.add_argument('--manage-instance', nargs='?', type=str)

        args = dict()
        if len(sys.argv) >= 3:
            args = vars(parser.parse_args(sys.argv[2:]))
            repo_path = args['repo_path']
        else:
            repo_path = os.getcwd()

        start_server(
            host=args.get('host'),
            manage=args.get('manage_instance') == '1',
            port=args.get('port'),
            project=repo_path,
        )
    elif command == 'run' or command == 'test':
        from mage_ai.data_preparation.executors.executor_factory import ExecutorFactory
        from mage_ai.data_preparation.models.pipeline import Pipeline
        from mage_ai.data_preparation.repo_manager import set_repo_path
        from mage_ai.data_preparation.variable_manager import get_global_variables
        from mage_ai.shared.hash import merge_dict

        parser = argparse.ArgumentParser(description='Run pipeline.')
        parser.add_argument('repo_path', metavar='project_path', type=str)
        parser.add_argument('pipeline_uuid', type=str)
        parser.add_argument('--block_uuid', nargs='?', type=str)
        parser.add_argument('--execution_partition', nargs='?', type=str)
        parser.add_argument('--executor_type', nargs='?', type=str)
        parser.add_argument('--callback_url', nargs='?', type=str)
        parser.add_argument('--block_run_id', nargs='?', type=int)
        parser.add_argument('--runtime-vars', nargs="+")
        parser.add_argument('--skip-sensors', type=bool)

        args = vars(parser.parse_args(sys.argv[2:]))
        project_path = args['repo_path']
        pipeline_uuid = args['pipeline_uuid']
        block_uuid = args.get('block_uuid')
        execution_partition = args.get('execution_partition')
        executor_type = args.get('executor_type')
        callback_url = args.get('callback_url')
        runtime_vars = args.get('runtime_vars')
        skip_sensors = args.get('skip_sensors', False)

        runtime_variables = dict()
        if runtime_vars is not None:
            runtime_variables = parse_runtime_variables(runtime_vars)

        project_path = os.path.abspath(project_path)
        set_repo_path(project_path)
        sys.path.append(os.path.dirname(project_path))
        pipeline = Pipeline(pipeline_uuid, repo_path=project_path)

        default_variables = get_global_variables(pipeline_uuid, repo_path=project_path)
        global_vars = merge_dict(default_variables, runtime_variables)

        if block_uuid is None:
            ExecutorFactory.get_pipeline_executor(pipeline).execute(
                analyze_outputs=False,
                global_vars=global_vars,
                run_sensors=not skip_sensors,
                run_tests=command == 'test',
                update_status=False,
            )
        else:
            ExecutorFactory.get_block_executor(
                pipeline,
                block_uuid,
                execution_partition=execution_partition,
                executor_type=executor_type,
            ).execute(
                analyze_outputs=False,
                callback_url=callback_url,
                global_vars=global_vars,
                update_status=False,
            )

    elif command == 'create_spark_cluster':
        from mage_ai.services.aws.emr.launcher import create_cluster

        project_path = os.path.abspath(sys.argv[2])
        create_cluster(project_path)
    else:
        print(f'Unknown command "{command}". Type "mage help" to see what commands are available.')


if __name__ == "__main__":
    main()
