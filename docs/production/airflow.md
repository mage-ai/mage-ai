# Run pipeline in Airflow
We support running the pipeline in Airflow DAGs. You need to firstly install `mage_ai` library by adding `mage_ai` to your requirements.txt file. Then you need to download the mage pipeline code into your Airflow directory. You can achieve it by using a git submodule in your Airflow directory.

We provide multiple ways to run mage pipelines in Airflow.
1. [Create DAGs for all pipelines in a Mage project](#create-dags-for-all-the-pipelines-in-mage-project)
1. [Run one pipeline in a BashOperator](#run-pipeline-in-a-bashoperator)
1. [Run one pipeline in a PythonOperator](#run-pipeline-in-a-pythonoperator)
1. [Run one pipeine as an Airflow DAG](#run-pipeline-as-an-airflow-dag)


## Create DAGs for all the pipelines in Mage project
```python
from airflow import DAG
from airflow.operators.python_operator import PythonOperator
from datetime import datetime
from mage_ai.orchestration.airflow import create_dags
import os


ABSOLUTE_PATH = os.path.abspath(os.path.dirname(__file__))
project_path = os.path.join(ABSOLUTE_PATH, 'project_path')

create_dags(
    project_path,
    DAG,
    PythonOperator,
    blacklist_pipelines=[],     # Blacklisted pipeline uuids
    dag_settings=dict(
        start_date=datetime(2022, 8, 2),
    ),
)
```


## Run pipeline in a BashOperator

Example code:
```python
from airflow import DAG
from airflow.operators.bash_operator import BashOperator
from datetime import datetime
import os


ABSOLUTE_PATH = os.path.abspath(os.path.dirname(__file__))
project_path = os.path.join(ABSOLUTE_PATH, 'project_path')
pipeline_name = 'pipline_name'

dag = DAG(
    'test_mage_pipeline',
    start_date=datetime(2022, 7, 14),
    description='Test running mage pipeline.',
    schedule_interval='@once',
    catchup=False,
)

task = BashOperator(
    dag=dag,
    task_id='run_pipeline',
    bash_command=f'mage run {project_path} {pipeline_name}',
)
```

## Run pipeline in a PythonOperator

Example code:

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
import mage_ai
import os


ABSOLUTE_PATH = os.path.abspath(os.path.dirname(__file__))
project_path = os.path.join(ABSOLUTE_PATH, 'project_path')
pipeline_name = 'pipline_name'

dag = DAG(
    'test_mage_pipeline',
    start_date=datetime(2022, 7, 14),
    description='Test running mage pipeline.',
    schedule_interval='@once',
    catchup=False,
)


def build_execute_pipeline(project_path, pipeline_name):
    def _callable(ds, **kwargs):
        mage_ai.run(pipeline_name, project_path)
    return _callable


task = PythonOperator(
    dag=dag,
    task_id='run_pipeline',
    python_callable=build_execute_pipeline(project_path, pipeline_name),
)
```

## Run pipeline as an Airflow DAG

Example code:
```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.shared.hash import ignore_keys
import os


ABSOLUTE_PATH = os.path.abspath(os.path.dirname(__file__))
project_path = os.path.join(ABSOLUTE_PATH, 'project_path')
pipeline_name = 'pipline_name'

dag = DAG(
    'test_mage_pipeline',
    start_date=datetime(2022, 7, 14),
    description='Test running mage pipeline.',
    schedule_interval='@once',
    catchup=False,
)


pipeline = Pipeline(pipeline_name, repo_path=project_path)

tasks = []


def build_execute_block(block):
    def _callable(ds, **kwargs):
        block.execute_sync(
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
        task_operator = PythonOperator(dag=dag, **ignore_keys(task_dict, [
            'upstream_task_ids',
        ]))
        operators[task_operator.task_id] = task_operator

    for task_dict in tasks:
        for task_id in task_dict.get('upstream_task_ids', []):
            dag.set_dependency(task_id, task_dict['task_id'])

    return operators


initialize_tasks(dag, tasks)
```
