from dataclasses import dataclass
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.shared.config import BaseConfig
from typing import List
import git
import os


@dataclass
class GitConfig(BaseConfig):
    remote_repo_link: str
    repo_path: str = os.getcwd()


class Git:
    def __init__(self, git_config: GitConfig):
        self.remote_repo_link = git_config.remote_repo_link
        self.repo_path = git_config.repo_path
        self.git_config = git_config
        try:
            self.repo = git.Repo(self.repo_path)
        except git.exc.InvalidGitRepositoryError:
            self.repo = git.Repo.init(self.repo_path)
            self.repo.create_remote('origin', self.remote_repo_link)

        self.origin = self.repo.remotes.origin

    @classmethod
    def get_manager(self):
        preferences = get_preferences()
        git_config = GitConfig.load(config=preferences.git_config)
        return Git(git_config)

    @property
    def current_branch(self):
        return self.repo.git.branch('--show-current')
    
    def all_branches(self):
        return [head.name for head in self.repo.heads]

    def reset(self):
        self.origin.fetch(kill_after_timeout=60)
        self.repo.git.reset('--hard', f'origin/{self.current_branch}')

    def push(self):
        self.repo.git.push('--set-upstream', self.origin.name, self.current_branch)

    def pull(self):
        self.origin.pull(self.current_branch)

    def commit(self, message):
        if self.repo.index.diff(None) or self.repo.untracked_files:
            self.repo.git.add('.')
            self.repo.index.commit(message)

    def change_branch(self, branch):
        if self.current_branch == branch:
            pass
        elif branch in self.repo.heads:
            current = self.repo.heads[branch]
            current.checkout()
        else:
            current = self.repo.create_head(branch)
            current.checkout()
