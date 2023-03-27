from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig
import os


@dataclass
class GitConfig(BaseConfig):
    remote_repo_link: str
    repo_path: str = os.getcwd()
    username: str = ''
    email: str = ''
    branch: str = 'main'
    sync_on_pipeline_run: bool = False
    # This is not necessary anymore, but leaving it for backwards compatibility
    type: str = 'git'
