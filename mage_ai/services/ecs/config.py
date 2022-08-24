from dataclasses import dataclass
from mage_ai.services.config import BaseConfig
from typing import Dict, List


@dataclass
class EcsConfig(BaseConfig):
    task_definition: str
    container_name: str
    cluster: str
    security_groups: List[str]
    subnets: List[str]

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
                    },
                ],
            }
        return task_config
