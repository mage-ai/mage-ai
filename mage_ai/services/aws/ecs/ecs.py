from typing import List
from botocore.config import Config
from mage_ai.services.aws.ecs.config import EcsConfig
import boto3
import json
import os


def run_task(command: str, ecs_config: EcsConfig) -> None:
    if type(ecs_config) is dict:
        ecs_config = EcsConfig.load(config=ecs_config)
    client = boto3.client('ecs')
    response = client.run_task(**ecs_config.get_task_config(command=command))
    print(json.dumps(response, indent=4, default=str))


def create_environment_task(
    cluster: str,
    subnets: List[str],
    security_groups: List[str],
    task_definition: str,
    **kwargs
) -> None:
    region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
    config = Config(region_name=region_name)
    ecs_client = boto3.client('ecs', config=config)

    return ecs_client.run_task(
        cluster=cluster,
        count=1,
        launchType='FARGATE',
        networkConfiguration={
            'awsvpcConfiguration': {
                'subnets': subnets,
                'securityGroups': security_groups,
                'assignPublicIp': 'ENABLED',
            }
        },
        taskDefinition=task_definition,
        **kwargs,
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
        tasks=task_arns,
    )
