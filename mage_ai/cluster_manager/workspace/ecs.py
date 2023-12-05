import os

import yaml

from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager
from mage_ai.cluster_manager.config import EcsWorkspaceConfig
from mage_ai.cluster_manager.constants import (
    ECS_CLUSTER_NAME,
    ECS_CONTAINER_NAME,
    ECS_TASK_DEFINITION,
)
from mage_ai.cluster_manager.workspace.base import Workspace
from mage_ai.shared.hash import merge_dict


class EcsWorkspace(Workspace):
    config_class = EcsWorkspaceConfig

    def __init__(self, name: str):
        super().__init__(name)
        self.ecs_instance_manager = EcsTaskManager(
            self.config.cluster_name or os.getenv(ECS_CLUSTER_NAME)
        )

    @classmethod
    def initialize(
        cls,
        name: str,
        config_path: str,
        **kwargs,
    ) -> Workspace:
        cluster_name = kwargs.get('cluster_name', os.getenv(ECS_CLUSTER_NAME))
        task_definition = kwargs.get(
            'task_definition',
            os.getenv(ECS_TASK_DEFINITION),
        )
        container_name = kwargs.get(
            'container_name',
            os.getenv(ECS_CONTAINER_NAME),
        )
        workspace_config = EcsWorkspaceConfig.load(
            config=merge_dict(
                kwargs,
                dict(
                    cluster_name=cluster_name,
                    task_definition=task_definition,
                    container_name=container_name,
                ),
            )
        )
        if config_path:
            with open(config_path, 'w', encoding='utf-8') as fp:
                yaml.dump(
                    workspace_config.to_dict(),
                    fp,
                )

        ecs_instance_manager = EcsTaskManager(cluster_name)

        # TODO: Create a service for each workspace
        ecs_instance_manager.create_task(
            name,
            task_definition,
            container_name,
        )

        return cls(name)

    def delete(self, **kwargs):
        task_arn = kwargs.get('task_arn')
        self.ecs_instance_manager.delete_task(self.name, task_arn)

        super().delete(**kwargs)

    def stop(self, **kwargs):
        task_arn = kwargs.get('task_arn')
        self.ecs_instance_manager.stop_task(task_arn)

    def resume(self, **kwargs):
        task_definition = self.config.task_definition or os.getenv(ECS_TASK_DEFINITION)
        container_name = self.config.container_name or os.getenv(ECS_CONTAINER_NAME)
        self.ecs_instance_manager.create_task(
            self.name,
            task_definition,
            container_name,
        )
