import json
import os
import shutil
from contextlib import contextmanager
from typing import Dict, List

import aiofiles
import pandas as pd
import polars as pl
import simplejson

from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.storage.base_storage import BaseStorage
from mage_ai.shared.environments import is_debug
from mage_ai.shared.parsers import encode_complex


class LocalStorage(BaseStorage):
    def isdir(self, path: str) -> bool:
        return os.path.isdir(path)

    def listdir(self, path: str, suffix: str = None) -> List[str]:
        if not os.path.exists(path):
            return []
        paths = os.listdir(path)
        if suffix is not None:
            paths = [p for p in paths if p.endswith(suffix)]
        return paths

    def makedirs(self, path: str, **kwargs) -> None:
        os.makedirs(path, exist_ok=True)

    def path_exists(self, path: str) -> bool:
        return os.path.exists(path)

    def remove(self, path: str) -> None:
        os.remove(path)

    def remove_dir(self, path: str) -> None:
        shutil.rmtree(path, ignore_errors=True)

    def read_json_file(
        self,
        file_path: str,
        default_value: Dict = None,
        raise_exception: bool = False,
    ) -> Dict:
        if not self.path_exists(file_path):
            return default_value or {}
        with open(file_path) as file:
            try:
                return json.load(file)
            except Exception:
                if raise_exception:
                    raise
                return default_value or {}

    async def read_json_file_async(
        self,
        file_path: str,
        default_value: Dict = None,
        raise_exception: bool = False,
    ) -> Dict:
        if not self.path_exists(file_path):
            return default_value or {}
        async with aiofiles.open(file_path, mode='r') as file:
            try:
                return json.loads(await file.read())
            except Exception:
                if raise_exception:
                    raise
                return default_value or {}

    def write_json_file(self, file_path: str, data) -> None:
        dirname = os.path.dirname(file_path)
        if not os.path.isdir(dirname):
            os.mkdir(dirname)

        with open(file_path, 'w') as file:
            simplejson.dump(
                data,
                file,
                default=encode_complex,
                ignore_nan=True,
            )

    async def write_json_file_async(self, file_path: str, data) -> None:
        async with aiofiles.open(file_path, mode='w') as file:
            fcontent = simplejson.dumps(
                data,
                default=encode_complex,
                ignore_nan=True,
            )
            await file.write(fcontent)

    def read_parquet(self, file_path: str, **kwargs) -> pd.DataFrame:
        return pd.read_parquet(file_path, engine='pyarrow')

    def write_csv(self, df: pd.DataFrame, file_path: str) -> None:
        File.create_parent_directories(file_path)
        df.to_csv(file_path, index=False)

    def write_parquet(self, df: pd.DataFrame, file_path: str) -> None:
        File.create_parent_directories(file_path)
        df.to_parquet(file_path)

    def write_polars_dataframe(self, df: pl.DataFrame, file_path: str) -> None:
        File.create_parent_directories(file_path)
        df.write_parquet(file_path)

    @contextmanager
    def open_to_write(
        self,
        file_path: str,
        append: bool = False,
    ) -> None:
        dirname = os.path.dirname(file_path)
        if not os.path.isdir(dirname):
            os.mkdir(dirname)

        try:
            file = open(file_path, 'a' if append else 'w')
            yield file
        finally:
            file.close()

    async def read_async(self, file_path: str) -> str:
        dirname = os.path.dirname(file_path)
        if not os.path.isdir(dirname):
            os.mkdir(dirname)

        async with aiofiles.open(file_path, mode='r') as file:
            try:
                return await file.read()
            except Exception as err:
                if is_debug():
                    print(f'[ERROR] LocalStorage.read_async: {err}')
