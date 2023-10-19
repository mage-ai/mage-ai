import os
import uuid
from typing import Dict, Optional

import ruamel.yaml
import yaml

from mage_ai.cluster_manager.config import LifecycleConfig
from mage_ai.cluster_manager.constants import ClusterType
from mage_ai.cluster_manager.errors import WorkspaceExistsError
from mage_ai.data_preparation.repo_manager import ProjectType, get_project_type
from mage_ai.settings.repo import get_repo_path


class classproperty(property):
    def __get__(self, owner_self, owner_cls):
        return self.fget(owner_cls)


class Workspace:
    def __init__(self, name: str):
        self.name = name

    @classproperty
    def project_folder(cls) -> str:
        return os.path.join(get_repo_path(), 'projects')

    @property
    def config_path(self) -> str:
        return os.path.join(self.project_folder, f'{self.name}.yaml')

    @property
    def lifecycle_config(self) -> Optional[LifecycleConfig]:
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r', encoding='utf-8') as f:
                config = yaml.full_load(f)
                return LifecycleConfig.load(config=config.get('lifecycle_config', {}))

    @classmethod
    def workspace_class_from_type(self, cluster_type: ClusterType) -> 'Workspace':
        from mage_ai.cluster_manager.workspace.cloud_run import CloudRunWorkspace
        from mage_ai.cluster_manager.workspace.ecs import EcsWorkspace
        from mage_ai.cluster_manager.workspace.kubernetes import KubernetesWorkspace

        if cluster_type == ClusterType.K8S:
            return KubernetesWorkspace
        elif cluster_type == ClusterType.CLOUD_RUN:
            return CloudRunWorkspace
        elif cluster_type == ClusterType.ECS:
            return EcsWorkspace

    @classmethod
    def get_workspace(cls, cluster_type: ClusterType, name: str) -> 'Workspace':
        return cls.workspace_class_from_type(cluster_type)(name)

    @classmethod
    def create(
        cls,
        cluster_type: ClusterType,
        name: str,
        lifecycle_config: LifecycleConfig,
        payload: Dict,
    ) -> 'Workspace':
        config_path = None
        project_uuid = None
        project_type = get_project_type()

        if project_type == ProjectType.MAIN:
            if not os.path.exists(cls.project_folder):
                os.makedirs(cls.project_folder)
            config_path = os.path.join(cls.project_folder, f'{name}.yaml')
            if os.path.exists(config_path):
                raise WorkspaceExistsError(
                    f'Project with name {name} already exists'
                )
            yml = ruamel.yaml.YAML()
            yml.preserve_quotes = True
            yml.indent(mapping=2, sequence=2, offset=0)

            project_uuid = uuid.uuid4().hex
            data = dict(project_uuid=project_uuid, lifecycle_config=lifecycle_config.to_dict())

            with open(config_path, 'w', encoding='utf-8') as f:
                yml.dump(data, f)

        workspace = cls.workspace_class_from_type(cluster_type)(name)
        try:
            workspace.initialize(payload, project_uuid)
        except Exception:
            if os.path.exists(workspace.config_path):
                os.remove(workspace.config_path)
            raise

        return workspace

    def initialize(self, payload: Dict, project_uuid: str):
        raise NotImplementedError('Initialize method not implemented')

    def delete(self, **kwargs):
        if get_project_type() == ProjectType.MAIN:
            os.remove(self.config_path)

    def update(self, **kwargs):
        raise NotImplementedError('Update method not implemented')
