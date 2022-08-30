from mage_ai.data_preparation.storage.base_storage import BaseStorage
from mage_ai.services.s3 import s3
from mage_ai.shared.constants import S3_PREFIX
from mage_ai.shared.parsers import encode_complex
from mage_ai.shared.urls import s3_url_path
from typing import Dict, List
import io
import json
import pandas as pd
import simplejson


class S3Storage(BaseStorage):
    def __init__(self, bucket=None, dirpath=None, **kwargs):
        if bucket is not None:
            self.client = s3.Client(bucket, **kwargs)
        else:
            if dirpath is None or not dirpath.startswith(S3_PREFIX):
                raise Exception('')
            path_parts = dirpath.replace(S3_PREFIX, '').split('/')
            bucket = path_parts.pop(0)
            self.client = s3.Client(bucket, **kwargs)

    def isdir(self, path: str) -> bool:
        if not path.endswith('/'):
            path += '/'
        return self.path_exists(path)

    def listdir(self, path: str) -> List[str]:
        if not path.endswith('/'):
            path += '/'
        path = s3_url_path(path)
        keys = self.client.list_folders(path)
        return [k[len(path):].rstrip('/') for k in keys]

    def makedirs(self, path: str, **kwargs) -> None:
        pass

    def path_exists(self, path: str) -> bool:
        return len(self.client.list_objects(s3_url_path(path))) > 0

    def remove(self, path: str) -> None:
        self.client.delete_objects(s3_url_path(path))

    def read_json_file(self, file_path: str, default_value={}) -> Dict:
        if not self.path_exists(file_path):
            return default_value
        return json.loads(self.client.read(s3_url_path(file_path)))

    def write_json_file(self, file_path: str, data) -> None:
        self.client.upload(
            s3_url_path(file_path),
            simplejson.dumps(
                data,
                default=encode_complex,
                ignore_nan=True,
            ),
        )

    def read_parquet(self, file_path: str, **kwargs) -> pd.DataFrame:
        buffer = io.BytesIO(self.client.get_object(s3_url_path(file_path)).read())
        return pd.read_parquet(buffer, **kwargs)

    def write_parquet(self, df: pd.DataFrame, file_path: str) -> None:
        buffer = io.BytesIO()
        df.to_parquet(buffer)
        buffer.seek(0)
        self.client.upload_object(s3_url_path(file_path), buffer)
