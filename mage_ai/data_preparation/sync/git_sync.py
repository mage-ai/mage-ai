from mage_ai.data_preparation.git import Git
from mage_ai.data_preparation.sync import GitConfig
from mage_ai.data_preparation.sync.base_sync import BaseSync
from mage_ai.shared.logger import VerboseFunctionExec
import asyncio


class GitSync(BaseSync):
    def __init__(self, sync_config: GitConfig):
        self.branch = sync_config.branch
        self.remote_repo_link = sync_config.remote_repo_link
        self.git_manager = Git(sync_config)

    def sync_data(self):
        with VerboseFunctionExec(
            f'Syncing data with remote repo {self.remote_repo_link}',
            verbose=True,
        ):
            asyncio.run(self.git_manager.check_connection())
            self.git_manager.reset(self.branch)
