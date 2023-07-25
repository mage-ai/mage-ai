import urllib.parse

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.file import File
from mage_ai.orchestration.db import safe_db_query
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find


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
        version = payload.get('version')

        if content is None and version is None:
            error.update(message='Please provide a content or version in the request payload.')
            raise ApiError(error)

        if version is not None and content is None:
            file_version = find(lambda f: f.filename == str(version), self.model.file_versions())
            content = file_version.content()

        self.model.update_content(content)
