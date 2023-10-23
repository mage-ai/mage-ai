import os

import yaml

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.cluster_manager.config import LifecycleConfig
from mage_ai.cluster_manager.manage import (
    create_workspace,
    delete_workspace,
    get_instances,
    get_workspaces,
    update_workspace,
)
from mage_ai.data_preparation.repo_manager import (
    ProjectType,
    get_project_type,
    get_repo_config,
)
from mage_ai.data_preparation.shared.constants import MANAGE_ENV_VAR
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

        workspaces = get_workspaces(cluster_type, user=query_user)

        return self.build_result_set(workspaces, user, **kwargs)

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        cluster_type = self.verify_project(pk)
        if not cluster_type:
            query = kwargs.get('query', {})
            cluster_type = query.get('cluster_type')[0]

        instances = get_instances(cluster_type)
        instance_map = {
            instance.get('name'): instance
            for instance in instances
        }

        return self(dict(
            name=pk,
            cluster_type=cluster_type,
            instance=instance_map[pk],
        ), user, **kwargs)

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        cluster_type = self.verify_project()
        if not cluster_type:
            cluster_type = payload.get('cluster_type')

        error = ApiError.RESOURCE_ERROR.copy()
        workspace_name = payload.pop('name')
        if not workspace_name:
            error.update(message='Please enter a valid workspace name.')
            raise ApiError(error)

        config = {}
        if 'lifecycle_config' in payload:
            config_yaml = payload.pop('lifecycle_config')
            config = yaml.full_load(config_yaml) or {}
        lifecycle_config = LifecycleConfig(**config)

        try:
            create_workspace(
                cluster_type,
                workspace_name,
                lifecycle_config,
                payload,
            )
        except Exception as ex:
            error.update(message=str(ex))
            raise ApiError(error)

        return self(dict(success=True), user, **kwargs)

    def update(self, payload, **kwargs):
        cluster_type = self.model.get('cluster_type')
        workspace_name = self.model.get('name')

        error = ApiError.RESOURCE_ERROR.copy()
        try:
            update_workspace(
                cluster_type,
                workspace_name,
                **ignore_keys(payload, ['name', 'cluster_type']),
            )
        except Exception as ex:
            error.update(message=str(ex))
            raise ApiError(error)

        return self

    def delete(self, **kwargs):
        cluster_type = self.model.get('cluster_type')
        workspace_name = self.model.get('name')
        instance = self.model.get('instance')

        error = ApiError.RESOURCE_ERROR.copy()

        try:
            delete_workspace(
                cluster_type,
                workspace_name,
                **ignore_keys(instance, ['name', 'cluster_type'])
            )
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
            projects = [f.name.split('.')[0] for f in os.scandir(projects_folder) if not f.is_dir()]
            if subproject not in projects:
                error = ApiError.RESOURCE_NOT_FOUND.copy()
                error.update(message=f'Project {subproject} was not found.')
                raise ApiError(error)

        if project_type == ProjectType.MAIN:
            return get_repo_config().cluster_type
