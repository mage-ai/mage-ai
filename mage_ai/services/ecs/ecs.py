from mage_ai.services.ecs.config import EcsConfig
import boto3
import json


def run_task(command, ecs_config):
    if type(ecs_config) is dict:
        ecs_config = EcsConfig(config=ecs_config)
    client = boto3.client('ecs')
    response = client.run_task(**ecs_config.get_task_config(command=command))
    print(json.dumps(response, indent=4, default=str))
