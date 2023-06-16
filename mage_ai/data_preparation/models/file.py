import os
from datetime import datetime
from typing import Dict, List, Tuple

import aiofiles

from mage_ai.data_preparation.models.errors import FileExistsError
from mage_ai.data_preparation.repo_manager import get_repo_path

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
    def create_parent_directories(self, file_path: str) -> bool:
        will_create = not self.file_exists(file_path)
        if will_create:
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
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
        repo_path = repo_path or get_repo_path()
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
        repo_path = repo_path or get_repo_path()
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
            repo_path_alt = get_repo_path()
        return File(os.path.basename(file_path), os.path.dirname(file_path), repo_path_alt)

    @classmethod
    def get_all_files(self, repo_path):
        return traverse(os.path.basename(repo_path), True, repo_path)

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
                    f.write(content)
        self.validate_content(dir_path, filename, content)

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
                await fp.write(content)

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
        except FileNotFoundError as err:
            print(err)
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

    def to_dict(self, include_content=False):
        data = dict(name=self.filename, path=os.path.join(self.dir_path, self.filename))
        if include_content:
            data['content'] = self.content()
        return data

    async def to_dict_async(self, include_content=False):
        data = dict(name=self.filename, path=os.path.join(self.dir_path, self.filename))
        if include_content:
            data['content'] = await self.content_async()
        return data


def traverse(name: str, is_dir: str, path: str, disabled=False, depth=1) -> Dict:
    tree_entry = dict(name=name)
    if not is_dir:
        tree_entry['disabled'] = disabled
        return tree_entry
    if depth >= MAX_DEPTH:
        return tree_entry
    can_access_children = name[0] == '.' or name in INACCESSIBLE_DIRS
    tree_entry['children'] = list(
        traverse(
            entry.name,
            entry.is_dir(follow_symlinks=False),
            entry.path,
            can_access_children,
            depth + 1,
        )
        for entry in sorted(
            filter(lambda entry: entry.name not in BLACKLISTED_DIRS, os.scandir(path)),
            key=lambda entry: entry.name,
        )
    )
    return tree_entry
