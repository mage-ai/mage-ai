import os
import shutil
from typing import Dict, List

import yaml

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.cluster_manager.constants import (
    ECS_CLUSTER_NAME,
    ECS_CONTAINER_NAME,
    ECS_TASK_DEFINITION,
    GCP_PATH_TO_KEYFILE,
    GCP_PROJECT_ID,
    GCP_REGION,
    KUBE_NAMESPACE,
    KUBE_SERVICE_ACCOUNT_NAME,
    KUBE_STORAGE_CLASS_NAME,
)
from mage_ai.data_preparation.repo_manager import (
    ProjectType,
    get_project_type,
    get_repo_config,
    get_repo_path,
    init_repo,
)
from mage_ai.data_preparation.shared.constants import MANAGE_ENV_VAR
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import Permission, Role, User
from mage_ai.server.api.clusters import ClusterType
from mage_ai.server.logger import Logger
from mage_ai.settings import REQUIRE_USER_AUTHENTICATION

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
            query_user = User.query.get(user_id)

        instances = self.get_instances(cluster_type)
        instance_map = {
            instance.get('name'): instance
            for instance in instances
        }

        is_main_project = get_project_type() == ProjectType.MAIN

        repo_path = get_repo_path()
        projects_folder = os.path.join(repo_path, 'projects')
        if is_main_project:
            projects = [f.name for f in os.scandir(projects_folder) if f.is_dir()]
        else:
            projects = [instance.get('name') for instance in instances]

        workspaces = []
        for project in projects:
            if project in instance_map:
                try:
                    repo_path = os.path.join(projects_folder, project, project)
                    config = get_repo_config(repo_path=repo_path)
                    project_uuid = config.project_uuid
                    workspace = dict(
                        name=project,
                        project_uuid=project_uuid,
                        repo_path=repo_path,
                        cluster_type=cluster_type,
                        instance=instance_map[project],
                    )
                    if is_main_project and query_user:
                        workspace['access'] = query_user.get_access(
                            Permission.Entity.PROJECT,
                            repo_path,
                        )
                    workspaces.append(workspace)
                except Exception as e:
                    print(f'Error fetching workspace: {str(e)}')

        return self.build_result_set(workspaces, user, **kwargs)

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        cluster_type = self.verify_project(pk)
        if not cluster_type:
            query = kwargs.get('query', {})
            cluster_type = query.get('cluster_type')[0]

        instances = self.get_instances(cluster_type)
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

        workspace_name = payload.get('name')

        error = ApiError.RESOURCE_ERROR.copy()

        workspace_folder = None
        project_uuid = None
        project_type = get_project_type()
        if project_type == ProjectType.MAIN:
            workspace_folder = os.path.join(get_repo_path(), 'projects', workspace_name)
            if os.path.exists(workspace_folder):
                error.update(message=f'Project with name {workspace_name} already exists')
                raise ApiError(error)
            try:
                project_uuid = init_repo(
                    workspace_folder,
                    project_type=ProjectType.SUB,
                    cluster_type=cluster_type,
                )
            except Exception as e:
                error.update(message=f'Error creating project: {str(e)}')
                raise ApiError(error)
        try:
            if cluster_type == ClusterType.K8S:
                from mage_ai.cluster_manager.kubernetes.workload_manager import (
                    WorkloadManager,
                )
                namespace = payload.get('namespace', os.getenv(KUBE_NAMESPACE))
                storage_class_name = payload.get(
                    'storage_class_name',
                    os.getenv(KUBE_STORAGE_CLASS_NAME),
                )
                service_account_name = payload.get(
                    'service_account_name',
                    os.getenv(KUBE_SERVICE_ACCOUNT_NAME),
                )
                container_config_yaml = payload.get('container_config')
                container_config = None
                if container_config_yaml:
                    container_config = yaml.full_load(container_config_yaml)

                k8s_workload_manager = WorkloadManager(namespace)
                k8s_workload_manager.create_stateful_set(
                    workspace_name,
                    container_config=container_config,
                    service_account_name=service_account_name,
                    storage_class_name=storage_class_name,
                    volume_host_path=workspace_folder,
                )
            elif cluster_type == ClusterType.ECS:
                from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager
                cluster_name = payload.get('cluster_name', os.getenv(ECS_CLUSTER_NAME))
                task_definition = payload.get(
                    'task_definition',
                    os.getenv(ECS_TASK_DEFINITION),
                )
                container_name = payload.get(
                    'container_name',
                    os.getenv(ECS_CONTAINER_NAME),
                )

                ecs_instance_manager = EcsTaskManager(cluster_name)

                ecs_instance_manager.create_task(
                    workspace_name,
                    task_definition,
                    container_name,
                )
            elif cluster_type == ClusterType.CLOUD_RUN:
                from mage_ai.cluster_manager.gcp.cloud_run_service_manager import (
                    CloudRunServiceManager,
                )
                project_id = payload.get('project_id', os.getenv(GCP_PROJECT_ID))
                path_to_credentials = payload.get(
                    'path_to_credentials',
                    os.getenv('path_to_keyfile')
                )
                region = payload.get('region', os.getenv('GCP_REGION'))

                cloud_run_service_manager = CloudRunServiceManager(
                    project_id,
                    path_to_credentials,
                    region=region
                )

                cloud_run_service_manager.create_service(workspace_name)
        except Exception as e:
            if workspace_folder and os.path.exists(workspace_folder):
                shutil.rmtree(workspace_folder)
            error.update(message=str(e))
            raise ApiError(error)

        if project_type == ProjectType.MAIN and \
                project_uuid is not None and \
                REQUIRE_USER_AUTHENTICATION:
            Role.create_default_roles(
                entity=Permission.Entity.PROJECT,
                entity_id=project_uuid,
                prefix=workspace_name,
            )

        return self(dict(success=True), user, **kwargs)

    def update(self, payload, **kwargs):
        cluster_type = self.model.get('cluster_type')
        instance_name = self.model.get('name')
        if cluster_type == ClusterType.ECS:
            from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager
            task_arn = payload.get('task_arn')
            cluster_name = payload.get('cluster_name', os.getenv(ECS_CLUSTER_NAME))
            task_definition = payload.get(
                'task_definition',
                os.getenv(ECS_TASK_DEFINITION),
            )
            container_name = payload.get('container_name', os.getenv(ECS_CONTAINER_NAME))

            action = payload.get('action')

            ecs_instance_manager = EcsTaskManager(cluster_name)
            if action == 'stop':
                ecs_instance_manager.stop_task(task_arn)
            elif action == 'resume':
                ecs_instance_manager.create_task(
                    instance_name,
                    task_definition,
                    container_name,
                )

        return self

    def delete(self, **kwargs):
        cluster_type = self.model.get('cluster_type')
        workspace_name = self.model.get('name')
        instance = self.model.get('instance')

        repo_path = get_repo_path()
        project_folder = os.path.join(repo_path, 'projects', workspace_name)

        if get_project_type() == ProjectType.MAIN:
            shutil.rmtree(project_folder)
        if cluster_type == ClusterType.ECS:
            from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager
            task_arn = instance.get('task_arn')
            cluster_name = os.getenv(ECS_CLUSTER_NAME)

            ecs_instance_manager = EcsTaskManager(cluster_name)
            ecs_instance_manager.delete_task(workspace_name, task_arn)

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
            projects = [name for name in os.listdir(projects_folder) if os.path.isdir(name)]
            if subproject not in projects:
                error = ApiError.RESOURCE_NOT_FOUND.copy()
                error.update(message=f'Project {subproject} was not found.')
                raise ApiError(error)

        if project_type == ProjectType.MAIN:
            return get_repo_config().cluster_type

    @classmethod
    def get_instances(self, cluster_type: str) -> List[Dict]:
        instances = []
        if cluster_type == ClusterType.K8S:
            from mage_ai.cluster_manager.kubernetes.workload_manager import (
                WorkloadManager,
            )
            namespace = os.getenv(KUBE_NAMESPACE)
            workload_manager = WorkloadManager(namespace)

            instances = workload_manager.list_services()
        elif cluster_type == ClusterType.ECS:
            from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager

            try:
                cluster_name = os.getenv(ECS_CLUSTER_NAME)
                ecs_instance_manager = EcsTaskManager(cluster_name)
                instances = ecs_instance_manager.list_tasks()
            except Exception as e:
                error = ApiError.RESOURCE_ERROR.copy()
                error.update(message=str(e))
                raise ApiError(error)
        elif cluster_type == ClusterType.CLOUD_RUN:
            from mage_ai.cluster_manager.gcp.cloud_run_service_manager import (
                CloudRunServiceManager,
            )
            project_id = os.getenv(GCP_PROJECT_ID)
            path_to_credentials = os.getenv(GCP_PATH_TO_KEYFILE)
            region = os.getenv(GCP_REGION)
            cloud_run_service_manager = CloudRunServiceManager(
                project_id,
                path_to_credentials,
                region=region
            )

            instances = cloud_run_service_manager.list_services()

        return instances
