from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.authentication.permissions.seed import bootstrap_permissions


class SeedResource(GenericResource):
    @classmethod
    async def create(self, payload, user, **kwargs):
        if payload.get('roles') and payload.get('permissions'):
            await bootstrap_permissions()

        return self({}, user, **kwargs)
