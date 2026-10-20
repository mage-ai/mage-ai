import os
from typing import Union

from mage_ai.data_preparation.git import Git
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.sync import GitConfig
from mage_ai.data_preparation.sync.base_sync import BaseSync
from mage_ai.shared.logger import VerboseFunctionExec


class PreserveGitConfig:
    def __init__(self):
        self.preferences_file_path = get_preferences().preferences_file_path
        self.initial_preferences = None

    def __enter__(self):
        if os.path.exists(self.preferences_file_path):
            with open(self.preferences_file_path, 'r', encoding='utf-8') as f:
                self.initial_preferences = f.read()

    def __exit__(self, exc_type, exc_value, exc_tb):
        if self.initial_preferences is not None:
            with open(self.preferences_file_path, 'w', encoding='utf-8') as f:
                f.write(self.initial_preferences)


class GitSync(BaseSync):
    def __init__(self, sync_config: GitConfig, setup_repo: bool = False):
        self.sync_submodules = sync_config.sync_submodules
        self.branch = sync_config.branch or 'main'
        self.remote_repo_link = sync_config.remote_repo_link
        self.git_manager = Git(
            auth_type=sync_config.auth_type,
            git_config=sync_config,
            setup_repo=setup_repo,
        )

    def sync_data(self):
        with PreserveGitConfig():
            self.git_manager.reset_hard(branch=self.branch)
            if self.sync_submodules:
                self.git_manager.submodules_update()

    # Reset git sync by cloning the remote repo
    def reset(self):
        with PreserveGitConfig(), VerboseFunctionExec(
            f'Attempting to clone from remote repo {self.remote_repo_link}',
            verbose=True,
        ):
            self.git_manager.clone(sync_submodules=self.sync_submodules)


def get_sync_config() -> Union[GitConfig, None]:
    sync_config = None
    preferences = get_preferences()

    if preferences.sync_config:
        sync_config = GitConfig.load(config=preferences.sync_config)
    return sync_config
