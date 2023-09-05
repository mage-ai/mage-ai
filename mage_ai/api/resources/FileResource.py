import os
import urllib.parse
from typing import Dict

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.cache.block_action_object import BlockActionObjectCache
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.errors import (
    FileExistsError,
    FileNotInProjectError,
)
from mage_ai.data_preparation.models.file import File, ensure_file_is_in_project
from mage_ai.orchestration.db import safe_db_query
from mage_ai.settings.repo import get_repo_path


class FileResource(GenericResource):
    @classmethod
    @safe_db_query
    def collection(self, query, meta, user, **kwargs):
        return self.build_result_set(
            [File.get_all_files(get_repo_path())],
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    async def create(self, payload: Dict, user, **kwargs) -> 'FileResource':
        dir_path = payload['dir_path']
        repo_path = get_repo_path()
        content = None

        if 'file' in payload:
            file = payload['file'][0]
            filename = file['filename']
            content = file['body']
        else:
            filename = payload['name']

        error = ApiError.RESOURCE_INVALID.copy()
        file_path = File(filename, dir_path, repo_path).file_path
        try:
            ensure_file_is_in_project(file_path)
            file = File.create(
                filename,
                dir_path,
                repo_path=repo_path,
                content=content,
                overwrite=payload.get('overwrite', False),
            )

            block_type = Block.block_type_from_path(dir_path)
            if block_type:
                cache_block_action_object = await BlockActionObjectCache.initialize_cache()
                cache_block_action_object.update_block(block_file_absolute_path=file.file_path)

            return self(file, user, **kwargs)
        except FileExistsError as err:
            error.update(dict(message=str(err)))
            raise ApiError(error)
        except FileNotInProjectError:
            error.update(dict(
                message=f'File at path: {file_path} is not in the project directory.'))
            raise ApiError(error)

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        file = self.get_model(pk)
        if not file.exists():
            error = ApiError.RESOURCE_NOT_FOUND.copy()
            error.update(message=f'File at {pk} cannot be found.')
            raise ApiError(error)

        return self(file, user, **kwargs)

    @classmethod
    @safe_db_query
    def get_model(self, pk):
        file_path = urllib.parse.unquote(pk)
        return File.from_path(file_path, get_repo_path())

    @safe_db_query
    def delete(self, **kwargs):
        return self.model.delete()

    @safe_db_query
    async def update(self, payload, **kwargs):
        block_type = Block.block_type_from_path(self.model.dir_path)
        cache_block_action_object = None
        if block_type:
            cache_block_action_object = await BlockActionObjectCache.initialize_cache()
            cache_block_action_object.update_block(
                block_file_absolute_path=self.model.file_path,
                remove=True,
            )

        new_path = os.path.join(
            self.model.repo_path,
            payload['dir_path'],
            payload['name'],
        )
        try:
            ensure_file_is_in_project(new_path)
        except FileNotInProjectError:
            error = ApiError.RESOURCE_INVALID.copy()
            error.update(dict(
                message=f'File cannot be moved to path: {new_path} because '
                         'it is not in the project directory.'))
            raise ApiError(error)
        self.model.rename(payload['dir_path'], payload['name'])

        if block_type and cache_block_action_object:
            cache_block_action_object.update_block(block_file_absolute_path=self.model.file_path)

        return self
