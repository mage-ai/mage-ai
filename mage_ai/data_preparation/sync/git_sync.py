from mage_ai.data_preparation.sync import SyncConfig
from mage_ai.data_preparation.sync.base_sync import BaseSync
from mage_ai.shared.logger import VerboseFunctionExec
import git
import subprocess


class GitSync(BaseSync):
    def __init__(self, sync_config: SyncConfig):
        self.remote_repo_link = sync_config.remote_repo_link
        self.repo_path = sync_config.repo_path
        self.branch = sync_config.branch
        try:
            self.repo = git.Repo(self.repo_path)
        except git.exc.InvalidGitRepositoryError:
            self.repo = git.Repo.init(self.repo_path)

        try:
            self.repo.create_remote('origin', self.remote_repo_link)
        except git.exc.GitCommandError:
            # if the remote already exists
            self.repo.remotes.origin.set_url(self.remote_repo_link)

        self.origin = self.repo.remotes.origin

    def sync_data(self):
        with VerboseFunctionExec(
            f'Syncing data with remote repo {self.remote_repo_link}',
            verbose=True,
        ):
            # use subprocess because the gitpython command wasn't timing out correctly
            subprocess.run(
                ['git', 'fetch', self.origin.name],
                cwd=self.repo_path,
                timeout=30,
            )
            self.repo.git.reset('--hard', f'{self.origin.name}/{self.branch}')
