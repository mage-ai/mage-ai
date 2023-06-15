import asyncio
import base64
import os
import shutil
import subprocess
import uuid
from datetime import datetime
from typing import Any, Dict, List
from urllib.parse import urlparse, urlsplit, urlunsplit

from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.shared.secrets import get_secret_value
from mage_ai.data_preparation.sync import AuthType, GitConfig
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.shared.logger import VerboseFunctionExec

DEFAULT_SSH_KEY_DIRECTORY = os.path.expanduser('~/.ssh')
DEFAULT_KNOWN_HOSTS_FILE = os.path.join(DEFAULT_SSH_KEY_DIRECTORY, 'known_hosts')
REMOTE_NAME = 'mage-repo'

# Git authentication variables
GIT_SSH_PUBLIC_KEY_VAR = 'GIT_SSH_PUBLIC_KEY'
GIT_SSH_PRIVATE_KEY_VAR = 'GIT_SSH_PRIVATE_KEY'
GIT_ACCESS_TOKEN_VAR = 'GIT_ACCESS_TOKEN'


class Git:
    def __init__(self, git_config: GitConfig = None) -> None:
        import git

        self.auth_type = AuthType.SSH
        self.git_config = git_config
        self.remote_repo_link = None
        self.repo_path = os.getcwd()

        if self.git_config:
            self.remote_repo_link = self.git_config.remote_repo_link

            if self.git_config.repo_path:
                self.repo_path = self.git_config.repo_path

            if self.git_config.auth_type:
                self.auth_type = self.git_config.auth_type

        os.makedirs(self.repo_path, exist_ok=True)

        if self.auth_type == AuthType.HTTPS:
            if self.remote_repo_link:
                url = urlsplit(self.remote_repo_link)

            if os.getenv(GIT_ACCESS_TOKEN_VAR):
                token = os.getenv(GIT_ACCESS_TOKEN_VAR)
            elif self.git_config and self.git_config.access_token_secret_name:
                token = get_secret_value(
                    self.git_config.access_token_secret_name,
                    repo_name=get_repo_path(),
                )

            if self.git_config:
                user = self.git_config.username
                url = url._replace(netloc=f'{user}:{token}@{url.netloc}')
                self.remote_repo_link = urlunsplit(url)

        try:
            self.repo = git.Repo(self.repo_path)
        except git.exc.InvalidGitRepositoryError:
            self.__setup_repo()

        if self.git_config:
            self.__set_git_config()

        if self.remote_repo_link:
            try:
                self.repo.create_remote(REMOTE_NAME, self.remote_repo_link)
            except git.exc.GitCommandError:
                # if the remote already exists
                pass

            # replace the existing remote url if it is different from the provided url
            self.origin = self.repo.remotes[REMOTE_NAME]
            if self.remote_repo_link not in self.origin.urls:
                self.origin.set_url(self.remote_repo_link)

    @classmethod
    def get_manager(self, user: User = None) -> 'Git':
        preferences = get_preferences(user=user)
        git_config = None
        if preferences and preferences.sync_config:
            git_config = GitConfig.load(config=preferences.sync_config)
        return Git(git_config)

    @property
    def current_branch(self) -> Any:
        return self.repo.git.branch('--show-current')

    @property
    def branches(self) -> List:
        return [branch.name for branch in self.repo.branches]

    def add_remote(self, name: str, ulr: str) -> None:
        self.repo.create_remote(name, url)

    def remove_remote(self, name: str) -> None:
        self.repo.remotes[name].remove(self.repo, name)

    def staged_files(self) -> List[str]:
        files_string = self.repo.git.diff('--name-only', '--cached')
        if files_string:
            return files_string.split('\n')
        return []

    def untracked_files(self, untracked_files: bool = False) -> List[str]:
        from git.compat import defenc

        # ---------- Taken from GitPython source code -----------
        proc = self.repo.git.status(
            as_process=True,
            porcelain=True,
            untracked_files=untracked_files,
        )
        # Untracked files prefix in porcelain mode
        prefix = '?? '
        untracked_files = []
        for line in proc.stdout:
            line = line.decode(defenc)
            if not line.startswith(prefix):
                continue
            filename = line[len(prefix):].rstrip('\n')
            # Special characters are escaped
            if filename[0] == filename[-1] == '"':
                filename = filename[1:-1]
                # WHATEVER ... it's a mess, but works for me
                filename = (
                    filename
                    .encode('ascii')
                    .decode('unicode_escape')
                    .encode('latin1')
                    .decode(defenc)
                )
            untracked_files.append(filename)
        proc.wait()
        # -------------------------------------------------------
        return untracked_files

    @property
    def modified_files(self) -> List[str]:
        return [item.a_path for item in self.repo.index.diff(None)]

    async def check_connection(self) -> None:
        proc = self.repo.git.ls_remote(self.origin.name, as_process=True)

        self.__poll_process_with_timeout(
            proc,
            error_message='Error connecting to remote, make sure your SSH key is set up properly.',
        )

    def _run_command(self, command: str) -> None:
        proc = subprocess.Popen(args=command, shell=True)
        proc.wait()

    def _remote_command(func) -> None:
        '''
        Decorator method for commands that need to connect to the remote repo. This decorator
        will configure and test SSH settings before executing the Git command.
        '''
        def wrapper(self, *args, **kwargs):
            def add_host_to_known_hosts():
                self.__add_host_to_known_hosts()
                asyncio.run(self.check_connection())

            if self.auth_type == AuthType.SSH:
                url = f'ssh://{self.git_config.remote_repo_link}'
                hostname = urlparse(url).hostname

                private_key_file = self.__create_ssh_keys()
                git_ssh_cmd = f'ssh -i {private_key_file}'
                with self.repo.git.custom_environment(GIT_SSH_COMMAND=git_ssh_cmd):
                    if not os.path.exists(DEFAULT_KNOWN_HOSTS_FILE):
                        self.__add_host_to_known_hosts()
                    try:
                        asyncio.run(self.check_connection())
                    except ChildProcessError as err:
                        if 'Host key verification failed' in str(err):
                            if hostname:
                                add_host_to_known_hosts()
                        else:
                            raise err
                    except TimeoutError:
                        if hostname:
                            add_host_to_known_hosts()
                        else:
                            raise TimeoutError(
                                "Connecting to remote timed out, make sure your SSH key is set up properly"  # noqa: E501
                                " and your repository host is added as a known host. More information here:"  # noqa: E501
                                " https://docs.mage.ai/developing-in-the-cloud/setting-up-git#5-add-github-com-to-known-hosts")  # noqa: E501
                    func(self, *args, **kwargs)
            else:
                asyncio.run(self.check_connection())
                func(self, *args, **kwargs)

        return wrapper

    @_remote_command
    def reset(self, branch: str = None) -> None:
        self.origin.fetch()
        if branch is None:
            branch = self.current_branch
        self.repo.git.reset('--hard', f'{self.origin.name}/{branch}')
        self.__pip_install()

    @_remote_command
    def push(self) -> None:
        self.repo.git.push(
            '--set-upstream',
            self.origin.name,
            self.current_branch
        )

    @_remote_command
    def pull(self) -> None:
        self.origin.pull(self.current_branch)
        self.__pip_install()

    def status(self) -> str:
        return self.repo.git.status()

    def add_file(self, filename: str, flags: List[str] = None) -> None:
        arr = flags or []
        self.repo.git.add(filename, *arr)

    def checkout_file(self, filename: str) -> None:
        self.repo.git.checkout(filename)

    def diff_file(self, filename: str) -> str:
        return self.repo.git.diff(filename)

    def logs(self, commits: int = 40) -> List[Dict]:
        arr = []

        for idx, commit in enumerate(self.repo.iter_commits()):
            if idx >= commits:
                break

            arr.append(dict(
                author=dict(
                    email=commit.author.email,
                    name=commit.author.name,
                ),
                date=datetime.fromtimestamp(commit.authored_date).isoformat(),
                message=commit.message,
            ))

        return arr

    def remotes(self, limit: int = 40) -> List[Dict]:
        arr = []

        for idx, remote in enumerate(self.repo.remotes):
            if idx >= limit:
                break

            refs = []
            for ref in remote.refs:
                refs.append(dict(
                    name=ref.name,
                    commit=dict(
                        author=dict(
                            email=ref.commit.author.email,
                            name=ref.commit.author.name,
                        ),
                        date=datetime.fromtimestamp(ref.commit.authored_date).isoformat(),
                        message=ref.commit.message,
                    ),
                ))

            arr.append(dict(
                name=remote.name,
                refs=refs,
                urls=[url for url in remote.urls],
            ))

        return arr

    def reset_file(self, filename: str) -> None:
        self.repo.git.reset(filename)

    def show_file_from_branch(self, branch: str, filename: str) -> str:
        return self.repo.git.show(f'{branch}:{filename}')

    def commit(self, message, files: List[str] = None) -> None:
        if self.repo.index.diff(None) or self.repo.untracked_files:
            if files:
                for file in files:
                    self.repo.git.add(file)
            else:
                self.repo.git.add('.')
            self.repo.index.commit(message)

    def commit_message(self, message: str) -> None:
        self.repo.index.commit(message)

    def switch_branch(self, branch) -> None:
        if branch in self.repo.heads:
            self.repo.git.switch(branch)
        else:
            self.repo.git.switch('-c', branch)

    @_remote_command
    def clone(self):
        from git import Repo
        tmp_path = f'{self.repo_path}_{str(uuid.uuid4())}'
        os.mkdir(tmp_path)
        try:
            # Clone remote repo to a tmp folder, and copy over the contents
            # of the tmp folder to the local repo.
            env = {}
            if self.auth_type == AuthType.SSH:
                private_key_file = self.__create_ssh_keys()
                env = {'GIT_SSH_COMMAND': f'ssh -i {private_key_file}'}
            Repo.clone_from(
                self.remote_repo_link,
                to_path=tmp_path,
                origin=REMOTE_NAME,
                env=env,
            )

            shutil.rmtree(os.path.join(self.repo_path, '.git'))
            shutil.copytree(
                tmp_path,
                self.repo_path,
                dirs_exist_ok=True,
                ignore=lambda x, y: ['.preferences.yaml']
            )
            self.repo.git.clean('-fd', exclude='.preferences.yaml')
            self.__pip_install()
        finally:
            shutil.rmtree(tmp_path)

    def __set_git_config(self):
        if self.git_config.username:
            self.repo.config_writer().set_value(
                'user', 'name', self.git_config.username).release()
        if self.git_config.email:
            self.repo.config_writer().set_value(
                'user', 'email', self.git_config.email).release()
        self.repo.config_writer('global').set_value(
            'safe', 'directory', self.repo_path).release()

    def __pip_install(self) -> None:
        requirements_file = os.path.join(
            self.repo.working_dir, 'requirements.txt')

        with VerboseFunctionExec(
            f'Running "pip3 install -r {requirements_file}"',
            verbose=True,
        ):
            try:
                if os.path.exists(requirements_file):
                    cmd = f'pip3 install -r {requirements_file}'
                    self._run_command(cmd)
                print(f'Installing {requirements_file} completed successfully.')
            except Exception as err:
                print(f'Skip installing {requirements_file} due to error: {err}')
                pass

    def __create_ssh_keys(self) -> str:
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
                    if os.getenv(GIT_SSH_PUBLIC_KEY_VAR):
                        public_key = os.getenv(GIT_SSH_PUBLIC_KEY_VAR)
                    if public_key:
                        with open(public_key_file, 'w') as f:
                            f.write(base64.b64decode(public_key).decode('utf-8'))
                        os.chmod(public_key_file, 0o600)
                except Exception:
                    pass
        pk_secret_name = self.git_config.ssh_private_key_secret_name
        private_key_file = os.path.join(DEFAULT_SSH_KEY_DIRECTORY, 'id_rsa')
        if pk_secret_name:
            custom_private_key_file = os.path.join(
                DEFAULT_SSH_KEY_DIRECTORY,
                f'id_rsa_{pk_secret_name}'
            )
            if not os.path.exists(custom_private_key_file):
                try:
                    private_key = get_secret_value(
                        pk_secret_name,
                        repo_name=get_repo_path(),
                    )
                    if os.getenv(GIT_SSH_PRIVATE_KEY_VAR):
                        private_key = os.getenv(GIT_SSH_PRIVATE_KEY_VAR)
                    if private_key:
                        with open(custom_private_key_file, 'w') as f:
                            f.write(base64.b64decode(private_key).decode('utf-8'))
                        os.chmod(custom_private_key_file, 0o600)
                        private_key_file = custom_private_key_file
                except Exception:
                    pass
            else:
                private_key_file = custom_private_key_file

        return private_key_file

    def __setup_repo(self):
        import git
        tmp_path = f'{self.repo_path}_{str(uuid.uuid4())}'
        os.mkdir(tmp_path)
        try:
            # Clone the remote repo and copy over the .git folder
            # to initialize the local repository.
            env = {}
            if self.auth_type == AuthType.SSH:
                private_key_file = self.__create_ssh_keys()
                env = {'GIT_SSH_COMMAND': f'ssh -i {private_key_file}'}
                if not self.__add_host_to_known_hosts():
                    raise Exception('Could not add host to known_hosts')
            repo_git = git.cmd.Git(self.repo_path)
            repo_git.update_environment(**env)
            proc = repo_git.clone(
                self.remote_repo_link,
                tmp_path,
                origin=REMOTE_NAME,
                as_process=True,
            )

            asyncio.run(
                self.__poll_process_with_timeout(
                    proc,
                    error_message='Error cloning repo.',
                    timeout=20,
                )
            )

            git_folder = os.path.join(self.repo_path, '.git')
            tmp_git_folder = os.path.join(tmp_path, '.git')
            shutil.move(tmp_git_folder, git_folder)
            self.repo = git.Repo(path=self.repo_path)
        except Exception:
            self.repo = git.Repo.init(self.repo_path)
            # need to commit something to initialize the repository
            self.commit('Initial commit')
        finally:
            shutil.rmtree(tmp_path)

    def __add_host_to_known_hosts(self):
        url = f'ssh://{self.git_config.remote_repo_link}'
        hostname = urlparse(url).hostname
        if hostname:
            cmd = f'ssh-keyscan -t rsa {hostname} >> {DEFAULT_KNOWN_HOSTS_FILE}'
            self._run_command(cmd)
            return True
        return False

    async def __poll_process_with_timeout(
        self,
        proc: subprocess.Popen,
        error_message: str = None,
        timeout: int = 10,
    ):
        ct = 0
        while ct < timeout * 2:
            return_code = proc.poll()
            if return_code is not None:
                proc.kill()
                break
            ct += 1
            await asyncio.sleep(0.5)

        if error_message is None:
            error_message = 'Error running Git process'

        if return_code is not None and return_code != 0:
            _, err = proc.communicate()
            message = (
                err.decode('UTF-8') if err
                else error_message
            )
            raise ChildProcessError(message)

        if return_code is None:
            proc.kill()
            raise TimeoutError
