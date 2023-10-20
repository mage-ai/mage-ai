import os

import yaml

from mage_ai.cluster_manager.config import LifecycleConfig
from mage_ai.cluster_manager.constants import KUBE_NAMESPACE
from mage_ai.cluster_manager.kubernetes.workload_manager import WorkloadManager
from mage_ai.cluster_manager.workspace.base import Workspace
from mage_ai.data_preparation.repo_manager import ProjectType, get_project_type
from mage_ai.shared.hash import merge_dict


class KubernetesWorkspace(Workspace):
    def __init__(self, name: str):
        super().__init__(name)
        self.workload_manager = WorkloadManager(
            self.config.get('namespace', os.getenv(KUBE_NAMESPACE)))

    @classmethod
    def initialize(
        cls,
        name: str,
        config_path: str,
        **kwargs,
    ) -> Workspace:
        project_type = get_project_type()
        extra_args = {}
        if project_type == ProjectType.MAIN:
            extra_args = {
                'project_type': ProjectType.SUB,
            }

        namespace = kwargs.pop('namespace', os.getenv(KUBE_NAMESPACE))

        with open(config_path, 'w', encoding='utf-8') as fp:
            yaml.dump(
                merge_dict(
                    kwargs,
                    dict(
                        namespace=namespace,
                    ),
                ),
                fp,
            )

        workload_manager = WorkloadManager(namespace)

        lifecycle_config = kwargs.pop('lifecycle_config', dict())
        workload_manager.create_workload(
            name,
            LifecycleConfig.load(config=lifecycle_config),
            **kwargs,
            **extra_args,
        )

        return cls(name)

    def delete(self, **kwargs):
        self.workload_manager.delete_workload(self.name)

        super().delete(**kwargs)

    def stop(self, **kwargs):
        self.workload_manager.scale_down_workload(self.name)

    def resume(self, **kwargs):
        self.workload_manager.restart_workload(self.name)
