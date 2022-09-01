from mage_ai.data_preparation.repo_manager import get_repo_path
from typing import Dict
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
    def create(self, filename, dir_path, repo_path=None):
        repo_path = repo_path or get_repo_path()
        file = File(filename, dir_path, repo_path)
        with open(file.file_path, 'w'):
            pass
        return file

    @classmethod
    def from_path(self, file_path, repo_path=None):
        repo_path = repo_path or get_repo_path()
        return File(os.path.basename(file_path), os.path.dirname(file_path), repo_path)

    @classmethod
    def get_all_files(self, repo_path):
        return traverse(os.path.basename(repo_path), True, repo_path)

    def content(self):
        try:
            with open(self.file_path) as fp:
                file_content = fp.read()
            return file_content
        except FileNotFoundError as err:
            print(err)
        return ''

    def update_content(self, content):
        with open(self.file_path, 'w') as fp:
            fp.write(content)

    def delete(self):
        os.remove(self.file_path)

    def to_dict(self, include_content=False):
        data = dict(name=self.filename, path=os.path.join(self.dir_path, self.filename))
        if include_content:
            data['content'] = self.content()
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
