import os
import uuid
from typing import Dict, Optional

import yaml

from mage_ai.cluster_manager.config import LifecycleConfig
from mage_ai.cluster_manager.constants import ClusterType
from mage_ai.cluster_manager.errors import WorkspaceExistsError
from mage_ai.data_preparation.repo_manager import ProjectType, get_project_type
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db.models.oauth import User
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
    def config(self) -> Dict:
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return yaml.full_load(f)
        return dict()

    @property
    def lifecycle_config(self) -> LifecycleConfig:
        return LifecycleConfig.load(config=self.config.get('lifecycle_config', {}))

    @property
    def project_uuid(self) -> Optional[str]:
        self.config.get('project_uuid')

    def get_access(self, user: User) -> int:
        return user.get_access(Entity.PROJECT, self.project_uuid)

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
        payload: Dict,
    ) -> 'Workspace':
        config_path = None
        project_uuid = None
        project_type = get_project_type()

        data = dict()
        if project_type == ProjectType.MAIN:
            if not os.path.exists(cls.project_folder):
                os.makedirs(cls.project_folder)
            config_path = os.path.join(cls.project_folder, f'{name}.yaml')
            if os.path.exists(config_path):
                raise WorkspaceExistsError(
                    f'Project with name {name} already exists'
                )

            project_uuid = uuid.uuid4().hex
            data['project_uuid'] = project_uuid

        workspace_class = cls.workspace_class_from_type(cluster_type)
        try:
            return workspace_class.initialize(name, config_path, **payload, **data)
        except Exception:
            if config_path and os.path.exists(config_path):
                os.remove(config_path)
            raise

    @classmethod
    def initialize(
        cls,
        name: str,
        config_path: str,
        **kwargs,
    ) -> 'Workspace':
        raise NotImplementedError('Initialize method not implemented')

    def delete(self, **kwargs):
        if get_project_type() == ProjectType.MAIN:
            os.remove(self.config_path)

    def stop(self):
        raise NotImplementedError('Stop method not implemented')

    def resume(self, **kwargs):
        raise NotImplementedError('Resume method not implemented')

    def to_dict(self):
        return dict(
            name=self.name,
            **self.config,
        )
