from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.orchestration.db import safe_db_query
import urllib.parse


class FileContentResource(GenericResource):
    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        file_path = urllib.parse.unquote(pk)
        file = File.from_path(file_path, get_repo_path())
        return self(file, user, **kwargs)

    def update(self, payload, **kwargs):
        error = ApiError.RESOURCE_INVALID.copy()

        content = payload.get('content')
        if content is None:
            error.update(message='Please provide a \'content\' param in the request payload.')
            raise ApiError(error)

        self.model.update_content(content)
