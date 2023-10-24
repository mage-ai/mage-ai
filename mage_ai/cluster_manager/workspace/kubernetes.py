import os

import yaml

from mage_ai.cluster_manager.config import KubernetesWorkspaceConfig
from mage_ai.cluster_manager.constants import KUBE_NAMESPACE, ClusterType
from mage_ai.cluster_manager.kubernetes.workload_manager import WorkloadManager
from mage_ai.cluster_manager.workspace.base import Workspace
from mage_ai.data_preparation.repo_manager import ProjectType, get_project_type
from mage_ai.shared.hash import merge_dict


class KubernetesWorkspace(Workspace):
    config_class = KubernetesWorkspaceConfig

    def __init__(self, name: str):
        super().__init__(name)
        self.cluster_type = ClusterType.K8S
        self.workload_manager = WorkloadManager(
            self.config.namespace or os.getenv(KUBE_NAMESPACE)
        )

    @classmethod
    def initialize(
        cls,
        name: str,
        config_path: str,
        **kwargs,
    ) -> Workspace:
        """
        Initialize a KubernetesWorkspace object with configuration options.

        This class method is used to create and initialize a Workspace object. It offers
        flexibility by accepting various configuration options through keyword arguments.

        1. Extract the namespace from the kwargs or use the KUBE_NAMESPACE environment variable.
        2. Create a KubernetesWorkspaceConfig object with the keyword arguments and namespace.
        3. If config_path is provided, write the workspace config to a YAML configuration file.
        4. Initialize a WorkloadManager with the workspace namespace.
        4. Create a k8s workload using the WorkloadManager with the workspace config.
        5. Return an instance of the class (Workspace) with the provided name.

        Args:
            name (str): The name of the workspace.
            config_path (str): The path to the configuration file.
            **kwargs: Additional keyword arguments for configuration.

        Returns:
            Workspace: An initialized Workspace object.
        """
        namespace = kwargs.pop('namespace', os.getenv(KUBE_NAMESPACE))
        workspace_config = KubernetesWorkspaceConfig.load(
            config=merge_dict(
                kwargs,
                dict(
                    namespace=namespace,
                ),
            )
        )
        if config_path:
            with open(config_path, 'w', encoding='utf-8') as fp:
                yaml.dump(
                    workspace_config.to_dict(),
                    fp,
                )

        workload_manager = WorkloadManager(namespace)

        extra_args = {}
        if get_project_type() == ProjectType.MAIN:
            extra_args = {
                'project_type': ProjectType.SUB,
            }
        workload_manager.create_workload(
            name,
            workspace_config,
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
