import os

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.cluster_manager.manage import get_instances, get_workspaces
from mage_ai.cluster_manager.workspace.base import Workspace
from mage_ai.cluster_manager.workspace.kubernetes import KubernetesWorkspace
from mage_ai.data_preparation.repo_manager import (
    ProjectType,
    get_project_type,
    get_repo_config,
)
from mage_ai.data_preparation.shared.constants import MANAGE_ENV_VAR
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.server.logger import Logger
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import ignore_keys

logger = Logger().new_server_logger(__name__)


class WorkspaceResource(GenericResource):
    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        cluster_type = self.verify_project()
        if not cluster_type:
            cluster_type = query_arg.get('cluster_type', [None])
            if cluster_type:
                cluster_type = cluster_type[0]

        user_id = query_arg.get('user_id', [None])
        query_user = None
        if user_id:
            user_id = user_id[0]
            if user_id:
                query_user = User.query.get(user_id)

        namespaces = query_arg.get('namespace[]', [])
        if namespaces and len(namespaces) == 1:
            namespaces = namespaces[0]
        if namespaces and isinstance(namespaces, str):
            namespaces = namespaces.split(',')

        instances = get_instances(cluster_type, namespaces=namespaces)
        instance_map = {instance.get('name'): instance for instance in instances}

        workspaces = get_workspaces(cluster_type, namespaces=namespaces)

        result_set = [
            dict(
                workspace=workspace,
                access=query_user.get_access(
                    Entity.PROJECT,
                    workspace.project_uuid,
                )
                if query_user
                else None,
                instance=instance_map.get(workspace.name),
            )
            for workspace in workspaces
            if workspace.name in instance_map
        ]

        return self.build_result_set(result_set, user, **kwargs)

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        cluster_type = self.verify_project()
        if not cluster_type:
            cluster_type = payload.pop('cluster_type')

        error = ApiError.RESOURCE_ERROR.copy()
        workspace_name = payload.pop('name')
        if not workspace_name:
            error.update(message='Please enter a valid workspace name.')
            raise ApiError(error)

        try:
            Workspace.create(
                cluster_type,
                workspace_name,
                payload,
            )
        except Exception as ex:
            error.update(message=str(ex))
            raise ApiError(error)

        return self(dict(success=True), user, **kwargs)

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        cluster_type = self.verify_project(pk)
        if not cluster_type:
            query = kwargs.get('query', {})
            cluster_type = query.get('cluster_type')[0]

        workspace = Workspace.get_workspace(cluster_type, pk)

        kw = dict()
        if isinstance(workspace, KubernetesWorkspace):
            kw['namespaces'] = [workspace.namespace]

        instances = get_instances(cluster_type, **kw)
        instance_map = {instance.get('name'): instance for instance in instances}

        return self(
            dict(
                workspace=workspace,
                instance=instance_map.get(pk),
            ),
            user,
            **kwargs,
        )

    def update(self, payload, **kwargs):
        workspace = self.model.get('workspace')

        error = ApiError.RESOURCE_ERROR.copy()
        try:
            action = payload.pop('action')
            args = ignore_keys(payload, ['name', 'cluster_type'])
            if action == 'stop':
                workspace.stop(**args)
            elif action == 'resume':
                workspace.resume(**args)
            elif action == 'add_to_ingress':
                if isinstance(workspace, KubernetesWorkspace):
                    workspace.add_to_ingress(**args)
                else:
                    raise Exception('This workspace does not support ingress.')
        except Exception as ex:
            error.update(message=str(ex))
            raise ApiError(error)

        return self

    def delete(self, **kwargs):
        workspace = self.model.get('workspace')
        instance = self.model.get('instance') or {}

        error = ApiError.RESOURCE_ERROR.copy()

        try:
            workspace.delete(**ignore_keys(instance, ['name', 'cluster_type']))
        except Exception as ex:
            error.update(message=str(ex))
            raise ApiError(error)

        return self

    @classmethod
    def verify_project(self, subproject: str = None) -> str:
        project_type = get_project_type()
        if project_type != ProjectType.MAIN and os.getenv(MANAGE_ENV_VAR) != '1':
            error = ApiError.RESOURCE_ERROR.copy()
            error.update(message='This project is ineligible for workspace management.')
            raise ApiError(error)

        if project_type == ProjectType.MAIN and subproject:
            repo_path = get_repo_path()
            projects_folder = os.path.join(repo_path, 'projects')
            projects = [
                f.name.split('.')[0]
                for f in os.scandir(projects_folder)
                if not f.is_dir()
            ]
            if subproject not in projects:
                error = ApiError.RESOURCE_NOT_FOUND.copy()
                error.update(message=f'Project {subproject} was not found.')
                raise ApiError(error)

        if project_type == ProjectType.MAIN:
            return get_repo_config().cluster_type
