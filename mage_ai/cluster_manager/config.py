import os
from dataclasses import dataclass, fields
from typing import Dict, List

from mage_ai.settings.repo import get_repo_path
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
    pvc_retention_policy: str = None
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
class PostStart(BaseConfig):
    command: List[str] = None
    hook_path: str = None

    @classmethod
    def parse_config(self, config: Dict = None) -> Dict:
        hook_path = config.get('hook_path')
        if hook_path and not os.path.isabs(hook_path):
            config['hook_path'] = os.path.join(
                get_repo_path(), hook_path
            )

        return config


@dataclass
class LifecycleConfig(BaseConfig):
    termination_policy: TerminationPolicy = None
    pre_start_script_path: str = None
    post_start: PostStart = None

    @classmethod
    def parse_config(self, config: Dict = None) -> Dict:
        pre_start_script_path = config.get('pre_start_script_path')
        if pre_start_script_path and not os.path.isabs(pre_start_script_path):
            config['pre_start_script_path'] = os.path.join(
                get_repo_path(), pre_start_script_path
            )

        return config
