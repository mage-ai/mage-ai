import os

from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.cluster_manager.constants import ClusterType
from mage_ai.data_preparation.models.constants import MAX_PRINT_OUTPUT_LINES
from mage_ai.data_preparation.repo_manager import (
    get_project_type,
    get_project_uuid,
    get_repo_config,
)
from mage_ai.data_preparation.shared.constants import MANAGE_ENV_VAR
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.server.scheduler_manager import scheduler_manager
from mage_ai.settings import (
    REQUIRE_USER_AUTHENTICATION,
    REQUIRE_USER_PERMISSIONS,
    is_disable_pipeline_edit_access,
)
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import merge_dict


class StatusResource(GenericResource):
    @classmethod
    @safe_db_query
    def collection(self, query, meta, user, **kwargs):
        from mage_ai.cluster_manager.constants import (
            ECS_CLUSTER_NAME,
            GCP_PROJECT_ID,
            KUBE_NAMESPACE,
        )

        instance_type = None
        project_type = get_project_type()
        repo_config = get_repo_config()
        if repo_config.cluster_type:
            instance_type = repo_config.cluster_type
        elif os.getenv(ECS_CLUSTER_NAME):
            instance_type = ClusterType.ECS
        elif os.getenv(GCP_PROJECT_ID):
            instance_type = ClusterType.CLOUD_RUN
        else:
            try:
                from mage_ai.cluster_manager.kubernetes.workload_manager import (
                    WorkloadManager,
                )

                if WorkloadManager.load_config() or os.getenv(KUBE_NAMESPACE):
                    instance_type = ClusterType.K8S
            except ModuleNotFoundError:
                pass

        status = {
            'is_instance_manager': os.getenv(MANAGE_ENV_VAR) == '1',
            'repo_path': get_repo_path(root_project=False),
            'repo_path_relative': get_repo_path(root_project=False, absolute_path=False),
            'repo_path_relative_root': get_repo_path(root_project=True, absolute_path=False),
            'repo_path_root': get_repo_path(root_project=True),
            'scheduler_status': scheduler_manager.get_status(),
            'instance_type': instance_type,
            'disable_pipeline_edit_access': is_disable_pipeline_edit_access(),
            'max_print_output_lines': MAX_PRINT_OUTPUT_LINES,
            'require_user_authentication': REQUIRE_USER_AUTHENTICATION,
            'require_user_permissions': REQUIRE_USER_PERMISSIONS,
            'project_type': project_type,
            'project_uuid': get_project_uuid(),
        }

        display_format = meta.get('_format') if meta else None
        if 'with_activity_details' == display_format:
            from mage_ai.server.server import latest_user_activity

            project_schedules = PipelineSchedule.repo_query.all()
            project_schedule_ids = [schedule.id for schedule in project_schedules]
            project_pipeline_runs = PipelineRun.query.filter(
                PipelineRun.pipeline_schedule_id.in_(project_schedule_ids)
            )
            sorted_pipeline_runs = project_pipeline_runs.order_by(
                PipelineRun.updated_at.desc()
            )
            last_scheduler_activity = None
            if sorted_pipeline_runs.count() > 0:
                last_scheduler_activity = sorted_pipeline_runs[0].updated_at
            active_pipeline_run_count = project_pipeline_runs.filter(
                PipelineRun.status == PipelineRun.PipelineRunStatus.RUNNING
            ).count()

            activity_details = {
                'active_pipeline_run_count': active_pipeline_run_count,
                'last_scheduler_activity': last_scheduler_activity,
                'last_user_request': latest_user_activity.latest_activity,
            }

            status = merge_dict(status, activity_details)

        return self.build_result_set([status], user, **kwargs)
