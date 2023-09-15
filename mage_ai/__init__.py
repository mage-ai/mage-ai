import os
import sys


def run(
    pipeline_uuid: str,
    project_path: str = None,
    block_uuid: str = None,
    run_sensors: bool = True,
    **global_vars,
) -> None:
    from mage_ai.data_preparation.executors.executor_factory import ExecutorFactory
    from mage_ai.data_preparation.models.pipeline import Pipeline

    project_path = os.getcwd() if project_path is None else os.path.abspath(project_path)
    sys.path.append(os.path.dirname(project_path))
    pipeline = Pipeline(pipeline_uuid, project_path)
    if block_uuid is None:
        ExecutorFactory.get_pipeline_executor(pipeline).execute(
            analyze_outputs=False,
            global_vars=global_vars,
            run_sensors=run_sensors,
            update_status=False,
        )
    else:
        ExecutorFactory.get_block_executor(pipeline, block_uuid).execute(
            analyze_outputs=False,
            global_vars=global_vars,
            update_status=False,
        )
