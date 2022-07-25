from mage_ai.shared.parsers import encode_complex
import json
import logging
import os
import os.path
import pandas as pd
import simplejson

# This is equivalent to ./files
DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'files'))

logger = logging.getLogger(__name__)


class Model:
    def __init__(self, id=None, path=None):
        self.path = None
        if path is not None:
            abs_path = os.path.abspath(path)
            self.dir = abs_path
            self.path = abs_path
            return

        # TODO: figure out a good directory to store the files
        if not os.path.isdir(DATA_PATH):
            os.mkdir(DATA_PATH)

        self.path = self.path_name()
        if not os.path.isdir(self.path):
            os.mkdir(self.path)

        if id is None:
            dirs = Model.gen_integer_dir_list(self.path)
            max_id = 0
            if len(dirs) > 0:
                max_id = sorted(dirs, reverse=True)[0]
            self.id = max_id + 1
        else:
            self.id = id

        self.dir = os.path.join(self.path, str(self.id))
        if not os.path.isdir(self.dir):
            os.mkdir(self.dir)

    def read_json_file(self, file_name, default_value={}):
        file_path = os.path.join(self.dir, file_name)
        if not os.path.exists(file_path):
            return default_value
        with open(file_path) as file:
            return json.load(file)

    def write_json_file(self, file_name, obj={}, subdir=None):
        if subdir is None:
            dir_path = self.dir
        else:
            dir_path = os.path.join(self.dir, subdir)
            if not os.path.isdir(dir_path):
                os.mkdir(dir_path)
        with open(os.path.join(dir_path, file_name), 'w') as file:
            simplejson.dump(
                obj,
                file,
                default=encode_complex,
                ignore_nan=True,
            )

    def read_parquet_file(self, file_name):
        file_path = os.path.join(self.dir, file_name)
        if not os.path.exists(file_path):
            return pd.DataFrame()
        return pd.read_parquet(file_path, engine='pyarrow')

    def write_parquet_file(self, file_name, df):
        df_output = df.copy()
        # Clean up data types since parquet doesn't support mixed data types
        for c in df_output.columns:
            series_non_null = df_output[c].dropna()
            if len(series_non_null) > 0:
                coltype = type(series_non_null.iloc[0])
                try:
                    df_output[c] = series_non_null.astype(coltype)
                except Exception:
                    # Fall back to convert to string
                    df_output[c] = series_non_null.astype(str)
        df_output.to_parquet(os.path.join(self.dir, file_name))

    def to_dict(self, detailed):
        pass

    @classmethod
    def folder_name(cls):
        return cls.__name__

    @classmethod
    def is_valid_id(cls, id):
        opts = Model.gen_integer_dir_list(cls.path_name())
        return int(id) in opts

    @classmethod
    def path_name(cls):
        return os.path.join(DATA_PATH, cls.folder_name())

    @classmethod
    def objects(cls):
        arr = []
        dirs = sorted(Model.gen_integer_dir_list(cls.path_name()), reverse=True)
        for id in dirs:
            try:
                arr.append(cls(id=id))
            except Exception:
                logger.exception(f'Fail to load {cls.__name__} with id {id}')
        return arr

    @staticmethod
    def gen_integer_dir_list(pathname):
        dirs = []
        if not os.path.isdir(pathname):
            return []
        for dirname in os.listdir(pathname):
            try:
                dirs.append(int(dirname))
            except ValueError:
                continue
        return dirs
