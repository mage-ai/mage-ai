import abc
import os
import uuid
from typing import Dict, Optional

from mage_ai.cluster_manager.config import LifecycleConfig, WorkspaceConfig
from mage_ai.cluster_manager.constants import ClusterType
from mage_ai.cluster_manager.errors import WorkspaceExistsError
from mage_ai.data_preparation.repo_manager import (
    ProjectType,
    get_project_type,
    get_repo_config,
)
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.models.oauth import Permission, User
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import merge_dict


class classproperty(property):
    def __get__(self, owner_self, owner_cls):
        return self.fget(owner_cls)


class Workspace(abc.ABC):
    config_class = None
    cluster_type = None

    def __init__(self, name: str):
        self.name = name
        self._config = None

    @classproperty
    def project_folder(self) -> str:
        return os.path.join(get_repo_path(), 'projects')

    @property
    def config_path(self) -> str:
        return os.path.join(self.project_folder, f'{self.name}.yaml')

    @property
    def config(self) -> WorkspaceConfig:
        if self.config_class and not self._config:
            if os.path.exists(self.config_path):
                self._config = self.config_class.load(config_path=self.config_path)
            else:
                self._config = self.config_class()

        return self._config

    @property
    def lifecycle_config(self) -> LifecycleConfig:
        return self.config.lifecycle_config or LifecycleConfig()

    @property
    def project_uuid(self) -> Optional[str]:
        return self.config.project_uuid

    def get_access(self, user: User) -> int:
        return user.get_access(Entity.PROJECT, self.project_uuid)

    @classmethod
    def workspace_class_from_type(cls, cluster_type: ClusterType) -> 'Workspace':
        if cluster_type == ClusterType.K8S:
            from mage_ai.cluster_manager.workspace.kubernetes import KubernetesWorkspace

            return KubernetesWorkspace
        elif cluster_type == ClusterType.CLOUD_RUN:
            from mage_ai.cluster_manager.workspace.cloud_run import CloudRunWorkspace

            return CloudRunWorkspace
        elif cluster_type == ClusterType.ECS:
            from mage_ai.cluster_manager.workspace.ecs import EcsWorkspace

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
        """
        Create workspace with the specified parameters
        1. If the current project is a main project, create the config yaml file in the
        `repo_path/projects` folder.
        2. If the config file already exists, throw a WorkspaceExistsError.
        3. Get the workspace class from the `cluster_type` parameter, and initialize the
        workspace.

        Args:
            cluster_type (ClusterType): specifies what kind of infrastructure to use for the
                workspace
            name (str): the name of the new workspace
            payload (Dict): payload for creating the workspace. The payload can have various
                cluster specific parameters or workspace config

        Returns:
            Workspace: the created workspace. The returned workspace object will be a
                Workspace subclass based on the `cluster_type` param.
        """
        config_path = None
        project_uuid = None
        project_type = get_project_type()

        data = dict()
        if project_type == ProjectType.MAIN:
            if not os.path.exists(cls.project_folder):
                os.makedirs(cls.project_folder)
            config_path = os.path.join(cls.project_folder, f'{name}.yaml')
            if os.path.exists(config_path):
                raise WorkspaceExistsError(f'Project with name {name} already exists')

            project_uuid = uuid.uuid4().hex
            data['project_uuid'] = project_uuid
            data['workspace_initial_metadata'] = get_repo_config().workspace_initial_metadata

        workspace_class = cls.workspace_class_from_type(cluster_type)

        try:
            return workspace_class.initialize(
                name, config_path, **merge_dict(payload, data)
            )
        except Exception:
            if config_path and os.path.exists(config_path):
                os.remove(config_path)
            raise

    @classmethod
    @abc.abstractmethod
    def initialize(
        cls,
        name: str,
        config_path: str,
        **kwargs,
    ) -> 'Workspace':
        """
        Initialize the workspace and the corresponding cloud instance.

        Returns:
            Workspace: the initialized workspace
        """
        raise NotImplementedError('Initialize method not implemented')

    def update(self, payload: Dict, **kwargs):
        """
        Update the workspace configuration.
        """
        raise NotImplementedError('Update method not implemented')

    @abc.abstractmethod
    @safe_db_query
    def delete(self, **kwargs):
        """
        Delete the workspace. Individual workspace classes should still implement
        this method to delete the cloud instance.
        """
        if get_project_type() == ProjectType.MAIN:
            if os.path.exists(self.config_path):
                os.remove(self.config_path)

            # delete workspace permissions
            Permission.query.filter(
                Permission.entity == Entity.PROJECT,
                Permission.entity_id == self.project_uuid,
            ).delete(synchronize_session=False)
            db_connection.session.commit()

    @abc.abstractmethod
    def stop(self):
        """
        Stop the workspace. The workspace metadata should not be deleted, but the cloud
        instance should be stopped or paused.
        """
        raise NotImplementedError('Stop method not implemented')

    @abc.abstractmethod
    def resume(self, **kwargs):
        """
        Resume the workspace after being stopped.
        """
        raise NotImplementedError('Resume method not implemented')

    def to_dict(self):
        return dict(
            name=self.name,
            **self.config.to_dict(),
        )
