from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.file import File
from mage_ai.orchestration.db import safe_db_query


class FileVersionResource(GenericResource):
    @classmethod
    @safe_db_query
    def collection(self, query, meta, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        if isinstance(parent_model, Block):
            pass
        elif isinstance(parent_model, File):
            return self.build_result_set(
                parent_model.file_versions(),
                user,
                **kwargs,
            )
        else:
            raise ApiError(ApiError.RESOURCE_INVALID.copy())
