from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.orchestration.db import safe_db_query
from typing import Dict
import os
import shutil
import urllib.parse


def full_path(*args) -> str:
    return os.path.join(get_repo_path(), *list(filter(lambda x: x and len(x) >= 1, args)))


class FolderResource(GenericResource):
    @classmethod
    @safe_db_query
    def create(self, payload: Dict, user, **kwargs) -> 'FolderResource':
        path = full_path(payload.get('path'), payload.get('name'))
        os.makedirs(path, exist_ok=True if payload.get('overwrite', False) else False)
        return self(dict(path=path), user, **kwargs)

    @classmethod
    def member(self, pk, user, **kwargs):
        path = full_path(urllib.parse.unquote(pk))
        return self(dict(path=path), user, **kwargs)

    @safe_db_query
    def delete(self, **kwargs):
        return shutil.rmtree(self.path)

    @safe_db_query
    def update(self, payload, **kwargs):
        path = full_path(payload.get('path'), payload.get('name'))
        shutil.move(self.path, path)
        self.model = dict(path=path)
        return self
