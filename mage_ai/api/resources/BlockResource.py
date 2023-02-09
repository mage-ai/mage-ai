from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import (
    FILE_EXTENSION_TO_BLOCK_LANGUAGE,
)
import urllib.parse


class BlockResource(GenericResource):
    @classmethod
    def member(self, pk, user, **kwargs):
        error = ApiError.RESOURCE_INVALID.copy()

        block_type_and_uuid = urllib.parse.unquote(pk)
        parts = block_type_and_uuid.split('/')

        if len(parts) != 2:
            error.update(dict(message='The url path should be in block_type/block_uuid format.'))
            raise ApiError(error)

        block_type = parts[0]
        block_uuid = parts[1]
        parts2 = block_uuid.split('.')
        language = None
        if len(parts2) >= 2:
            block_uuid = parts2[0]
            language = FILE_EXTENSION_TO_BLOCK_LANGUAGE[parts2[1]]

        block = Block(block_uuid, block_uuid, block_type, language=language)
        if not block.exists():
            error.update(ApiError.RESOURCE_NOT_FOUND)
            raise ApiError(error)

        return self(block, user, **kwargs)

    def delete(self, **kwargs):
        return self.model.delete()
