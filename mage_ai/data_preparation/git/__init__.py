from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.sync import GitConfig
import asyncio
import git
import subprocess

REMOTE_NAME = 'mage-repo'


class Git:
    def __init__(self, git_config: GitConfig):
        self.remote_repo_link = git_config.remote_repo_link
        self.repo_path = git_config.repo_path
        self.git_config = git_config
        try:
            self.repo = git.Repo(self.repo_path)
        except git.exc.InvalidGitRepositoryError:
            self.repo = git.Repo.init(self.repo_path)
            # need to commit something to initialize the repository
            self.commit('Initial commit')

        try:
            self.repo.create_remote(REMOTE_NAME, self.remote_repo_link)
        except git.exc.GitCommandError:
            # if the remote already exists
            pass

        self.origin = self.repo.remotes[REMOTE_NAME]
        if self.remote_repo_link not in self.origin.urls:
            self.origin.set_url(self.remote_repo_link)

    @classmethod
    def get_manager(self):
        preferences = get_preferences()
        git_config = GitConfig.load(config=preferences.sync_config)
        return Git(git_config)

    @property
    def current_branch(self):
        return self.repo.git.branch('--show-current')

    async def check_connection(self):
        proc = subprocess.Popen(
            ['git', 'ls-remote', self.origin.name],
            cwd=self.repo_path,
        )
        ct = 0
        while ct < 20:
            return_code = proc.poll()
            if return_code is not None:
                proc.kill()
                break
            ct += 1
            await asyncio.sleep(0.5)

        if return_code is not None and return_code != 0:
            raise Exception(
                "Error connecting to remote, make sure your SSH key is set up properly.")

        if return_code is None:
            proc.kill()
            raise Exception(
                "Connecting to remote timed out, make sure your SSH key is set up properly"
                " and your repository host is added as a known host. More information here:"
                " https://docs.mage.ai/developing-in-the-cloud/setting-up-git#5-add-github-com-to-known-hosts")  # noqa: E501

    def all_branches(self):
        return [head.name for head in self.repo.heads]

    def reset(self, branch: str = None):
        self.origin.fetch()
        if branch is None:
            branch = self.current_branch
        self.repo.git.reset('--hard', f'{self.origin.name}/{branch}')

    def push(self):
        self.repo.git.push(
            '--set-upstream',
            self.origin.name,
            self.current_branch
        )

    def pull(self):
        self.origin.pull(self.current_branch)

    def status(self) -> str:
        return self.repo.git.status()

    def commit(self, message):
        if self.repo.index.diff(None) or self.repo.untracked_files:
            self.repo.git.add('.')
            self.repo.index.commit(message)

    def change_branch(self, branch):
        if branch in self.repo.heads:
            current = self.repo.heads[branch]
            current.checkout()
        else:
            current = self.repo.create_head(branch)
            current.checkout()
