import os
import re
import urllib.parse
from typing import Dict

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.BlockResource import BlockResource
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.cache.block import BlockCache
from mage_ai.cache.block_action_object import BlockActionObjectCache
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.errors import (
    FileExistsError,
    FileNotInProjectError,
    FileWriteError,
    InvalidPipelineZipError,
    PipelineZipTooLargeError,
)
from mage_ai.data_preparation.models.file import File, ensure_file_is_in_project
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import safe_db_query
from mage_ai.settings.repo import get_repo_path
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.files import get_absolute_paths_from_all_files
from mage_ai.shared.path_fixer import add_absolute_path, remove_base_repo_directory_name
from mage_ai.version_control.models import File as VersionControlFile
from mage_ai.version_control.models import Project


class FileResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
        pattern = query.get('pattern', [None])
        if pattern:
            pattern = pattern[0]
        if pattern:
            pattern = urllib.parse.unquote(pattern)

        repo_path = query.get('repo_path', [None])
        if repo_path:
            repo_path = repo_path[0]
        if repo_path:
            repo_path = urllib.parse.unquote(repo_path)

        flatten = query.get('flatten', [None])
        if flatten:
            flatten = flatten[0]

        version_control_files = query.get('version_control_files', [False])
        if version_control_files:
            version_control_files = version_control_files[0]

        project_uuid = query.get('project_uuid', [None])
        if project_uuid:
            project_uuid = project_uuid[0]

        include_pipeline_count = query.get('include_pipeline_count', [False])
        if include_pipeline_count:
            include_pipeline_count = include_pipeline_count[0]
        if include_pipeline_count:
            await BlockCache.initialize_cache()

        exclude_dir_pattern = query.get('exclude_dir_pattern', [None])
        if exclude_dir_pattern:
            exclude_dir_pattern = exclude_dir_pattern[0]
        if exclude_dir_pattern:
            exclude_dir_pattern = urllib.parse.unquote(exclude_dir_pattern)
        elif exclude_dir_pattern is None:
            exclude_dir_pattern = r'^\.|\/\.'

        exclude_pattern = query.get('exclude_pattern', [None])
        if exclude_pattern:
            exclude_pattern = exclude_pattern[0]
        if exclude_pattern:
            exclude_pattern = urllib.parse.unquote(exclude_pattern)
        elif exclude_pattern is None:
            exclude_pattern = r'^\.|\/\.'

        check_file_path = False

        if project_uuid and version_control_files:
            project = Project.load(uuid=project_uuid)
            files = VersionControlFile.load_all(project=project)

            repo_path = project.repo_path
            pattern = '|'.join([os.path.join(
                repo_path,
                f.name.strip(),
            ).replace('.', '\\.') for f in files if f.name and f.name.strip()])
            check_file_path = True

        if flatten:
            def __parse_values(tup) -> Dict:
                absolute_path, size, modified_timestamp = tup
                return dict(
                    name=os.path.basename(absolute_path),
                    size=size,
                    path=remove_base_repo_directory_name(absolute_path),
                    modified_timestamp=modified_timestamp,
                )

            return self.build_result_set(
                get_absolute_paths_from_all_files(
                    starting_full_path_directory=base_repo_path(),
                    comparator=lambda path: (
                        not exclude_pattern or
                        not re.search(exclude_pattern, path or '')
                    ) and (not pattern or re.search(pattern, path or '')),
                    parse_values=__parse_values,
                ),
                user,
                **kwargs,
            )

        return self.build_result_set(
            [File.get_all_files(
                repo_path or get_repo_path(root_project=True),
                exclude_dir_pattern=exclude_dir_pattern,
                exclude_pattern=exclude_pattern,
                pattern=pattern,
                check_file_path=check_file_path,
                include_pipeline_count=include_pipeline_count,
            )],
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    async def create(self, payload: Dict, user, **kwargs) -> 'FileResource':
        dir_path = payload['dir_path']
        repo_path = get_repo_path(root_project=True)
        pipeline_zip = payload.get('pipeline_zip', False)
        overwrite = payload.get('overwrite', False)
        content = None

        if 'file' in payload:
            file = payload['file'][0]
            filename = file['filename']
            content = file['body']
        else:
            filename = payload['name']

        error = ApiError.RESOURCE_INVALID.copy()
        try:
            if pipeline_zip:  # pipeline upload
                pipeline_file, pipeline_config = Pipeline.import_from_zip(content, overwrite)
                tags = pipeline_config.get('tags', [])
                pipeline_uuid = pipeline_config.get('uuid')
                pipeline = Pipeline(pipeline_uuid, config=pipeline_config)
                if tags:
                    from mage_ai.cache.tag import TagCache

                    tag_cache = await TagCache.initialize_cache()
                    for tag_uuid in tags:
                        tag_cache.add_pipeline(tag_uuid, pipeline)

                if pipeline.blocks_by_uuid:
                    from mage_ai.cache.block import BlockCache

                    block_cache = await BlockCache.initialize_cache()
                    for block in pipeline.blocks_by_uuid.values():
                        block_cache.add_pipeline(block, pipeline)

                return self(pipeline_file, user, **kwargs)
            else:
                file_path = File(filename, dir_path, repo_path).file_path
                ensure_file_is_in_project(file_path)
                file = await File.create_async(
                    filename,
                    dir_path,
                    repo_path=repo_path,
                    content=content,
                    overwrite=overwrite,
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
        except FileWriteError as err:
            error.update(dict(message=str(err)))
            raise ApiError(error)
        except PipelineZipTooLargeError as err:
            error.update(dict(message=str(err)))
            raise ApiError(error)
        except InvalidPipelineZipError as err:
            error.update(dict(
                message=f'Invalid pipeline zip {filename}. \n{str(err)}'))
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
    def get_model(self, pk, **kwargs):
        file_path = add_absolute_path(urllib.parse.unquote(pk))
        return File.from_path(file_path, get_repo_path(root_project=True))

    @safe_db_query
    def delete(self, **kwargs):
        try:
            block_resource = BlockResource.member(
                self.model.file_path,
                self.current_user,
                query=dict(file_path=[
                    self.model.file_path,
                ]),
            )
            if block_resource:
                block_resource.delete()
        except ApiError:
            pass
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
