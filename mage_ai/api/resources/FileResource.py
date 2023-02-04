from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.repo_manager import get_repo_path
from typing import Dict


class FileResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        return self.build_result_set(
            [File.get_all_files(get_repo_path())],
            user,
            **kwargs,
        )

    @classmethod
    def create(self, payload: Dict, user, **kwargs) -> 'FileResource':
        dir_path = payload['dir_path']
        repo_path = get_repo_path()
        content = None

        if 'file' in payload:
            file = payload['file'][0]
            filename = file['filename']
            content = file['body']
            if type(content) is not str:
                content = content.decode()
        else:
            filename = payload['name']

        file = File.create(
            filename,
            dir_path,
            repo_path=repo_path,
            content=content,
        )

        return self(file.to_dict(), user, **kwargs)
