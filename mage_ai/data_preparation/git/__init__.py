from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.shared.secrets import get_secret_value
from mage_ai.data_preparation.sync import GitConfig
import asyncio
import base64
import git
import os
import subprocess

DEFAULT_SSH_KEY_DIRECTORY = os.path.expanduser('~/.ssh')
REMOTE_NAME = 'mage-repo'
GIT_SSH_PUBLIC_KEY_SECRET_NAME = 'mage_git_ssh_public_key_b64'
GIT_SSH_PRIVATE_KEY_SECRET_NAME = 'mage_git_ssh_private_key_b64'


class Git:
    def __init__(self, git_config: GitConfig):
        self.remote_repo_link = git_config.remote_repo_link
        self.repo_path = git_config.repo_path
        os.makedirs(self.repo_path, exist_ok=True)
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

        self.__set_git_config()

    @classmethod
    def get_manager(self):
        preferences = get_preferences()
        git_config = GitConfig.load(config=preferences.sync_config)
        return Git(git_config)

    @property
    def current_branch(self):
        return self.repo.git.branch('--show-current')

    async def check_connection(self):
        self.__setup_ssh_config()
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

    def __set_git_config(self):
        if self.git_config.username:
            self.repo.config_writer().set_value(
                'user', 'name', self.git_config.username).release()
        if self.git_config.email:
            self.repo.config_writer().set_value(
                'user', 'email', self.git_config.email).release()

    def __setup_ssh_config(self):
        if not os.path.exists(DEFAULT_SSH_KEY_DIRECTORY):
            os.mkdir(DEFAULT_SSH_KEY_DIRECTORY, 0o700)
        public_key_file = os.path.join(DEFAULT_SSH_KEY_DIRECTORY, 'id_rsa.pub')
        private_key_file = os.path.join(DEFAULT_SSH_KEY_DIRECTORY, 'id_rsa')
        if not os.path.exists(public_key_file) and \
                not os.path.exists(private_key_file):
            public_key = get_secret_value(GIT_SSH_PUBLIC_KEY_SECRET_NAME)
            if public_key:
                with open(public_key_file, 'w') as f:
                    f.write(base64.b64decode(public_key).decode('utf-8'))
                os.chmod(public_key_file, 0o644)

            private_key = get_secret_value(GIT_SSH_PRIVATE_KEY_SECRET_NAME)
            if private_key:
                with open(private_key_file, 'w') as f:
                    f.write(base64.b64decode(private_key).decode('utf-8'))
                os.chmod(private_key_file, 0o600)

        cmd = 'ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts'  # noqa: E501
        proc = subprocess.Popen(args=cmd, shell=True)
        proc.wait()
