import json
import os
from typing import Dict, List

import boto3
from botocore.config import Config

from mage_ai.services.aws.ecs.config import EcsConfig


def run_task(
    command: str,
    ecs_config: EcsConfig,
    wait_for_completion: bool = True,
) -> None:
    if type(ecs_config) is dict:
        ecs_config = EcsConfig.load(config=ecs_config)
    client = boto3.client('ecs')
    response = client.run_task(**ecs_config.get_task_config(command=command))

    print(json.dumps(response, indent=4, default=str))

    if wait_for_completion:
        arn = response['tasks'][0]['taskArn']
        waiter = client.get_waiter('tasks_stopped')
        waiter.wait(cluster=ecs_config.cluster, tasks=[arn])

        tasks = client.describe_tasks(
            cluster=ecs_config.cluster,
            tasks=[arn]
        ).get('tasks')

        if not tasks:
            raise Exception('Failed to get ECS task status.')

        containers = [c for c in tasks[0]['containers'] if c['name'] == ecs_config.container_name]
        if not containers:
            raise Exception(f'Failed to get status from container {ecs_config.container_name}')

        exit_code = containers[0]['exitCode']
        if exit_code != 0:
            raise Exception(f'Container {ecs_config.container_name}'
                            f' returns non-zero exit code: {exit_code}')

    return response


def stop_task(task_arn: str, cluster: str = None) -> None:
    client = boto3.client('ecs')
    return client.stop_task(
        cluster=cluster,
        task=task_arn,
    )


def list_tasks(cluster) -> List[Dict]:
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
    )['tasks']


def list_services(cluster) -> List[Dict]:
    region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
    config = Config(region_name=region_name)
    ecs_client = boto3.client('ecs', config=config)

    service_arns = ecs_client.list_services(
        cluster=cluster,
    )['serviceArns']

    return ecs_client.describe_services(
        cluster=cluster,
        include=[
            'TAGS',
        ],
        services=service_arns,
    )['services']
