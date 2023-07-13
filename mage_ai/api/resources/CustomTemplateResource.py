# from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource


class CustomTemplateResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        return self.build_result_set(
            [],
            user,
            **kwargs,
        )

    @classmethod
    def create(self, payload, user, **kwargs):
        return self({}, user, **kwargs)

    @classmethod
    def member(self, pk, user, **kwargs):
        return self({}, user, **kwargs)

    def delete(self, **kwargs):
        pass

    def update(self, payload, **kwargs):
        pass
