from typing import Dict
import os

MAX_DEPTH = 30
INACCESSIBLE_DIRS = frozenset(['__pycache__'])


class File:
    def __init__(self, filename, dir_path, repo_path):
        self.filename = filename
        self.dir_path = dir_path
        self.repo_path = repo_path

    @property
    def file_path(self):
        return os.path.join(self.repo_path, self.dir_path, self.filename)

    @classmethod
    def create(self, filename, dir_path, repo_path):
        file = File(filename, dir_path, repo_path)
        with open(file.file_path, 'w'):
            pass
        return file

    @classmethod
    def from_path(self, file_path, repo_path):
        return File(os.path.basename(file_path), os.path.dirname(file_path), repo_path)

    @classmethod
    def get_all_files(self, repo_path):
        return traverse(os.path.basename(repo_path), True, repo_path)

    def content(self):
        with open(self.file_path) as fp:
            file_content = fp.read()
        return file_content

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
        for entry in sorted(os.scandir(path), key=lambda entry: entry.name)
    )
    return tree_entry
