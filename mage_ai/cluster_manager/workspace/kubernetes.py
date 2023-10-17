import os
from typing import Dict

from mage_ai.cluster_manager.constants import KUBE_NAMESPACE
from mage_ai.cluster_manager.kubernetes.workload_manager import WorkloadManager
from mage_ai.cluster_manager.workspace.base import Workspace
from mage_ai.data_preparation.repo_manager import ProjectType, get_project_type


class KubernetesWorkspace(Workspace):
    def initialize(self, payload: Dict, project_uuid: str):
        namespace = payload.pop('namespace', os.getenv(KUBE_NAMESPACE))

        k8s_workload_manager = WorkloadManager(namespace)
        project_type = get_project_type()
        extra_args = {}
        if project_type == ProjectType.MAIN:
            extra_args = {
                'project_type': ProjectType.SUB,
                'project_uuid': project_uuid,
            }
        k8s_workload_manager.create_workload(
            self.name,
            self.lifecycle_config,
            **payload,
            **extra_args,
        )

    def delete(self, **kwargs):
        namespace = os.getenv(KUBE_NAMESPACE)

        k8s_workload_manager = WorkloadManager(namespace)
        k8s_workload_manager.delete_workload(self.name)

        super().delete(**kwargs)

    def update(self, action, **kwargs):
        namespace = os.getenv(KUBE_NAMESPACE)
        workload_manager = WorkloadManager(namespace)

        if action == 'stop':
            workload_manager.scale_down_workload(self.name)
        elif action == 'resume':
            workload_manager.restart_workload(self.name)
