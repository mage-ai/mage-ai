from unittest.mock import patch

from faker import Faker

from mage_ai.cluster_manager.constants import ClusterType
from mage_ai.cluster_manager.kubernetes.workload_manager import WorkloadManager
from mage_ai.cluster_manager.workspace.base import Workspace
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.tests.api.endpoints.mixins import BaseAPIEndpointTest


class WorkspaceAPIEndpointTest(BaseAPIEndpointTest):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        repo_config = get_repo_config()
        repo_config.save(cluster_type=ClusterType.K8S.value, project_type='main')
        with patch.object(WorkloadManager, 'create_workload') as _:
            self.workspace = Workspace.create(
                ClusterType.K8S,
                name=Faker().unique.name(),
                payload=dict(
                    namespace='default',
                    service_account_name='mageai',
                ),
            )

    async def build_test_list_endpoint(
        self,
        *args,
        **kwargs,
    ):
        with patch.object(WorkloadManager, 'list_workloads') as mock_list_workloads:
            mock_list_workloads.return_value = [
                dict(
                    name=self.workspace.name,
                    type='NodePort',
                    status='RUNNING',
                )
            ]
            await super().build_test_list_endpoint(*args, **kwargs)


# build_list_endpoint_tests(
#     WorkspaceAPIEndpointTest,
#     list_count=1,
#     resource='workspaces',
#     result_keys_to_compare=[
#         'name',
#         'namespace',
#         'project_uuid',
#         'instance',
#         'service_account_name',
#     ],
# )
