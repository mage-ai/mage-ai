from dataclasses import dataclass
from enum import Enum
from mage_ai.shared.config import BaseConfig
import os


class SyncType(str, Enum):
    GIT = 'git'


@dataclass
class SyncConfig(BaseConfig):
    type: SyncType
    remote_repo_link: str
    repo_path: str = os.getcwd()
    branch: str = 'main'
    sync_on_pipeline_run: bool = False
