from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.orchestration.db import safe_db_query
from mage_ai.server.active_kernel import get_active_kernel_name
from mage_ai.server.api.clusters import ClusterType
from mage_ai.server.kernels import KernelName


class ClusterResource(GenericResource):
    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        clusters = []
        if ClusterType.EMR == pk and get_active_kernel_name() == KernelName.PYSPARK:
            from mage_ai.cluster_manager.aws.emr_cluster_manager import emr_cluster_manager

            clusters = emr_cluster_manager.list_clusters()

        return self(dict(
            clusters=clusters,
            type=pk,
        ), user, **kwargs)

    @safe_db_query
    def update(self, payload, **kwargs):
        if ClusterType.EMR == self.model['type']:
            from mage_ai.cluster_manager.aws.emr_cluster_manager import emr_cluster_manager

            error = ApiError.RESOURCE_INVALID.copy()

            if payload is None:
                error['message'] = 'Please include cluster info in the request payload.'
                raise ApiError(error)

            cluster_id = payload.get('id')
            if cluster_id is None:
                error['message'] = 'Please include cluster_id in the request payload.'
                raise ApiError(error)

            emr_cluster_manager.set_active_cluster(cluster_id)
            success = True

            self.model.update(
                id=cluster_id,
                success=success,
            )
            self.model.update(payload)
