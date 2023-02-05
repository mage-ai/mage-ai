from botocore.config import Config
from mage_ai.services.aws.ecs.config import EcsConfig
import boto3
import json
import os


def run_task(
    command: str,
    ecs_config: EcsConfig,
    wait_for_completion: bool = True,
) -> None:
    if type(ecs_config) is dict:
        ecs_config = EcsConfig.load(config=ecs_config)
    client = boto3.client('ecs')
    response = client.run_task(**ecs_config.get_task_config(command=command))

    if wait_for_completion:
        arn = response['tasks'][0]['taskArn']
        waiter = client.get_waiter('tasks_stopped')
        waiter.wait(cluster=ecs_config.cluster, tasks=[arn])

    print(json.dumps(response, indent=4, default=str))
    return response


def stop_task(task_arn: str, cluster: str = None) -> None:
    client = boto3.client('ecs')
    return client.stop_task(
        cluster=cluster,
        task=task_arn,
    )


def list_tasks(cluster):
    region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
    config = Config(region_name=region_name)
    ecs_client = boto3.client('ecs', config=config)

    task_arns = ecs_client.list_tasks(
        cluster=cluster,
    )['taskArns']

    return ecs_client.describe_tasks(
        cluster=cluster,
        include=[
            'TAGS',
        ],
        tasks=task_arns,
    )
