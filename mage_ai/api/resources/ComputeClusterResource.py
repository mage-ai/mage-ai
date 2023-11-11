from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.services.compute.models import ComputeService
from mage_ai.services.spark.constants import ComputeServiceUUID


class ComputeClusterResource(GenericResource):
    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        clusters = []

        if isinstance(parent_model, ComputeService):
            if ComputeServiceUUID.AWS_EMR == parent_model.uuid:
                result = parent_model.clusters_and_metadata()
                clusters = [dict(
                    cluster=cluster,
                ) for cluster in result.get('clusters') or []]

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
