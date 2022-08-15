from datetime import datetime
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.shared.hash import ignore_keys, merge_dict
from typing import Dict, List, Any
import mage_ai


def create_dag(
    project_path: str,
    pipeline_uuid: str,
    dag_class,
    python_operator_class,
    dag_settings: Dict[str, Any] = dict(),
    globals_dict: Dict[str, Any] = dict(),
):
    pipeline = Pipeline(pipeline_uuid, repo_path=project_path)

    tasks = []

    def build_execute_block(block):
        # Airflow v1.x will error unless we use *args instead of ds explicitly.
        def _callable(*args, **kwargs):
            mage_ai.run(
                pipeline_uuid,
                project_path=project_path,
                block_uuid=block.uuid,
                analyze_outputs=False,
                update_status=False,
            )

        return _callable

    for uuid, b in pipeline.blocks_by_uuid.items():
        if b.type == 'scratchpad':
            continue
        tasks.append(dict(
            task_id=uuid,
            upstream_task_ids=b.upstream_block_uuids,
            python_callable=build_execute_block(b),
        ))

    def initialize_tasks(dag, tasks):
        operators = {}

        for task_dict in tasks:
            task_operator = python_operator_class(dag=dag, **ignore_keys(task_dict, [
                'upstream_task_ids',
            ]))
            operators[task_operator.task_id] = task_operator

        for task_dict in tasks:
            for task_id in task_dict.get('upstream_task_ids', []):
                dag.set_dependency(task_id, task_dict['task_id'])

        return operators

    if len(tasks) >= 1:
        dag_id = f'mage_pipeline_{pipeline_uuid}'
        dag = dag_class(
            f'mage_pipeline_{pipeline_uuid}',
            **merge_dict(
                dict(
                    start_date=datetime(2022, 7, 14),
                    description=f'Mage pipeline: {pipeline_uuid}.',
                    schedule_interval='@once',
                    catchup=False,
                ),
                dag_settings,
            )
        )
        globals_dict[dag_id] = dag

        initialize_tasks(dag, tasks)


def create_dags(
    project_path: str,
    dag_class,
    python_operator_class,
    blacklist_pipelines: List[str] = [],
    dag_settings: Dict[str, Any] = dict(),
    globals_dict: Dict[str, Any] = dict(),
):
    all_pipeline_uuids = Pipeline.get_all_pipelines(project_path)
    for pipeline_uuid in all_pipeline_uuids:
        if pipeline_uuid not in blacklist_pipelines:
            create_dag(
                project_path,
                pipeline_uuid,
                dag_class,
                python_operator_class,
                dag_settings,
                globals_dict,
            )
