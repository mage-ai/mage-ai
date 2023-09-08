import os
import shutil
from dataclasses import dataclass, field
from typing import Dict, List

import yaml

from mage_ai.data_preparation.repo_manager import RepoConfig, get_repo_config
from mage_ai.presenters.block_layout.constants import (
    BLOCK_LAYOUT_FILENAME_WITH_EXTENSION,
)
from mage_ai.presenters.constants import (
    MAGE_PRESENTERS_DIRECTORY_DEFAULT,
    MAGE_PRESENTERS_DIRECTORY_ENVIRONMENT_VARIABLE_NAME,
)
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.config import BaseConfig
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.io import safe_write


@dataclass
class PageBlockLayout(BaseConfig):
    blocks: Dict = field(default_factory=dict)
    directory_path: str = None
    layout: List = field(default_factory=list)
    uuid: str = None

    @classmethod
    def load(self, uuid: str, repo_config=None, repo_path: str = None):
        repo_path_to_use = repo_path or get_repo_path()

        if repo_config is None:
            repo_config_to_use = get_repo_config(repo_path=repo_path_to_use)
        elif isinstance(repo_config, dict):
            repo_config_to_use = RepoConfig.from_dict(repo_config)
        else:
            repo_config_to_use = repo_config

        directory_path = os.getenv(
            MAGE_PRESENTERS_DIRECTORY_ENVIRONMENT_VARIABLE_NAME,
        ) or os.path.join(
            repo_config_to_use.variables_dir,
            MAGE_PRESENTERS_DIRECTORY_DEFAULT,
        )

        file_path = os.path.join(
            directory_path,
            uuid,
            BLOCK_LAYOUT_FILENAME_WITH_EXTENSION,
        )

        if os.path.isfile(file_path):
            block_layout = super().load(file_path)
        else:
            block_layout = self()

        block_layout.directory_path = directory_path
        block_layout.uuid = uuid

        return block_layout

    @property
    def file_path(self) -> str:
        return os.path.join(
            self.directory_path,
            self.uuid,
            BLOCK_LAYOUT_FILENAME_WITH_EXTENSION,
        )

    def to_dict(self, include_content: bool = False) -> Dict:
        return merge_dict(self.to_dict_base(), dict(
            uuid=self.uuid,
        ))

    def to_dict_base(self) -> Dict:
        return dict(
            blocks=self.blocks,
            layout=self.layout,
        )

    def save(self) -> None:
        content = yaml.safe_dump(self.to_dict_base())
        file_path = self.file_path
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        safe_write(file_path, content)

    def delete(self) -> None:
        shutil.rmtree(self.file_path)
