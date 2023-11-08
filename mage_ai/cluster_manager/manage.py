import os
from datetime import datetime
from typing import Dict, List

from mage_ai.cluster_manager.constants import (
    ECS_CLUSTER_NAME,
    GCP_PATH_TO_KEYFILE,
    GCP_PROJECT_ID,
    GCP_REGION,
    KUBE_NAMESPACE,
    ClusterType,
)
from mage_ai.cluster_manager.workspace.base import Workspace
from mage_ai.data_preparation.repo_manager import ProjectType, get_project_type
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


def get_workspaces(cluster_type: ClusterType) -> List[Workspace]:
    """
    Retrieve a list of workspaces based on the cluster type and project type.

    1. For main projects, it extracts project names from the config file names.
    2. Otherwise, it will fetch project names from the cloud instances for the specified cluster.
    3. It then attempts to create Workspace objects for each project and collects them in a list.
    4. Exceptions are handled gracefully, and error messages are printed as needed.

    Args:
        cluster_type (ClusterType): The type of cluster (e.g., ClusterType.K8S).

    Returns:
        List[Workspace]: A list of Workspace objects.
    """
    is_main_project = get_project_type() == ProjectType.MAIN

    repo_path = get_repo_path()
    projects_folder = os.path.join(repo_path, 'projects')
    if is_main_project:
        projects = [
            f.name.split('.')[0]
            for f in os.scandir(projects_folder)
            if not f.is_dir() and f.name.endswith('.yaml')
        ]
    else:
        instances = get_instances(cluster_type)
        projects = [instance.get('name') for instance in instances]

    workspaces = []
    for project in projects:
        try:
            workspaces.append(Workspace.get_workspace(cluster_type, project))
        except Exception as e:
            print(f'Error fetching workspace: {str(e)}')
    return workspaces


def check_auto_termination(cluster_type: ClusterType):
    """
    Check and potentially terminate idle workspaces in a given cluster. Currently,
    this is only supported for Kubernetes clusters.

    This function is responsible for checking and, if necessary, terminating idle workspaces
    in a specified cluster.

    1. Retrieve a list of workspaces based on the cluster_type by calling get_workspaces().
    2. For each workspace, attempt to retrieve its termination policy from the lifecycle_config.
    3. If a termination policy exists and auto-termination is enabled:
       - Fetch the workload manager associated with the workspace.
       - Obtain activity details for the workspace using workload_manager.get_workload_activity().
       - Determine the maximum allowed idle time in seconds from the termination policy.
       - Check the number of active pipeline runs (active_pipeline_run_count).
       - Calculate the latest activity time based on user requests and scheduler activity.
       - If there are no active pipeline runs and the workspace has been idle for longer than
         the maximum allowed idle time, stop the workspace.

    Args:
        cluster_type (ClusterType): The type of cluster to check (e.g., ClusterType.K8S).
    """
    if cluster_type == ClusterType.K8S:
        workspaces = get_workspaces(cluster_type)
        for ws in workspaces:
            try:
                termination_policy = ws.lifecycle_config.termination_policy
                if termination_policy and termination_policy.enable_auto_termination:
                    workload_manager = ws.workload_manager
                    activity_details = workload_manager.get_workload_activity(ws.name)
                    max_idle_seconds = int(termination_policy.max_idle_seconds)
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
                            ws.stop()
            except Exception:
                pass
