import urllib.parse

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.cache.block_action_object import BlockActionObjectCache
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.errors import FileNotInProjectError
from mage_ai.data_preparation.models.file import File, ensure_file_is_in_project
from mage_ai.orchestration.db import safe_db_query
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find


class FileContentResource(GenericResource):
    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        file_path = urllib.parse.unquote(pk)
        file = File.from_path(file_path, get_repo_path())
        try:
            ensure_file_is_in_project(file.file_path)
        except FileNotInProjectError:
            error = ApiError.RESOURCE_INVALID.copy()
            error.update(
                message=f'File at path: {file.file_path} is not in the project directory.')
            raise ApiError(error)
        return self(file, user, **kwargs)

    async def update(self, payload, **kwargs):
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

        block_type = Block.block_type_from_path(self.model.dir_path)
        if block_type:
            cache_block_action_object = await BlockActionObjectCache.initialize_cache()
            cache_block_action_object.update_block(block_file_absolute_path=self.model.file_path)
