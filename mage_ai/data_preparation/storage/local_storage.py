from mage_ai.data_preparation.storage.base_storage import BaseStorage
from mage_ai.shared.parsers import encode_complex
from typing import Dict, List
import aiofiles
import json
import os
import pandas as pd
import shutil
import simplejson


class LocalStorage(BaseStorage):
    def isdir(self, path: str) -> bool:
        return os.listdir(path)

    def listdir(self, path: str) -> List[str]:
        return os.listdir(path)

    def makedirs(self, path: str, **kwargs) -> None:
        os.makedirs(path, exist_ok=True)

    def path_exists(self, path: str) -> bool:
        return os.path.exists(path)

    def remove(self, path: str) -> None:
        os.remove(path)

    def remove_dir(self, path: str) -> None:
        shutil.rmtree(path)

    def read_json_file(self, file_path: str, default_value={}) -> Dict:
        if not self.path_exists(file_path):
            return default_value
        with open(file_path) as file:
            try:
                return json.load(file)
            except Exception:
                return dict()

    async def read_json_file_async(self, file_path: str, default_value={}) -> Dict:
        if not self.path_exists(file_path):
            return default_value
        async with aiofiles.open(file_path, mode='r') as file:
            try:
                return json.loads(await file.read())
            except Exception:
                return dict()

    def write_json_file(self, file_path: str, data) -> None:
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
        df.to_csv(file_path, index=False)

    def write_parquet(self, df: pd.DataFrame, file_path: str) -> None:
        df.to_parquet(file_path)
