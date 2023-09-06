from typing import Union

from mage_ai.data_preparation.git import Git
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.sync import GitConfig
from mage_ai.data_preparation.sync.base_sync import BaseSync
from mage_ai.shared.logger import VerboseFunctionExec


class GitSync(BaseSync):
    def __init__(self, sync_config: GitConfig, setup_repo: bool = True):
        self.branch = sync_config.branch or 'main'
        self.remote_repo_link = sync_config.remote_repo_link
        self.git_manager = Git(git_config=sync_config, setup_repo=setup_repo)

    def sync_data(self):
        self.git_manager.reset_hard(branch=self.branch)

    # Reset git sync by cloning the remote repo
    def reset(self):
        with VerboseFunctionExec(
            f'Attempting to clone from remote repo {self.remote_repo_link}',
            verbose=True,
        ):
            self.git_manager.clone()


def get_sync_config() -> Union[GitConfig, None]:
    sync_config = None
    preferences = get_preferences()

    if preferences.sync_config:
        sync_config = GitConfig.load(config=preferences.sync_config)
    return sync_config
