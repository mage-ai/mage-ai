from typing import Dict
import os
import yaml


class EcsConfig:
    def __init__(self, config_path: str = None, config: Dict = None):
        if config is None:
            self.config_path = config_path
            if self.config_path is None:
                raise Exception(
                    'Please provide a config_path or a config dictionary to initialize'
                    ' an EmrConfig object',
                )
            if not os.path.exists(self.config_path):
                raise Exception(f'ECS config {self.config_path} does not exist.')
            with open(self.config_path) as fp:
                config = yaml.full_load(fp) or {}

        if 'ecs_config' in config:
            config = config['ecs_config']
        self.config = config
        self.task_definition = config.get('task_definition')
        self.container_name = config.get('container_name')
        self.cluster = config.get('cluster')
        self.security_groups = config.get('security_groups')
        self.subnets = config.get('subnets')

    def get_task_config(self, command=None):
        task_config = dict(
            taskDefinition=self.task_definition,
            launchType='FARGATE',
            cluster=self.cluster,
            platformVersion='LATEST',
            count=1,
            networkConfiguration={
                'awsvpcConfiguration': {
                    'subnets': self.subnets,
                    'assignPublicIp': 'ENABLED',
                    'securityGroups': self.security_groups,
                }
            },
        )
        if command is not None:
            task_config['overrides'] = {
                'containerOverrides': [
                    {
                        'name': self.container_name,
                        'command': command.split(' '),
                    },
                ],
            }
        return task_config
