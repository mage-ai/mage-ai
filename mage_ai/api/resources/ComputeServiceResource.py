from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.project import Project
from mage_ai.services.compute.models import ComputeService


class ComputeServiceResource(GenericResource):
    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        resource = await self.member(None, user, **kwargs)

        return self.build_result_set(
            [
                resource.model,
            ],
            user,
            **kwargs,
        )

    @classmethod
    async def member(self, _, user, **kwargs):
        compute_service = ComputeService(Project())

        return self(compute_service, user, **kwargs)
