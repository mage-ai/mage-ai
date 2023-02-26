from mage_ai.data_preparation.sync.base_sync import BaseSync
import git
import os


class GitSync(BaseSync):
    def __init__(
        self,
        remote_repo_link: str,
        repo_path: str = os.getcwd(),
        branch: str = 'master',
    ):
        self.remote_repo_link = remote_repo_link
        self.repo_path = repo_path
        self.branch = branch
        try:
            self.repo = git.Repo(repo_path)
        except git.exc.InvalidGitRepositoryError:
            self.repo = git.Repo.init(repo_path)
            self.repo.create_remote('origin', remote_repo_link)

        self.origin = self.repo.remotes.origin

    def sync_data(self):
        self.origin.fetch(kill_after_timeout=60)
        self.repo.git.reset('--hard', f'origin/{self.branch}')
