import io
import json
from contextlib import contextmanager
from typing import Dict, List

import pandas as pd
import polars as pl
import simplejson
from google.cloud import storage

from mage_ai.data_preparation.storage.base_storage import BaseStorage
from mage_ai.shared.constants import GCS_PREFIX
from mage_ai.shared.parsers import encode_complex
from mage_ai.shared.urls import gcs_url_path


class GCSStorage(BaseStorage):
    def __init__(self, dirpath=None, **kwargs):
        self.client = storage.Client()

        if dirpath is None or not dirpath.startswith(GCS_PREFIX):
            raise Exception('')

        path_parts = dirpath.replace(GCS_PREFIX, '').split('/')
        self.bucket = self.client.bucket(path_parts.pop(0))

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
        path = gcs_url_path(path)

        """
        NOTE: The number of results returned by the GCS bucket list_blobs method may
        be lower than the number entered for the max_results argument, since this
        method recursively fetches files inside of subdirectories at the path
        specified, not just the directories themselves at the top level of the path.

        As a result, when fetching block output folders in a remote variables directory,
        the json or parquet files inside of the block output folders (e.g. the "type.json"
        file in folder "output_0") are counted towards the "max_results" limit. If max_results
        is set to 10, less than 10 output folders may be returned due to there being multiple
        json or other files in each output folder. We do not increase the max_results or
        include a "delimiter" argument because it would increase load times to unacceptable levels.

        Example block output path in GCS:
            gs://mage_demo/pipelines/example_pipeline/.variables/example_block/output_0/
        """
        try:
            blobs = self.bucket.list_blobs(
                prefix=path,
                max_results=max_results,
            )
        except Exception:
            return []
        keys = []
        for blob in blobs:
            # Avoid finding files recursevively in the dir path.
            blob_path = blob.name.replace(path, '').split('/')
            if len(blob_path) > 1 and blob_path[1] != '':
                continue
            if (suffix is None or blob.name.endswith(suffix)) and blob.name != path:
                keys.append(blob.name)
        return [k[len(path):].rstrip('/') for k in keys]

    def makedirs(self, path: str, **kwargs) -> None:
        blob = self.bucket.blob(gcs_url_path(path) + '/')
        blob.upload_from_string('')

    def path_exists(self, path: str) -> bool:
        blob = self.bucket.blob(blob_name=gcs_url_path(path))
        dir = self.bucket.blob(blob_name=gcs_url_path(path + '/'))
        return blob.exists() or dir.exists()

    def remove(self, path: str) -> None:
        self.bucket.delete_blob(gcs_url_path(path))

    def remove_dir(self, path: str) -> None:
        blobs = self.bucket.list_blobs(prefix=gcs_url_path(path))
        for blob in blobs:
            blob.delete()

    def read_json_file(
        self,
        file_path: str,
        default_value=None,
        raise_exception: bool = False,
    ) -> Dict:
        if default_value is None:
            default_value = {}
        try:
            return json.loads(self.bucket.blob(gcs_url_path(file_path)).download_as_string())
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
        blob = self.bucket.blob(gcs_url_path(file_path))
        data = simplejson.dumps(
                data,
                default=encode_complex,
                ignore_nan=True,
            )
        blob.upload_from_string(data=data, content_type='application/json')

    async def write_json_file_async(self, file_path: str, data) -> None:
        """
        TODO: Implement async http call.
        """
        return self.write_json_file(file_path, data)

    def read_parquet(self, file_path: str, **kwargs) -> pd.DataFrame:
        buffer = io.BytesIO(self.bucket.blob(gcs_url_path(file_path)).download_as_bytes())
        return pd.read_parquet(buffer, **kwargs)

    def read_polars_parquet(self, file_path: str, **kwargs) -> pl.DataFrame:
        buffer = io.BytesIO(self.bucket.blob(gcs_url_path(file_path)).download_as_bytes())
        return pl.read_parquet(buffer, **kwargs)

    def write_parquet(self, df: pd.DataFrame, file_path: str) -> None:
        buffer = io.BytesIO()
        df.to_parquet(buffer)
        buffer.seek(0)
        blob = self.bucket.blob(gcs_url_path(file_path))
        blob.upload_from_string(buffer.getvalue())

    def write_polars_dataframe(self, df: pl.DataFrame, file_path: str) -> None:
        buffer = io.BytesIO()
        df.write_parquet(buffer)
        buffer.seek(0)
        blob = self.bucket.blob(gcs_url_path(file_path))
        blob.upload_from_string(buffer.getvalue())

    @contextmanager
    def open_to_write(self, file_path: str) -> None:
        try:
            stream = io.StringIO()
            yield stream
        finally:
            blob = self.bucket.blob(gcs_url_path(file_path))
            blob.upload_from_string(stream.getvalue())
            stream.close()

    async def read_async(self, file_path: str) -> str:
        pass
