from dataclasses import dataclass, fields
from typing import Dict

from mage_ai.shared.config import BaseConfig
from mage_ai.shared.hash import extract


@dataclass
class WorkspaceConfig(BaseConfig):
    lifecycle_config: 'LifecycleConfig' = None
    project_uuid: str = None

    @classmethod
    def parse_config(self, config: Dict = None) -> Dict:
        lifecycle_config = config.get('lifecycle_config')
        if lifecycle_config and type(lifecycle_config) is dict:
            config['lifecycle_config'] = LifecycleConfig.load(config=lifecycle_config)

        all_fields = fields(self)
        keys = [field.name for field in all_fields]
        return extract(config, keys)


@dataclass
class KubernetesWorkspaceConfig(WorkspaceConfig):
    namespace: str = None
    container_config: str = None
    ingress_name: str = None
    service_account_name: str = None
    storage_access_mode: str = None
    storage_class_name: str = None
    storage_request_size: str = None


@dataclass
class CloudRunWorkspaceConfig(WorkspaceConfig):
    project_id: str = None
    path_to_credentials: str = None
    region: str = None


@dataclass
class EcsWorkspaceConfig(WorkspaceConfig):
    cluster_name: str = None
    task_definition: str = None
    container_name: str = None


@dataclass
class TerminationPolicy(BaseConfig):
    enable_auto_termination: bool = False
    max_idle_seconds: int = 0


@dataclass
class LifecycleConfig(BaseConfig):
    termination_policy: TerminationPolicy = None
    pre_start_script_path: str = None

    @classmethod
    def parse_config(self, config: Dict = None) -> Dict:
        termination_policy = config.get('termination_policy')
        if termination_policy and type(termination_policy) is dict:
            config['termination_policy'] = TerminationPolicy.load(
                config=termination_policy
            )

        return config
