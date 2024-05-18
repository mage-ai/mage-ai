from mage_ai.data_preparation.storage.base_storage import BaseStorage


class BaseData:
    def __init__(self, repo_path: str, storage: BaseStorage, variables_dir: str):
        self.repo_path = repo_path
        self.storage = storage
        self.variables_dir = variables_dir
