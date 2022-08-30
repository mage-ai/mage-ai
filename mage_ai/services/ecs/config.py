from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig
from typing import Dict, List


@dataclass
class EcsConfig(BaseConfig):
    task_definition: str
    container_name: str
    cluster: str
    security_groups: List[str]
    subnets: List[str]
    cpu: int = 512
    memory: int = 1024

    def get_task_config(self, command: str = None) -> Dict:
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
                        'cpu': self.cpu,
                        'memory': self.memory,
                    },
                ],
                'cpu': str(self.cpu),
                'memory': str(self.memory),
            }
        return task_config
