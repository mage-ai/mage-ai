import os
import shutil
import urllib.parse
from typing import Dict

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.errors import FileNotInProjectError
from mage_ai.data_preparation.models.file import ensure_file_is_in_project
from mage_ai.orchestration.db import safe_db_query
from mage_ai.settings.repo import get_repo_path


def full_path(*args) -> str:
    return os.path.join(get_repo_path(), *list(filter(lambda x: x and len(x) >= 1, args)))


class FolderResource(GenericResource):
    @classmethod
    @safe_db_query
    def create(cls, payload: Dict, user, **kwargs) -> 'FolderResource':
        path = full_path(payload.get('path'), payload.get('name'))
        cls.check_folder_is_in_project(path)
        os.makedirs(path, exist_ok=True if payload.get('overwrite', False) else False)
        return cls(dict(path=path), user, **kwargs)

    @classmethod
    def member(cls, pk, user, **kwargs):
        path = full_path(urllib.parse.unquote(pk))
        return cls(dict(path=path), user, **kwargs)

    def delete(self, **kwargs):
        self.check_folder_is_in_project(self.path)
        return shutil.rmtree(self.path)

    def update(self, payload, **kwargs):
        path = full_path(payload.get('path'), payload.get('name'))
        self.check_folder_is_in_project(path)
        shutil.move(self.path, path)
        self.model = dict(path=path)
        return self

    @classmethod
    def check_folder_is_in_project(cls, path: str) -> None:
        try:
            ensure_file_is_in_project(path)
        except FileNotInProjectError:
            error = ApiError.RESOURCE_INVALID.copy()
            error.update(message=f'Folder at path: {path} is not in the project directory.')
            raise ApiError(error)
