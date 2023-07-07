import os
import uuid
from typing import Dict, List

import ruamel.yaml
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
)
from mage_ai.data_preparation.repo_manager import (
    ProjectType,
    get_project_type,
    get_repo_config,
)
from mage_ai.data_preparation.shared.constants import MANAGE_ENV_VAR
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import Permission, Role, User
from mage_ai.server.api.clusters import ClusterType
from mage_ai.server.logger import Logger
from mage_ai.settings import REQUIRE_USER_AUTHENTICATION
from mage_ai.settings.repo import get_repo_path

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

        instances = self.get_instances(cluster_type)
        instance_map = {
            instance.get('name'): instance
            for instance in instances
        }

        is_main_project = get_project_type() == ProjectType.MAIN

        repo_path = get_repo_path()
        projects_folder = os.path.join(repo_path, 'projects')
        if is_main_project:
            projects = [f.name.split('.')[0] for f in os.scandir(projects_folder) if not f.is_dir()]
        else:
            projects = [instance.get('name') for instance in instances]

        workspaces = []
        for project in projects:
            if project in instance_map:
                try:
                    workspace = dict(
                        name=project,
                        cluster_type=cluster_type,
                        instance=instance_map[project],
                    )
                    if is_main_project:
                        workspace_file = os.path.join(projects_folder, f'{project}.yaml')
                        config = {}
                        with open(workspace_file) as f:
                            config = yaml.full_load(f.read())
                        project_uuid = config['project_uuid']
                        workspace['project_uuid'] = project_uuid
                        if query_user:
                            workspace['access'] = query_user.get_access(
                                Permission.Entity.PROJECT,
                                project_uuid,
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

        error = ApiError.RESOURCE_ERROR.copy()
        workspace_name = payload.pop('name')
        if not workspace_name:
            error.update(message='Please enter a valid workspace name.')
            raise ApiError(error)

        workspace_file = None
        project_uuid = None
        project_type = get_project_type()
        if project_type == ProjectType.MAIN:
            project_folder = os.path.join(get_repo_path(), 'projects')
            if not os.path.exists(project_folder):
                os.makedirs(project_folder)
            workspace_file = os.path.join(project_folder, f'{workspace_name}.yaml')
            if os.path.exists(workspace_file):
                error.update(message=f'Project with name {workspace_name} already exists')
                raise ApiError(error)
            try:
                yml = ruamel.yaml.YAML()
                yml.preserve_quotes = True
                yml.indent(mapping=2, sequence=2, offset=0)

                project_uuid = uuid.uuid4().hex
                data = dict(project_uuid=project_uuid)

                with open(workspace_file, 'w') as f:
                    yml.dump(data, f)
            except Exception as e:
                error.update(message=f'Error creating project: {str(e)}')
                raise ApiError(error)
        try:
            if cluster_type == ClusterType.K8S:
                from mage_ai.cluster_manager.kubernetes.workload_manager import (
                    WorkloadManager,
                )
                namespace = payload.pop('namespace', os.getenv(KUBE_NAMESPACE))

                k8s_workload_manager = WorkloadManager(namespace)
                extra_args = {}
                if project_type == ProjectType.MAIN:
                    extra_args = {
                        'project_type': ProjectType.SUB,
                        'project_uuid': project_uuid,
                    }
                k8s_workload_manager.create_workload(
                    workspace_name,
                    **payload,
                    **extra_args,
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

                # TODO: Create a service for each workspace
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
            if workspace_file and os.path.exists(workspace_file):
                os.remove(workspace_file)
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
        workspace_file = os.path.join(repo_path, 'projects', f'{workspace_name}.yaml')

        error = ApiError.RESOURCE_ERROR.copy()

        try:
            if cluster_type == ClusterType.ECS:
                from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager
                task_arn = instance.get('task_arn')
                cluster_name = os.getenv(ECS_CLUSTER_NAME)

                ecs_instance_manager = EcsTaskManager(cluster_name)
                ecs_instance_manager.delete_task(workspace_name, task_arn)
            elif cluster_type == ClusterType.K8S:
                from mage_ai.cluster_manager.kubernetes.workload_manager import (
                    WorkloadManager,
                )
                namespace = os.getenv(KUBE_NAMESPACE)

                k8s_workload_manager = WorkloadManager(namespace)
                k8s_workload_manager.delete_workload(workspace_name)
        except Exception as e:
            error.update(message=str(e))
            raise ApiError(error)

        if get_project_type() == ProjectType.MAIN:
            os.remove(workspace_file)

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

    @classmethod
    def get_instances(self, cluster_type: str) -> List[Dict]:
        instances = []
        if cluster_type == ClusterType.K8S:
            from mage_ai.cluster_manager.kubernetes.workload_manager import (
                WorkloadManager,
            )
            namespace = os.getenv(KUBE_NAMESPACE)
            workload_manager = WorkloadManager(namespace)

            instances = workload_manager.list_workloads()
        elif cluster_type == ClusterType.ECS:
            from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager
            cluster_name = os.getenv(ECS_CLUSTER_NAME)
            ecs_instance_manager = EcsTaskManager(cluster_name)
            instances = ecs_instance_manager.list_tasks()
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
