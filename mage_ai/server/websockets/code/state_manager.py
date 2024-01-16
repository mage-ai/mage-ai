import os
import pickle
import shutil
from typing import Dict, List

from mage_ai.data_preparation.storage.local_storage import LocalStorage
from mage_ai.settings.repo import get_repo_path, get_variables_dir

CODE_STATE_MANAGER_DIRECTORY_NAME = '.code_state_manager'
FILENAME_OUTPUTS = 'outputs.json'
FILENAME_VARIABLES = 'variables.json'


def build_path(repo_path: str, partition: str, filename: str = None) -> str:
    path = os.path.join(
        get_variables_dir(repo_path=repo_path),
        CODE_STATE_MANAGER_DIRECTORY_NAME,
        partition,
    )
    if filename:
        path = os.path.join(path, filename)
    return path


class CodeStateManager:
    def __init__(self, repo_path: str = None):
        self.repo_path = repo_path or get_repo_path(root_project=True)
        self._storage = None

    @property
    def storage(self) -> LocalStorage:
        if not self._storage:
            self._storage = LocalStorage()

        return self._storage

    def get_variables(self, partition: str) -> List[str]:
        return self.storage.read_json_file(
            build_path(self.repo_path, partition, FILENAME_VARIABLES),
            None,
        )

    def save_variables(self, partition: str, values: List[str]) -> None:
        os.makedirs(build_path(self.repo_path, partition), exist_ok=True)

        self.storage.write_json_file(
            build_path(self.repo_path, partition, FILENAME_VARIABLES),
            values,
        )

    def save_outputs(self, partition: str, outputs: Dict, outputs_to_pickle: Dict) -> None:
        os.makedirs(build_path(self.repo_path, partition), exist_ok=True)
        os.makedirs(build_path(self.repo_path, partition, 'outputs'), exist_ok=True)

        for key, value in outputs_to_pickle.items():
            with open(os.path.join(
                build_path(self.repo_path, partition, 'outputs'),
                key,
            ), 'wb') as f:
                pickle.dump(value, f)

        self.storage.write_json_file(
            build_path(self.repo_path, partition, FILENAME_OUTPUTS),
            outputs,
        )

    def move_variables(self, partition: str, partition_new: str) -> None:
        os.makedirs(build_path(self.repo_path, partition_new), exist_ok=True)
        shutil.move(
            build_path(self.repo_path, partition),
            build_path(self.repo_path, partition_new),
        )
        shutil.rmtree(build_path(self.repo_path, partition))
