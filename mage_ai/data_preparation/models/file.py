from mage_ai.data_preparation.models.errors import FileExistsError
from mage_ai.data_preparation.repo_manager import get_repo_path
from typing import Dict
import aiofiles
import os

BLACKLISTED_DIRS = frozenset([
    'venv',
    'env',
    '.git',
    '.logs',
    '.variables',
    '.DS_Store',
    '__pycache__'
])
INACCESSIBLE_DIRS = frozenset(['__pycache__'])
MAX_DEPTH = 30


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
        overwrite: bool = True,
    ):

        repo_path = repo_path or get_repo_path()
        file = File(filename, dir_path, repo_path)
        file_path = file.file_path

        if self.file_exists(file_path) and not overwrite:
            raise FileExistsError(f'File at {file_path} already exists.')

        if create_directories_if_not_exist:
            self.create_parent_directories(file_path)

        write_type = 'wb' if content and type(content) is bytes else 'w'
        with open(file_path, write_type) as f:
            if content:
                f.write(content)

        return file

    @classmethod
    def from_path(self, file_path, repo_path=None):
        repo_path = repo_path or get_repo_path()
        return File(os.path.basename(file_path), os.path.dirname(file_path), repo_path)

    @classmethod
    def get_all_files(self, repo_path):
        return traverse(os.path.basename(repo_path), True, repo_path)

    def exists(self) -> bool:
        return self.file_exists(self.file_path)

    def content(self):
        try:
            with open(self.file_path) as fp:
                file_content = fp.read()
            return file_content
        except FileNotFoundError as err:
            print(err)
        return ''

    async def content_async(self):
        try:
            async with aiofiles.open(self.file_path, mode='r') as fp:
                file_content = await fp.read()
            return file_content
        except FileNotFoundError as err:
            print(err)
        return ''

    def update_content(self, content):
        with open(self.file_path, 'w') as fp:
            fp.write(content)

    async def update_content_async(self, content):
        async with aiofiles.open(self.file_path, mode='w') as fp:
            await fp.write(content)

    def delete(self):
        os.remove(self.file_path)

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
