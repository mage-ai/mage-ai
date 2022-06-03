from numpyencoder import NumpyEncoder
import json
import os
import os.path
import pandas as pd

# This is equivalent to ./files
DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'files'))


class Model:
    def __init__(self, id=None):
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

    def write_json_file(self, file_name, obj={}):
        with open(os.path.join(self.dir, file_name), 'w') as file:
            json.dump(obj, file, cls=NumpyEncoder)

    def read_parquet_file(self, file_name):
        file_path = os.path.join(self.dir, file_name)
        if not os.path.exists(file_path):
            return pd.DataFrame()
        return pd.read_parquet(file_path, engine='pyarrow')

    def write_parquet_file(self, file_name, df):
        df.to_parquet(os.path.join(self.dir, file_name))

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
                print(f'Fail to load {cls.__name__} with id {id}')
        return arr

    @staticmethod
    def gen_integer_dir_list(pathname):
        dirs = []
        for dirname in os.listdir(pathname):
            try:
                dirs.append(int(dirname))
            except ValueError:
                continue
        return dirs
