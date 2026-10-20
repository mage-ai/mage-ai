from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.services.compute.aws.models import Cluster
from mage_ai.services.compute.models import ComputeService
from mage_ai.services.spark.constants import ComputeServiceUUID
from mage_ai.services.ssh.aws.emr.models import close_tunnel
from mage_ai.services.ssh.aws.emr.utils import tunnel


class ComputeClusterResource(GenericResource):
    @classmethod
    async def collection(self, query_arg, _meta, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        include_all_states = query_arg.get('include_all_states', [None])
        if include_all_states:
            include_all_states = include_all_states[0]

        clusters = []

        if isinstance(parent_model, ComputeService):
            if ComputeServiceUUID.AWS_EMR == parent_model.uuid:
                try:
                    result = parent_model.clusters_and_metadata(
                        include_all_states=include_all_states,
                    )
                    clusters = [dict(
                        cluster=cluster,
                    ) for cluster in result.get('clusters') or []]
                except Exception as err:
                    print(f'[WARNING] ComputeClusterResource.collection: {err}')

        return self.build_result_set(
            clusters,
            user,
            **kwargs,
        )

    @classmethod
    async def member(self, pk, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        cluster = None

        if isinstance(parent_model, ComputeService):
            if ComputeServiceUUID.AWS_EMR == parent_model.uuid:
                cluster = parent_model.get_cluster_details(pk)

        return self(dict(
            cluster=cluster,
        ), user, **kwargs)

    @classmethod
    def create(self, payload, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        cluster = None

        if isinstance(parent_model, ComputeService):
            if ComputeServiceUUID.AWS_EMR == parent_model.uuid:
                cluster = parent_model.create_cluster()

        return self(dict(
            cluster=cluster,
        ), user, **kwargs)

    async def delete(self, **kwargs):
        parent_model = kwargs.get('parent_model')

        if isinstance(parent_model, ComputeService):
            if ComputeServiceUUID.AWS_EMR == parent_model.uuid:
                cluster = self.get_cluster()
                parent_model.terminate_clusters([cluster.id])

                if cluster.active:
                    close_tunnel()

    async def update(self, payload, **kwargs):
        parent_model = kwargs.get('parent_model')

        if isinstance(parent_model, ComputeService):
            if ComputeServiceUUID.AWS_EMR == parent_model.uuid:
                cluster_id = self.get_cluster_id()
                if cluster_id:
                    cluster = parent_model.update_cluster(cluster_id, payload)
                    if cluster:
                        self.model = dict(cluster=cluster)

                        if cluster.active:
                            def _callback(*args, **kwargs):
                                tunnel(reconnect=True)

                            self.on_update_callback = _callback

    def get_cluster(self) -> Cluster:
        return self.model.get('cluster')

    def get_cluster_id(self) -> str:
        cluster_id = None

        if 'cluster' in self.model:
            cluster = self.get_cluster()
            if cluster:
                cluster_id = None
                if isinstance(cluster, Cluster):
                    cluster_id = cluster.id
                elif isinstance(cluster, dict):
                    cluster_id = cluster.get('id')

        return cluster_id
