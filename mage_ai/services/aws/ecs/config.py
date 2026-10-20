import os
from dataclasses import dataclass, field
from typing import Dict, List, Union

import boto3
import requests

from mage_ai.shared.config import BaseConfig

ECS_CONTAINER_METADATA_URI_VAR = 'ECS_CONTAINER_METADATA_URI_V4'


@dataclass
class EcsConfig(BaseConfig):
    task_definition: str
    container_name: str
    cluster: str
    security_groups: List[str]
    subnets: List[str]
    assign_public_ip: bool = True
    cpu: int = 512
    enable_execute_command: bool = False
    launch_type: str = 'FARGATE'
    memory: int = 1024
    network_configuration: Dict = None
    tags: List = field(default_factory=list)
    wait_timeout: int = 600

    @classmethod
    def load_extra_config(self):
        ecs_container_metadata_uri = os.getenv(ECS_CONTAINER_METADATA_URI_VAR)
        if ecs_container_metadata_uri is None:
            return dict()

        container_metadata = requests.get(ecs_container_metadata_uri).json()
        container_name = container_metadata['Name']
        task_metadata = requests.get(ecs_container_metadata_uri + '/task').json()
        cluster = task_metadata.get('Cluster').split('/')[-1]
        task_definition = task_metadata.get('Family')
        task_arn = task_metadata.get('TaskARN')

        ecs_client = boto3.client('ecs')
        ec2_client = boto3.resource('ec2')
        task_config = ecs_client.describe_tasks(
            cluster=cluster,
            tasks=[task_arn],
        )['tasks'][0]

        eni_configs = [a for a in task_config['attachments']
                       if a['type'] == 'ElasticNetworkInterface']
        subnets = []
        security_groups = []
        for c in eni_configs:
            for detail in c['details']:
                if detail['name'] == 'subnetId':
                    subnets.append(detail['value'])
                elif detail['name'] == 'networkInterfaceId':
                    network_interface = ec2_client.NetworkInterface(detail['value'])
                    for group in network_interface.groups:
                        security_groups.append(group['GroupId'])

        return dict(
            cluster=cluster,
            subnets=subnets,
            security_groups=security_groups,
            task_definition=task_definition,
            container_name=container_name,
        )

    def get_task_config(self, command: Union[str, Dict] = None) -> Dict:
        network_configuration = self.network_configuration
        if network_configuration is None:
            network_configuration = {
                'awsvpcConfiguration': {
                    'subnets': self.subnets,
                    'assignPublicIp': 'ENABLED' if self.assign_public_ip else 'DISABLED',
                    'securityGroups': self.security_groups,
                }
            }

        task_config = dict(
            cluster=self.cluster,
            count=1,
            enableExecuteCommand=self.enable_execute_command,
            launchType=self.launch_type,
            networkConfiguration=network_configuration,
            platformVersion='LATEST',
            propagateTags='TASK_DEFINITION',
            tags=self.tags,
            taskDefinition=self.task_definition,
        )
        if command is not None:
            task_config['overrides'] = {
                'containerOverrides': [
                    {
                        'name': self.container_name,
                        'command': command.split(' ') if isinstance(command, str) else command,
                        'cpu': self.cpu,
                        'memory': self.memory,
                    },
                ],
                'cpu': str(self.cpu),
                'memory': str(self.memory),
            }
        return task_config
