import os
import uuid
from datetime import datetime
from typing import Dict, List

import ruamel.yaml
import yaml

from mage_ai.cluster_manager.config import LifecycleConfig
from mage_ai.cluster_manager.constants import (
    ECS_CLUSTER_NAME,
    ECS_CONTAINER_NAME,
    ECS_TASK_DEFINITION,
    GCP_PATH_TO_KEYFILE,
    GCP_PROJECT_ID,
    GCP_REGION,
    KUBE_NAMESPACE,
    ClusterType,
)
from mage_ai.cluster_manager.errors import WorkspaceExistsError
from mage_ai.data_preparation.repo_manager import ProjectType, get_project_type
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db.models.oauth import Role, User
from mage_ai.settings import REQUIRE_USER_AUTHENTICATION
from mage_ai.settings.repo import get_repo_path


def get_instances(cluster_type: str) -> List[Dict]:
    instances = []
    if cluster_type == ClusterType.K8S:
        from mage_ai.cluster_manager.kubernetes.workload_manager import WorkloadManager

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
            project_id, path_to_credentials, region=region
        )

        instances = cloud_run_service_manager.list_services()

    return instances


def get_workspaces(cluster_type: ClusterType, user: User = None) -> List[Dict]:
    instances = get_instances(cluster_type)
    instance_map = {instance.get('name'): instance for instance in instances}

    is_main_project = get_project_type() == ProjectType.MAIN

    repo_path = get_repo_path()
    projects_folder = os.path.join(repo_path, 'projects')
    if is_main_project:
        projects = [
            f.name.split('.')[0] for f in os.scandir(projects_folder) if not f.is_dir()
        ]
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
                    workspace['config'] = config.get('config')
                    if user:
                        workspace['access'] = user.get_access(
                            Entity.PROJECT,
                            project_uuid,
                        )
                workspaces.append(workspace)

            except Exception as e:
                print(f'Error fetching workspace: {str(e)}')
    return workspaces


def check_auto_termination(cluster_type: ClusterType):
    if cluster_type == ClusterType.K8S:
        from mage_ai.cluster_manager.kubernetes.workload_manager import WorkloadManager

        namespace = os.getenv(KUBE_NAMESPACE, 'default')
        workload_manager = WorkloadManager(namespace=namespace)

        workspaces = get_workspaces(cluster_type)
        for ws in workspaces:
            lifecycle_config = LifecycleConfig.load(ws.get('lifecycle_config', {}))
            termination_policy = lifecycle_config.termination_policy
            if termination_policy and termination_policy.enable_auto_termination:
                activity_details = workload_manager.get_workload_activity(
                    ws.get('name')
                )
                max_idle_seconds = termination_policy.max_idle_seconds
                if activity_details and max_idle_seconds > 0:
                    active_pipeline_run_count = activity_details.get(
                        'active_pipeline_run_count'
                    )

                    last_user_request_ts = activity_details.get('last_user_request')
                    last_user_request = datetime.fromisoformat(last_user_request_ts)

                    latest_activity_time = last_user_request.timestamp()
                    last_scheduler_activity_ts = activity_details.get(
                        'last_scheduler_activity'
                    )
                    if last_scheduler_activity_ts:
                        last_scheduler_activity = datetime.fromisoformat(
                            last_scheduler_activity_ts
                        )
                        latest_activity_time = max(
                            latest_activity_time,
                            last_scheduler_activity.timestamp(),
                        )

                    now_time = datetime.utcnow().timestamp()
                    if (
                        not active_pipeline_run_count
                        and now_time - latest_activity_time > max_idle_seconds
                    ):
                        workload_manager.scale_down_workload(ws.get('name'))


def create_workspace(
    cluster_type: ClusterType,
    workspace_name: str,
    lifecycle_config: LifecycleConfig,
    payload: Dict,
):
    workspace_file = None
    project_uuid = None
    project_type = get_project_type()
    if project_type == ProjectType.MAIN:
        project_folder = os.path.join(get_repo_path(), 'projects')
        if not os.path.exists(project_folder):
            os.makedirs(project_folder)
        workspace_file = os.path.join(project_folder, f'{workspace_name}.yaml')
        if os.path.exists(workspace_file):
            raise WorkspaceExistsError(
                f'Project with name {workspace_name} already exists'
            )
        yml = ruamel.yaml.YAML()
        yml.preserve_quotes = True
        yml.indent(mapping=2, sequence=2, offset=0)

        project_uuid = uuid.uuid4().hex
        data = dict(project_uuid=project_uuid, lifecycle_config=lifecycle_config.to_dict())

        with open(workspace_file, 'w') as f:
            yml.dump(data, f)
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
                lifecycle_config,
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
                'path_to_credentials', os.getenv('path_to_keyfile')
            )
            region = payload.get('region', os.getenv('GCP_REGION'))

            cloud_run_service_manager = CloudRunServiceManager(
                project_id, path_to_credentials, region=region
            )

            cloud_run_service_manager.create_service(workspace_name)
    except Exception:
        if workspace_file and os.path.exists(workspace_file):
            os.remove(workspace_file)
        raise

    if (
        project_type == ProjectType.MAIN
        and project_uuid is not None
        and REQUIRE_USER_AUTHENTICATION
    ):
        Role.create_default_roles(
            entity=Entity.PROJECT,
            entity_id=project_uuid,
            prefix=workspace_name,
        )


def update_workspace(cluster_type: ClusterType, name: str, action: str, **kwargs):
    if cluster_type == ClusterType.K8S:
        from mage_ai.cluster_manager.kubernetes.workload_manager import WorkloadManager

        namespace = os.getenv(KUBE_NAMESPACE)
        workload_manager = WorkloadManager(namespace)

        if action == 'stop':
            workload_manager.scale_down_workload(name)
        elif action == 'resume':
            workload_manager.restart_workload(name)
    elif cluster_type == ClusterType.ECS:
        from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager

        task_arn = kwargs.get('task_arn')
        cluster_name = kwargs.get('cluster_name', os.getenv(ECS_CLUSTER_NAME))
        task_definition = kwargs.get(
            'task_definition',
            os.getenv(ECS_TASK_DEFINITION),
        )
        container_name = kwargs.get('container_name', os.getenv(ECS_CONTAINER_NAME))

        ecs_instance_manager = EcsTaskManager(cluster_name)
        if action == 'stop':
            ecs_instance_manager.stop_task(task_arn)
        elif action == 'resume':
            ecs_instance_manager.create_task(
                name,
                task_definition,
                container_name,
            )


def delete_workspace(cluster_type: ClusterType, name: str, **kwargs):
    if cluster_type == ClusterType.ECS:
        from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager

        task_arn = kwargs.get('task_arn')
        cluster_name = os.getenv(ECS_CLUSTER_NAME)

        ecs_instance_manager = EcsTaskManager(cluster_name)
        ecs_instance_manager.delete_task(name, task_arn)
    elif cluster_type == ClusterType.K8S:
        from mage_ai.cluster_manager.kubernetes.workload_manager import WorkloadManager

        namespace = os.getenv(KUBE_NAMESPACE)

        k8s_workload_manager = WorkloadManager(namespace)
        k8s_workload_manager.delete_workload(name)

    repo_path = get_repo_path()
    workspace_file = os.path.join(repo_path, 'projects', f'{name}.yaml')
    if get_project_type() == ProjectType.MAIN:
        os.remove(workspace_file)
