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
        return traverse(repo_path)

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


def traverse(directory: str) -> Dict:
    """
    Traverses directory tree and returns the underlying file structure

    Args:
        directory (str): Top-level directory to generate tree from

    Returns:
        Dict: Directory tree payload representation
    """
    name = os.path.splitext(os.path.basename(directory))[0]
    disabled = name[0] == '.' or name in INACCESSIBLE_DIRS
    children = []
    entries = os.scandir(directory)
    children.extend(
        _traverse(entry, disabled, 1) for entry in sorted(entries, key=lambda entry: entry.name)
    )
    return dict(name=name, children=children)


def _traverse(entry, disabled=True, depth=1) -> Dict:
    name = entry.name
    tree_entry = dict(name=name)
    if entry.is_file():
        tree_entry['disabled'] = disabled
    if not entry.is_dir():
        return tree_entry
    entries = os.scandir(entry.path)
    children = []
    can_access_children = name[0] == '.' or name in INACCESSIBLE_DIRS
    children.extend(
        _traverse(entry, can_access_children, depth + 1)
        for entry in sorted(entries, key=lambda entry: entry.name)
    )
    tree_entry['children'] = children
    return tree_entry
