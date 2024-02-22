import os
import re
from datetime import datetime
from pathlib import Path
from typing import Callable, Dict, List, Tuple

import aiofiles

from mage_ai.cache.dbt.constants import IGNORE_DIRECTORY_NAMES
from mage_ai.data_preparation.models.errors import (
    FileExistsError,
    FileNotInProjectError,
)
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.settings.platform import project_platform_activated
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.environments import is_debug
from mage_ai.shared.path_fixer import remove_base_repo_path_or_name
from mage_ai.shared.utils import get_absolute_path

FILE_VERSIONS_DIR = '.file_versions'
BLACKLISTED_DIRS = frozenset([
    'venv',
    'env',
    '.git',
    '.logs',
    '.variables',
    '.DS_Store',
    '__pycache__',
    FILE_VERSIONS_DIR,
])
INACCESSIBLE_DIRS = frozenset(['__pycache__'])
MAX_DEPTH = 30
MAX_NUMBER_OF_FILE_VERSIONS = int(os.getenv('MAX_NUMBER_OF_FILE_VERSIONS', 100) or 100)

PIPELINES_FOLDER_PREFIX = f'pipelines{os.sep}'


class File:
    def __init__(
        self,
        filename: str,
        dir_path: str,
        repo_path: str,
    ) -> None:
        self.filename = filename
        self.dir_path = dir_path
        self.repo_path = repo_path

    @property
    def file_path(self) -> str:
        return os.path.join(self.repo_path, self.dir_path, self.filename)

    @classmethod
    def file_exists(self, file_path: str) -> bool:
        return os.path.isfile(file_path)

    @classmethod
    def create_parent_directories(self, file_path: str, raise_exception: bool = False) -> bool:
        will_create = not self.file_exists(file_path)
        if will_create:
            try:
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
            except FileExistsError as err:
                if raise_exception:
                    raise err
                print(f'[WARNING] File.create_parent_directories: {err}.')
        return will_create

    @classmethod
    def create(
        self,
        filename,
        dir_path,
        content: str = None,
        repo_path: str = None,
        create_directories_if_not_exist: bool = True,
        file_version_only: bool = False,
        overwrite: bool = True,
    ):
        repo_path = repo_path or get_repo_path(file_path=os.path.join(dir_path, filename))
        file = File(filename, dir_path, repo_path)

        self.write(
            repo_path,
            dir_path,
            filename,
            content,
            create_directories_if_not_exist=create_directories_if_not_exist,
            file_version_only=file_version_only,
            overwrite=overwrite,
        )

        return file

    @classmethod
    async def create_async(
        self,
        filename,
        dir_path,
        content: str = None,
        repo_path: str = None,
        create_directories_if_not_exist: bool = True,
        file_version_only: bool = False,
        overwrite: bool = True,
    ):
        repo_path = repo_path or get_repo_path(file_path=os.path.join(dir_path, filename))
        file = File(filename, dir_path, repo_path)

        await self.write_async(
            repo_path,
            dir_path,
            filename,
            content,
            create_directories_if_not_exist=create_directories_if_not_exist,
            file_version_only=file_version_only,
            overwrite=overwrite,
        )

        return file

    @classmethod
    def from_path(self, file_path, repo_path: str = None):
        repo_path_alt = repo_path
        if repo_path_alt is None:
            repo_path_alt = get_repo_path(file_path=file_path)
        return File(
            os.path.basename(file_path or ''),
            os.path.dirname(file_path or ''),
            repo_path_alt or '',
        )

    @classmethod
    def get_all_files(
        self,
        repo_path,
        exclude_dir_pattern: str = None,
        exclude_pattern: str = None,
        pattern: str = None,
        check_file_path: bool = False,
        include_pipeline_count: bool = False,
    ):
        dir_selector = None
        file_selector = None

        if exclude_pattern is not None or pattern is not None:
            def __select(x: Dict, check_file_path=check_file_path, pattern=pattern):
                filename = x.get('path') if check_file_path else x.get('name')
                checks = []
                if exclude_pattern:
                    checks.append(not re.search(exclude_pattern, filename or ''))
                if pattern:
                    checks.append(re.search(pattern, filename or ''))
                return all(checks)

            file_selector = __select

        if exclude_dir_pattern is not None:
            def __select(x: Dict, pattern=pattern):
                filename = x.get('name')
                checks = []
                if exclude_dir_pattern:
                    checks.append(not re.search(exclude_dir_pattern, filename or ''))
                return all(checks)

            dir_selector = __select

        pipeline_count_mapping = None
        if include_pipeline_count:
            from mage_ai.cache.block import BlockCache
            pipeline_count_mapping = BlockCache().get_pipeline_count_mapping()

        return traverse(
            os.path.basename(repo_path),
            True,
            repo_path,
            dir_selector=dir_selector,
            file_selector=file_selector,
            include_pipeline_count=include_pipeline_count,
            pipeline_count_mapping=pipeline_count_mapping,
        )

    @classmethod
    def file_path_versions_dir(
        self,
        repo_path: str,
        dir_path: str,
        filename: str,
    ) -> Tuple[str, str]:
        return os.path.join(
            repo_path,
            FILE_VERSIONS_DIR,
            dir_path.replace(repo_path, os.path.join(repo_path, FILE_VERSIONS_DIR)),
            filename,
        )

    @classmethod
    def validate_content(self, dir_path, filename, content):
        if dir_path.startswith(PIPELINES_FOLDER_PREFIX) and filename == 'triggers.yaml':
            from mage_ai.data_preparation.models.triggers import load_trigger_configs

            pipeline_uuid = dir_path[len(PIPELINES_FOLDER_PREFIX):]
            load_trigger_configs(content, pipeline_uuid=pipeline_uuid, raise_exception=True)

    @classmethod
    def write_preprocess(
        self,
        repo_path: str,
        dir_path: str,
        filename: str,
        content: str,
        create_directories_if_not_exist: bool = True,
        file_version_only: bool = False,
        overwrite: bool = True,
    ):
        file_path_main = os.path.join(repo_path, dir_path, filename)
        file_path_versions_dir = self.file_path_versions_dir(repo_path, dir_path, filename)
        file_path_versions = os.path.join(
            file_path_versions_dir,
            str(round(datetime.utcnow().timestamp())),
        )

        arr = []

        if not file_version_only:
            arr.append((file_path_main, overwrite, create_directories_if_not_exist))

        if MAX_NUMBER_OF_FILE_VERSIONS >= 1:
            arr.append((file_path_versions, True, True))

            file_versions = []
            step = 0
            for _, _, files in os.walk(file_path_versions_dir):
                if step >= 1:
                    continue
                file_versions += files
                step += 1
            number_of_file_versions = len(file_versions)

            if number_of_file_versions >= MAX_NUMBER_OF_FILE_VERSIONS:
                number_of_file_versions_to_delete = 1 + \
                    (number_of_file_versions - MAX_NUMBER_OF_FILE_VERSIONS)
                for fn in sorted(file_versions)[:number_of_file_versions_to_delete]:
                    fn_path = os.path.join(file_path_versions_dir, fn)
                    os.remove(fn_path)

        for tup in arr:
            file_path, should_overwrite, should_create_directories = tup
            if self.file_exists(file_path) and not should_overwrite:
                raise FileExistsError(f'File at {file_path} already exists.')

            if should_create_directories:
                self.create_parent_directories(file_path)

            write_type = 'wb' if content and type(content) is bytes else 'w'
            yield file_path, write_type

    @classmethod
    def write(
        self,
        repo_path: str,
        dir_path: str,
        filename: str,
        content: str,
        create_directories_if_not_exist: bool = True,
        file_version_only: bool = False,
        overwrite: bool = True,
    ) -> None:
        for file_path, write_type in self.write_preprocess(
            repo_path,
            dir_path,
            filename,
            content,
            create_directories_if_not_exist=create_directories_if_not_exist,
            file_version_only=file_version_only,
            overwrite=overwrite,
        ):
            kwargs = dict(
                mode=write_type,
            )
            if write_type != 'wb':
                kwargs['encoding'] = 'utf-8'
            with open(file_path, **kwargs) as f:
                if content:
                    f.write(content or '')
        self.validate_content(dir_path, filename, content)

        update_caches(repo_path, dir_path, filename)

        update_file_cache()

    @classmethod
    async def write_async(
        self,
        repo_path: str,
        dir_path: str,
        filename: str,
        content: str,
        create_directories_if_not_exist: bool = True,
        file_version_only: bool = False,
        overwrite: bool = True,
    ) -> None:
        for file_path, write_type in self.write_preprocess(
            repo_path,
            dir_path,
            filename,
            content,
            create_directories_if_not_exist=create_directories_if_not_exist,
            file_version_only=file_version_only,
            overwrite=overwrite,
        ):
            kwargs = dict(
                mode=write_type,
            )
            if write_type != 'wb':
                kwargs['encoding'] = 'utf-8'
            async with aiofiles.open(file_path, **kwargs) as fp:
                await fp.write(content or '')

        await update_caches_async(repo_path, dir_path, filename)

        update_file_cache()

    @property
    def size(self) -> int:
        return os.path.getsize(self.file_path)

    @property
    def modified_timestamp(self) -> float:
        return os.path.getmtime(self.file_path)

    def exists(self) -> bool:
        return self.file_exists(self.file_path)

    def content(self):
        try:
            with open(self.file_path, encoding='utf-8') as fp:
                file_content = fp.read()
            return file_content
        except FileNotFoundError as err:
            print('file.content')
            print(err)
        return ''

    async def content_async(self):
        try:
            async with aiofiles.open(self.file_path, mode='r', encoding='utf-8') as fp:
                file_content = await fp.read()
            return file_content
        except Exception as err:
            print(f'[File.content_async] {err}')
        return ''

    def file_versions(self) -> List[str]:
        file_path_versions_dir = self.file_path_versions_dir(
            self.repo_path,
            self.dir_path,
            self.filename,
        )
        file_versions = []
        step = 0
        for _, _, files in os.walk(file_path_versions_dir):
            if step >= 1:
                continue
            file_versions += files
            step += 1

        file_path_versions_dir_without_repo = file_path_versions_dir.replace(
            os.path.join(self.repo_path, ''),
            '',
        )
        return [File(
            v,
            file_path_versions_dir_without_repo,
            self.repo_path,
        ) for v in sorted(file_versions, reverse=True)]

    def update_content(self, content: str):
        self.write(
            self.repo_path,
            self.dir_path,
            self.filename,
            content,
        )

    async def update_content_async(self, content: str):
        await self.write_async(
            self.repo_path,
            self.dir_path,
            self.filename,
            content,
        )

    def delete(self):
        os.remove(self.file_path)

        update_file_cache()

    def rename(self, dir_path: str, filename):
        full_path = os.path.join(self.repo_path, dir_path, filename)

        self.create_parent_directories(full_path)
        os.rename(self.file_path, full_path)

        file_path_versions_dir = self.file_path_versions_dir(
            self.repo_path,
            self.dir_path,
            self.filename,
        )
        if os.path.exists(file_path_versions_dir):
            new_path = self.file_path_versions_dir(
                self.repo_path,
                dir_path,
                filename,
            )
            os.makedirs(new_path, exist_ok=True)
            os.rename(
                file_path_versions_dir,
                new_path,
            )

        self.dir_path = dir_path
        self.filename = filename

        update_file_cache()

    def to_dict(self, include_content: bool = False, include_metadata: bool = False):
        file_exists = self.exists()
        data = dict(
            name=self.filename,
            path=os.path.join(self.dir_path, self.filename),
            size=None,
            modified_timestamp=None,
        )

        if include_content:
            data['content'] = self.content()

        if include_metadata and file_exists:
            data['size'] = self.size
            data['modified_timestamp'] = self.modified_timestamp

        return data

    async def to_dict_async(self, include_content=False):
        file_exists = self.exists()
        data = dict(
            name=self.filename,
            path=os.path.join(self.dir_path, self.filename),
            size=self.size if file_exists else None,
            modified_timestamp=self.modified_timestamp if file_exists else None,
        )
        if include_content:
            data['content'] = await self.content_async()

        return data


def ensure_file_is_in_project(file_path: str) -> None:
    if project_platform_activated():
        return

    full_file_path = get_absolute_path(file_path)
    full_repo_path = get_absolute_path(get_repo_path(file_path=file_path))
    if full_repo_path != os.path.commonpath([full_file_path, full_repo_path]):
        raise FileNotInProjectError(
            f'File at path: {file_path} is not in the project directory.')


def traverse(
    name: str,
    is_dir: bool,
    path: str,
    disabled=False,
    depth=1,
    dir_selector: Callable = None,
    file_selector: Callable = None,
    include_pipeline_count: bool = False,
    pipeline_count_mapping: Dict = None,
) -> Dict:
    tree_entry = dict(name=name)
    if not is_dir:
        tree_entry['disabled'] = disabled
        if include_pipeline_count:
            pipeline_count_mapping = pipeline_count_mapping or {}
            cache_key = remove_base_repo_path_or_name(path)
            pipeline_count = pipeline_count_mapping.get(cache_key)
            if pipeline_count is not None:
                tree_entry['pipeline_count'] = pipeline_count

        return tree_entry
    if depth >= MAX_DEPTH:
        return tree_entry
    can_access_children = name[0] == '.' or name in INACCESSIBLE_DIRS

    def __filter(
        entry,
        depth=depth,
        dir_selector=dir_selector,
        file_selector=file_selector,
    ) -> bool:
        if entry.name in BLACKLISTED_DIRS:
            return False

        if not file_selector:
            return True

        entry_path = entry.path
        if entry.is_dir(follow_symlinks=False) or os.path.isdir(entry_path):
            return True if dir_selector is None else dir_selector(dict(
                depth=depth + 1,
                name=str(entry.name),
                path=entry.path,
            ))
        else:
            return file_selector(dict(
                depth=depth + 1,
                name=str(entry.name),
                path=entry.path,
            ))

        return True

    tree_entry['children'] = list(
        traverse(
            entry.name,
            entry.is_dir(follow_symlinks=False),
            entry.path,
            can_access_children,
            depth + 1,
            dir_selector=dir_selector,
            file_selector=file_selector,
            include_pipeline_count=include_pipeline_count,
            pipeline_count_mapping=pipeline_count_mapping,
        ) for entry in sorted(
            filter(__filter, os.scandir(path)),
            key=lambda entry: entry.name,
        )
    )

    return tree_entry


def __should_update_dbt_cache(dir_path: str, filename: str) -> bool:
    project_model = Project(root_project=True)
    if project_model and project_model.is_feature_enabled(FeatureUUID.DBT_V2) and dir_path:
        # If the file is a SQL or YAML file
        if (
            filename.endswith('.sql') or
            filename.endswith('.yml') or
            filename.endswith('.yaml')
        ):
            base_dir_path = Path(dir_path).parts[0].lower()
            # If the file doesn’t exist in a block’s folder (e.g. data_loaders/, pipelines/)
            if base_dir_path not in IGNORE_DIRECTORY_NAMES:
                # If project platform features isn’t enabled or the repo_path exists outside of
                # the registered projects.
                return True

    return False


async def update_caches_async(repo_path: str, dir_path: str, filename: str) -> None:
    if __should_update_dbt_cache(dir_path, filename):
        print(f'Updating dbt cache for {repo_path}.')

        try:
            from mage_ai.cache.dbt.cache import DBTCache

            dbt_cache = await DBTCache.initialize_cache_async(root_project=True)
            await dbt_cache.update_async(file_path=os.path.join(repo_path, dir_path, filename))
        except Exception as err:
            print(f'[ERROR] File update DBTCache for {repo_path}, {dir_path}, {filename}: {err}.')
            if is_debug():
                raise err


def update_caches(repo_path: str, dir_path: str, filename: str) -> None:
    if __should_update_dbt_cache(dir_path, filename):
        print(f'Updating dbt cache for {repo_path}.')

        try:
            from mage_ai.cache.dbt.cache import DBTCache

            dbt_cache = DBTCache.initialize_cache(root_project=True)
            dbt_cache.update(file_path=os.path.join(repo_path, dir_path, filename))
        except Exception as err:
            print(f'[ERROR] File update DBTCache for {repo_path}, {dir_path}, {filename}: {err}.')
            if is_debug():
                raise err


def update_file_cache() -> None:
    project_model = Project(root_project=True)
    if project_model and project_model.is_feature_enabled(FeatureUUID.COMMAND_CENTER):
        from mage_ai.cache.file import FileCache
        FileCache().invalidate()
