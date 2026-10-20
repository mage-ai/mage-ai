from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.extensions.constants import EXTENSIONS, EXTENSIONS_BY_UUID
from mage_ai.orchestration.db import safe_db_query


class ExtensionOptionResource(GenericResource):
    @classmethod
    @safe_db_query
    def collection(self, query, meta, user, **kwargs):
        return self.build_result_set(
            EXTENSIONS,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        model = EXTENSIONS_BY_UUID.get(pk)
        if not model:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        return self(model, user, **kwargs)
