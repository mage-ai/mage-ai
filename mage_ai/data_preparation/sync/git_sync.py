from mage_ai.data_preparation.git import Git
from mage_ai.data_preparation.sync import GitConfig
from mage_ai.data_preparation.sync.base_sync import BaseSync
from mage_ai.shared.logger import VerboseFunctionExec


class GitSync(BaseSync):
    def __init__(self, sync_config: GitConfig):
        self.branch = sync_config.branch or 'main'
        self.remote_repo_link = sync_config.remote_repo_link
        self.git_manager = Git(sync_config)

    def sync_data(self):
        with VerboseFunctionExec(
            f'Syncing data with remote repo {self.remote_repo_link}',
            verbose=True,
        ):
            self.git_manager.reset(self.branch)

    def reset(self):
        with VerboseFunctionExec(
            f'Attempting to clone from remote repo {self.remote_repo_link}',
            verbose=True,
        ):
            self.git_manager.clone()
