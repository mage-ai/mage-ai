import datetime
import zipfile
from typing import Dict

import jwt

from mage_ai.api.constants import DOWNLOAD_TOKEN_LIFESPAN, TEMPORARY_DOWNLOAD_LOCATION
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.download import Download
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import safe_db_query
from mage_ai.settings import JWT_DOWNLOAD_SECRET


class DownloadResource(GenericResource):

    @classmethod
    @safe_db_query
    async def create(self, payload: Dict, user, **kwargs) -> 'DownloadResource':
        host = kwargs['Host']
        parent_model = kwargs.get('parent_model')

        ignore_folder_structure = payload.get('ignore_folder_structure', False)

        if isinstance(parent_model, Pipeline):
            file_path = self.zip_pipeline(parent_model, ignore_folder_structure)
        elif isinstance(parent_model, File):
            if not parent_model.exists():
                raise Exception(f'File {parent_model.filename} does not exist.')
            file_path = parent_model.file_path

        token = self.generate_download_token(file_path)
        download = Download(token)

        return self(download, user)

    def zip_pipeline(pipeline: Pipeline, ignore_folder_structure: bool = False):
        config_path = pipeline.config_path
        repo_path = pipeline.repo_path

        zip_name = f'/{TEMPORARY_DOWNLOAD_LOCATION}/{pipeline.uuid}.zip'
        with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as pipeline_zip:
            rel_path = config_path.replace(repo_path, '')
            arcname = config_path.split('/')[-1] if ignore_folder_structure else rel_path
            pipeline_zip.write(config_path, arcname)  # write pipeline config to zip

            for block in pipeline.blocks_by_uuid.values():
                rel_path = block.file_path.replace(repo_path, '')
                arcname = block.file_path.split('/')[-1] if ignore_folder_structure else rel_path
                pipeline_zip.write(block.file_path, arcname)  # write individual blocks to pipeline
        return zip_name

    def generate_download_token(file_path):
        now = datetime.datetime.utcnow()
        payload = {
            "file_path": file_path,
            "iat": now,
            "exp": now + datetime.timedelta(seconds=DOWNLOAD_TOKEN_LIFESPAN)
        }
        return jwt.encode(payload, JWT_DOWNLOAD_SECRET, algorithm="HS256")
