import os

from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.constants import MAX_PRINT_OUTPUT_LINES
from mage_ai.data_preparation.repo_manager import (
    ProjectType,
    get_project_type,
    get_project_uuid,
    get_repo_config,
    get_repo_path,
)
from mage_ai.data_preparation.shared.constants import MANAGE_ENV_VAR
from mage_ai.orchestration.db import safe_db_query
from mage_ai.server.api.clusters import ClusterType
from mage_ai.server.scheduler_manager import scheduler_manager
from mage_ai.settings import (
    REQUIRE_USER_AUTHENTICATION,
    is_disable_pipeline_edit_access,
)


class StatusResource(GenericResource):
    """
    Resource to fetch block output for the notebook. Created to support legacy
    endpoint /api/pipelines/<pipeline_uuid>/blocks/<block_uuid>/outputs
    """
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
        if project_type == ProjectType.MAIN:
            instance_type = get_repo_config().cluster_type
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
            'repo_path': get_repo_path(),
            'scheduler_status': scheduler_manager.get_status(),
            'instance_type': instance_type,
            'disable_pipeline_edit_access': is_disable_pipeline_edit_access(),
            'max_print_output_lines': MAX_PRINT_OUTPUT_LINES,
            'require_user_authentication': REQUIRE_USER_AUTHENTICATION,
            'project_type': project_type,
            'project_uuid': get_project_uuid(),
        }
        return self.build_result_set([status], user, **kwargs)
