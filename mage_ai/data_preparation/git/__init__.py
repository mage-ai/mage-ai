from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.shared.secrets import get_secret_value
from mage_ai.data_preparation.sync import GitConfig
from mage_ai.orchestration.db.models.oauth import User
from urllib.parse import urlparse
from typing import List
import asyncio
import base64
import os
import subprocess

DEFAULT_SSH_KEY_DIRECTORY = os.path.expanduser('~/.ssh')
REMOTE_NAME = 'mage-repo'


class Git:
    def __init__(self, git_config: GitConfig):
        import git
        self.remote_repo_link = git_config.remote_repo_link
        self.repo_path = git_config.repo_path or os.getcwd()
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
    def get_manager(self, user: User = None):
        preferences = get_preferences(user=user)
        git_config = GitConfig.load(config=preferences.sync_config)
        return Git(git_config)

    @property
    def current_branch(self):
        return self.repo.git.branch('--show-current')

    @property
    def branches(self):
        return [head.name for head in self.repo.heads]

    async def check_connection(self):
        proc = self.repo.git.ls_remote(self.origin.name, as_process=True)
        ct = 0
        while ct < 20:
            return_code = proc.poll()
            if return_code is not None:
                proc.kill()
                break
            ct += 1
            await asyncio.sleep(0.5)

        if return_code is not None and return_code != 0:
            _, err = proc.communicate()
            message = (
                err.decode('UTF-8') if err
                else 'Error connecting to remote, make sure your SSH key is set up properly.'
            )
            raise Exception(message)

        if return_code is None:
            proc.kill()
            raise TimeoutError(
                "Connecting to remote timed out, make sure your SSH key is set up properly"
                " and your repository host is added as a known host. More information here:"
                " https://docs.mage.ai/developing-in-the-cloud/setting-up-git#5-add-github-com-to-known-hosts")  # noqa: E501

    def _remote_command(func):
        '''
        Decorator method for commands that need to connect to the remote repo. This decorator
        will configure and test SSH settings before executing the Git command.
        '''
        def wrapper(self, *args, **kwargs):
            if not os.path.exists(DEFAULT_SSH_KEY_DIRECTORY):
                os.mkdir(DEFAULT_SSH_KEY_DIRECTORY, 0o700)
            pubk_secret_name = self.git_config.ssh_public_key_secret_name
            if pubk_secret_name:
                public_key_file = os.path.join(
                    DEFAULT_SSH_KEY_DIRECTORY,
                    f'id_rsa_{pubk_secret_name}.pub'
                )
                if not os.path.exists(public_key_file):
                    try:
                        public_key = get_secret_value(
                            pubk_secret_name,
                            repo_name=get_repo_path(),
                        )
                        if public_key:
                            with open(public_key_file, 'w') as f:
                                f.write(base64.b64decode(public_key).decode('utf-8'))
                            os.chmod(public_key_file, 0o600)
                    except Exception:
                        pass
            pk_secret_name = self.git_config.ssh_private_key_secret_name
            private_key_file = os.path.join(DEFAULT_SSH_KEY_DIRECTORY, 'id_rsa')
            if pk_secret_name:
                private_key_file = os.path.join(
                    DEFAULT_SSH_KEY_DIRECTORY,
                    f'id_rsa_{pk_secret_name}'
                )
                if not os.path.exists(private_key_file):
                    try:
                        private_key = get_secret_value(
                            pk_secret_name,
                            repo_name=get_repo_path(),
                        )
                        if private_key:
                            with open(private_key_file, 'w') as f:
                                f.write(base64.b64decode(private_key).decode('utf-8'))
                            os.chmod(private_key_file, 0o600)
                    except Exception:
                        pass

            git_ssh_cmd = f'ssh -i {private_key_file}'
            with self.repo.git.custom_environment(GIT_SSH_COMMAND=git_ssh_cmd):
                try:
                    asyncio.run(self.check_connection())
                except TimeoutError as e:
                    url = f'ssh://{self.git_config.remote_repo_link}'
                    hostname = urlparse(url).hostname
                    if hostname:
                        cmd = f'ssh-keyscan -t rsa {hostname} >> ~/.ssh/known_hosts'  # noqa: E501
                        proc = subprocess.Popen(args=cmd, shell=True)
                        proc.wait()
                        asyncio.run(self.check_connection())
                    else:
                        raise e
                func(self, *args, **kwargs)

        return wrapper

    @_remote_command
    def reset(self, branch: str = None):
        self.origin.fetch()
        if branch is None:
            branch = self.current_branch
        self.repo.git.reset('--hard', f'{self.origin.name}/{branch}')

    @_remote_command
    def push(self):
        self.repo.git.push(
            '--set-upstream',
            self.origin.name,
            self.current_branch
        )

    @_remote_command
    def pull(self):
        self.origin.pull(self.current_branch)

    def status(self) -> str:
        return self.repo.git.status()

    def commit(self, message, files: List[str] = None):
        if self.repo.index.diff(None) or self.repo.untracked_files:
            if files:
                for file in files:
                    self.repo.git.add(file)
            else:
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
