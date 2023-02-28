from mage_ai.data_preparation.sync.base_sync import BaseSync
from typing import Dict
import git
import os


class GitSync(BaseSync):
    def __init__(self, sync_config: Dict):
        self.remote_repo_link = sync_config.get('remote_repo_link')
        self.repo_path = sync_config.get('repo_path', os.getcwd())
        self.branch = sync_config.get('branch', 'main')
        try:
            self.repo = git.Repo(self.repo_path)
        except git.exc.InvalidGitRepositoryError:
            self.repo = git.Repo.init(self.repo_path)
            self.repo.create_remote('origin', self.remote_repo_link)

        self.origin = self.repo.remotes.origin

    def sync_data(self):
        self.origin.fetch(kill_after_timeout=60)
        self.repo.git.reset('--hard', f'origin/{self.branch}')
