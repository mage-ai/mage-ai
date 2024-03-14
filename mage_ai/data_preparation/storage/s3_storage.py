import io
import json
from contextlib import contextmanager
from typing import Dict, List

import pandas as pd
import polars as pl
import simplejson

from mage_ai.data_preparation.storage.base_storage import BaseStorage
from mage_ai.services.aws.s3 import s3
from mage_ai.shared.constants import S3_PREFIX
from mage_ai.shared.parsers import encode_complex
from mage_ai.shared.urls import s3_url_path


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

    def listdir(
        self,
        path: str,
        suffix: str = None,
        max_results: int = None,
    ) -> List[str]:
        if not path.endswith('/'):
            path += '/'
        path = s3_url_path(path)
        keys = self.client.listdir(path, suffix=suffix, max_results=max_results)
        return [k[len(path):].rstrip('/') for k in keys]

    def makedirs(self, path: str, **kwargs) -> None:
        pass

    def path_exists(self, path: str) -> bool:
        results = self.client.list_objects(s3_url_path(path), max_keys=1)
        return len(results) > 0

    def remove(self, path: str) -> None:
        self.client.delete_objects(s3_url_path(path))

    def remove_dir(self, path: str) -> None:
        self.client.delete_objects(s3_url_path(path))

    def read_json_file(
        self,
        file_path: str,
        default_value=None,
        raise_exception: bool = False,
    ) -> Dict:
        if default_value is None:
            default_value = {}
        try:
            return json.loads(self.client.read(s3_url_path(file_path)))
        except Exception:
            if raise_exception:
                raise
            return default_value

    async def read_json_file_async(
        self,
        file_path: str,
        default_value=None,
        raise_exception: bool = False,
    ) -> Dict:
        """
        TODO: Implement async http call.
        """
        return self.read_json_file(
            file_path, default_value=default_value, raise_exception=raise_exception)

    def write_json_file(self, file_path: str, data) -> None:
        self.client.upload(
            s3_url_path(file_path),
            simplejson.dumps(
                data,
                default=encode_complex,
                ignore_nan=True,
            ),
        )

    async def write_json_file_async(self, file_path: str, data) -> None:
        """
        TODO: Implement async http call.
        """
        return self.write_json_file(file_path, data)

    def read_parquet(self, file_path: str, **kwargs) -> pd.DataFrame:
        buffer = io.BytesIO(self.client.get_object(s3_url_path(file_path)).read())
        return pd.read_parquet(buffer, **kwargs)

    def read_polars_parquet(self, file_path: str, **kwargs) -> pl.DataFrame:
        buffer = io.BytesIO(self.client.get_object(s3_url_path(file_path)).read())
        return pl.read_parquet(buffer, **kwargs)

    def write_parquet(self, df: pd.DataFrame, file_path: str) -> None:
        buffer = io.BytesIO()
        df.to_parquet(buffer)
        buffer.seek(0)
        self.client.upload_object(s3_url_path(file_path), buffer)

    def write_polars_dataframe(self, df: pl.DataFrame, file_path: str) -> None:
        buffer = io.BytesIO()
        df.write_parquet(buffer)
        buffer.seek(0)
        self.client.upload_object(s3_url_path(file_path), buffer)

    @contextmanager
    def open_to_write(self, file_path: str) -> None:
        try:
            stream = io.StringIO()
            yield stream
        finally:
            self.client.upload(s3_url_path(file_path), stream.getvalue())
            stream.close()

    async def read_async(self, file_path: str) -> str:
        pass
