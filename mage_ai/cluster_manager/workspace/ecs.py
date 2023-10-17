import os
from typing import Dict

from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager
from mage_ai.cluster_manager.constants import (
    ECS_CLUSTER_NAME,
    ECS_CONTAINER_NAME,
    ECS_TASK_DEFINITION,
)
from mage_ai.cluster_manager.workspace.base import Workspace


class EcsWorkspace(Workspace):
    def initialize(self, payload: Dict, project_uuid: str):
        cluster_name = payload.get('cluster_name', os.getenv(ECS_CLUSTER_NAME))
        task_definition = payload.get(
            'task_definition',
            os.getenv(ECS_TASK_DEFINITION),
        )
        container_name = payload.get(
            'container_name',
            os.getenv(ECS_CONTAINER_NAME),
        )

        ecs_instance_manager = EcsTaskManager(cluster_name)

        # TODO: Create a service for each workspace
        ecs_instance_manager.create_task(
            self.name,
            task_definition,
            container_name,
        )

    def delete(self, **kwargs):
        task_arn = kwargs.get('task_arn')
        cluster_name = os.getenv(ECS_CLUSTER_NAME)

        ecs_instance_manager = EcsTaskManager(cluster_name)
        ecs_instance_manager.delete_task(self.name, task_arn)

        super().delete(**kwargs)

    def update(self, action, **kwargs):
        task_arn = kwargs.get('task_arn')
        cluster_name = kwargs.get('cluster_name', os.getenv(ECS_CLUSTER_NAME))
        task_definition = kwargs.get(
            'task_definition',
            os.getenv(ECS_TASK_DEFINITION),
        )
        container_name = kwargs.get('container_name', os.getenv(ECS_CONTAINER_NAME))

        ecs_instance_manager = EcsTaskManager(cluster_name)
        if action == 'stop':
            ecs_instance_manager.stop_task(task_arn)
        elif action == 'resume':
            ecs_instance_manager.create_task(
                self.name,
                task_definition,
                container_name,
            )
