import asyncio
import base64
import os
import shutil
import subprocess
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List
from urllib.parse import urlparse, urlsplit, urlunsplit

from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.shared.secrets import get_secret_value
from mage_ai.data_preparation.sync import AuthType, GitConfig
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.logger import VerboseFunctionExec

DEFAULT_SSH_KEY_DIRECTORY = os.path.expanduser(os.path.join('~', '.ssh'))
DEFAULT_KNOWN_HOSTS_FILE = os.path.join(DEFAULT_SSH_KEY_DIRECTORY, 'known_hosts')
REMOTE_NAME = 'mage-repo'

# Git authentication variables
GIT_SSH_PUBLIC_KEY_VAR = 'GIT_SSH_PUBLIC_KEY'
GIT_SSH_PRIVATE_KEY_VAR = 'GIT_SSH_PRIVATE_KEY'
GIT_ACCESS_TOKEN_VAR = 'GIT_ACCESS_TOKEN'


class Git:
    def __init__(
        self,
        auth_type: AuthType = None,
        git_config: GitConfig = None,
        setup_repo: bool = True,
    ) -> None:
        import git
        import git.exc

        self.auth_type = auth_type if auth_type else AuthType.SSH
        self.git_config = git_config
        self.origin = None
        self.remote_repo_link = None
        self.repo = None
        self.repo_path = os.getcwd()

        if self.git_config:
            self.remote_repo_link = self.git_config.remote_repo_link

            if self.git_config.repo_path:
                self.repo_path = self.git_config.repo_path

            if self.git_config.auth_type:
                self.auth_type = self.git_config.auth_type

        os.makedirs(self.repo_path, exist_ok=True)

        if self.auth_type == AuthType.HTTPS:
            url = None
            if self.remote_repo_link:
                url = urlsplit(self.remote_repo_link)

            token = self.get_access_token()

            if self.git_config and url:
                user = self.git_config.username
                url = url._replace(netloc=f'{user}:{token}@{url.netloc}')
                self.remote_repo_link = urlunsplit(url)

        try:
            self.repo = git.Repo(self.repo_path)
        except git.exc.InvalidGitRepositoryError:
            if setup_repo:
                self.__setup_repo()

        if self.repo and self.git_config:
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
    def get_manager(
        self,
        user: User = None,
        setup_repo: bool = True,
        auth_type: str = None,
    ) -> 'Git':
        preferences = get_preferences(user=user)
        git_config = None
        if preferences and preferences.sync_config:
            git_config = GitConfig.load(config=preferences.sync_config)
        return Git(
            auth_type=auth_type,
            git_config=git_config,
            setup_repo=setup_repo,
        )

    @property
    def current_branch(self) -> Any:
        if not self.repo:
            return None

        return self.repo.git.branch('--show-current')

    @property
    def branches(self) -> List:
        if not self.repo:
            return []

        return [branch.name for branch in self.repo.branches]

    def add_remote(self, name: str, url: str) -> None:
        self.repo.create_remote(name, url)

    def remove_remote(self, name: str) -> None:
        self.repo.git.remote('remove', name)

    async def staged_files(self) -> List[str]:
        if self.repo:
            proc = self.repo.git.diff(
                '--name-only',
                '--cached',
                as_process=True,
            )
            try:
                stdout = await self.__poll_process_with_timeout(
                    proc,
                    error_message='Error fetching untracked files',
                    timeout=10,
                )
                if stdout:
                    return stdout.strip().split('\n')
            except TimeoutError:
                pass
        return []

    async def untracked_files(self, untracked_files: bool = False) -> List[str]:
        if not self.repo:
            return []

        from git.compat import defenc

        # ---------- Modified from GitPython source code -----------
        proc = self.repo.git.status(
            as_process=True,
            porcelain=True,
            untracked_files=untracked_files,
        )
        try:
            stdout = await self.__poll_process_with_timeout(
                proc,
                error_message='Error fetching untracked files',
                timeout=10,
            )
        except TimeoutError:
            lock_file = os.path.join(self.repo_path, '.git', 'index.lock')
            if os.path.exists(lock_file):
                os.remove(lock_file)
            return []
        # Untracked files prefix in porcelain mode
        prefix = '?? '
        files = []
        if stdout:
            for line in stdout.split('\n'):
                # line = line.decode(defenc)
                if not line.startswith(prefix):
                    continue
                filename = line[len(prefix):].rstrip('\n')
                # Special characters are escaped
                if filename[0] == filename[-1] == '"':
                    filename = filename[1:-1]
                    filename = (
                        filename
                        .encode('ascii')
                        .decode('unicode_escape')
                        .encode('latin1')
                        .decode(defenc)
                    )
                files.append(filename)
            # -------------------------------------------------------
            return files

    @property
    def modified_files(self) -> List[str]:
        if not self.repo:
            return []

        return [item.a_path for item in self.repo.index.diff(None)]

    async def check_connection(self) -> None:
        proc = self.repo.git.ls_remote(self.origin.name, as_process=True)

        await self.__poll_process_with_timeout(
            proc,
            error_message='Error connecting to remote, make sure your access token or SSH key is ' +
            'set up properly.',
        )

    def _run_command(self, command: str) -> None:
        proc = subprocess.Popen(args=command, shell=True)
        proc.wait()

    def _remote_command(func: Callable) -> None:
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
                    return func(self, *args, **kwargs)
            else:
                asyncio.run(self.check_connection())
                return func(self, *args, **kwargs)

        return wrapper

    @_remote_command
    def submodules_update(self, repo_path: str = None) -> None:
        self.__submodules_update(repo_path=repo_path)

    def __submodules_update(self, repo_path: str = None) -> None:
        """
        Attempt to update submodules for the specified repo path. Only the top-level
        submodules will be updated at the moment.

        Args:
            repo_path (str, optional): The path to the repo. If not provided, self.repo will be
                used.
        """
        import git
        from git.config import GitConfigParser
        if repo_path:
            repo = git.Repo(repo_path)
        else:
            repo = self.repo
            repo_path = self.repo_path

        parser = GitConfigParser(
            os.path.join(repo_path, '.gitmodules'),
            read_only=True,
        )
        sections = parser.sections()
        for section in sections:
            path = parser.get(section, 'path', fallback=None)
            submodule_url = parser.get(section, 'url', fallback=None)
            parser.release()
            if path and submodule_url:
                submodule_full_path = os.path.join(repo_path, path)
                tmp_full_path = f'{submodule_full_path}-{str(uuid.uuid4())}'
                try:
                    print(f'Updating {section}...')
                    # Create a temporary directory to store the current contents of the submodule
                    # directory because the `git submodule update` command will fail if the
                    # submodule directory already exists and is not empty.
                    if os.path.exists(submodule_full_path) and next(
                        os.scandir(submodule_full_path), None
                    ):
                        shutil.move(
                            submodule_full_path,
                            tmp_full_path,
                        )
                    url = urlsplit(submodule_url)
                    if self.auth_type == AuthType.HTTPS:
                        user = self.git_config.username
                        token = self.get_access_token()
                        url = url._replace(netloc=f'{user}:{token}@{url.netloc}')
                        url = urlunsplit(url)
                        # Overwrite the submodule URL with git credentials.
                        repo.config_writer().set_value(
                            f'submodule.{path}', 'url', url).release()

                    subprocess.run(
                        [
                            'git',
                            'submodule',
                            'update',
                            '--init',
                            path,
                        ],
                        check=True,
                        cwd=repo_path,
                        timeout=20,
                    )
                except Exception:
                    if os.path.exists(tmp_full_path):
                        shutil.move(
                            tmp_full_path,
                            submodule_full_path,
                        )
                else:
                    print(f'{section} updated!')
                finally:
                    if os.path.exists(tmp_full_path):
                        shutil.rmtree(tmp_full_path)
                    repo_config_writer = repo.config_writer()
                    repo_config_writer.remove_section(f'submodule.{path}')
                    repo_config_writer.release()

    @_remote_command
    def reset_hard(self, branch: str = None, remote_name: str = None) -> None:
        if branch is None:
            branch = self.current_branch
        if remote_name is None:
            remote = self.origin
        else:
            remote = self.repo.remotes[remote_name]
        remote.fetch()
        self.repo.git.reset('--hard', f'{remote.name}/{branch}')
        self.__pip_install()

    @_remote_command
    def push(self) -> None:
        self.repo.git.push(
            '--set-upstream',
            self.origin.name,
            self.current_branch,
        )

    @_remote_command
    def pull(self) -> None:
        self.origin.pull(self.current_branch)
        self.__pip_install()

    @_remote_command
    def pull_remote_branch(self, remote_name: str, branch_name: str = None):
        import git

        custom_progress = git.remote.RemoteProgress()

        self.set_origin(remote_name)
        remote = self.repo.remotes[remote_name]
        if branch_name and len(branch_name) >= 1:
            try:
                remote.pull(branch_name, custom_progress)
            except git.exc.GitCommandError as err:
                raise err
        else:
            # The following error will occur when no branch name is passed in as the argument.
            # Not sure why, but the pull command still completes.
            # git.exc.GitCommandError: Cmd('git') failed due to: exit code(1)
            # cmdline: git pull -v -- test2
            try:
                remote.pull(progress=custom_progress)
            except git.exc.GitCommandError:
                pass

        return custom_progress

    @_remote_command
    def push_remote_branch(self, remote_name: str, branch_name: str) -> None:
        import git

        custom_progress = git.remote.RemoteProgress()

        self.set_origin(remote_name)
        remote = self.repo.remotes[remote_name]

        remote.push(branch_name, custom_progress)

        return custom_progress

    def set_origin(self, remote_name: str) -> None:
        self.origin = self.repo.remotes[remote_name]

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

    def delete_branch(self, base_branch_name: str) -> None:
        self.repo.branches[base_branch_name].delete(self.repo, base_branch_name, '-D')

    def merge_branch(self, base_branch_name: str, message: str = None) -> None:
        self.repo.git.merge(self.repo.branches[base_branch_name])
        if message:
            self.repo.index.commit(message)

    def rebase_branch(self, base_branch_name: str, message: str = None) -> None:
        self.repo.git.rebase(self.repo.branches[base_branch_name])
        if message:
            self.repo.index.commit(message)

    def remotes(self, limit: int = 40, user: User = None) -> List[Dict]:
        arr = []

        if not self.repo:
            return arr

        for idx, remote in enumerate(self.repo.remotes):
            from git.exc import GitCommandError

            if idx >= limit:
                break

            error = None
            remote_url = None
            remote_exists = False
            try:
                remote_url = [url for url in remote.urls][0]
                remote_exists = True
            except GitCommandError as err:
                print('WARNING (mage_ai.data_preparation.git.remotes):')
                print(err)

            try:
                remote_refs = remote.refs
                if len(remote_refs) == 0 and user:
                    from mage_ai.data_preparation.git import api

                    access_token = api.get_access_token_for_user(user)
                    if access_token:

                        if remote_exists:
                            token = access_token.token
                            username = api.get_username(token)
                            url = api.build_authenticated_remote_url(
                                remote_url,
                                username,
                                token,
                            )

                            remote.set_url(url)

                            authenticated = False
                            try:
                                api.check_connection(self.repo, url)
                                authenticated = True
                            except Exception as err:
                                print('WARNING (mage_ai.data_preparation.git.remotes):')
                                print(err)

                            if authenticated:
                                try:
                                    remote.fetch()
                                    remote_refs = remote.refs
                                except Exception as err:
                                    print('WARNING (mage_ai.data_preparation.git.remotes):')
                                    print(err)

                refs = []
                for ref in remote_refs:
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
            except Exception as err:
                error = err

            try:
                remote.set_url(remote_url)
            except GitCommandError as err:
                print('WARNING (mage_ai.data_preparation.git.remotes):')
                print(err)

            if error:
                raise error

            repository_names = []
            urls = []
            try:
                for url in remote.urls:
                    if url.lower().startswith('https'):
                        repository_names.append('/'.join(url.split('/')[-2:]).replace('.git', ''))

                        # Remove the token from the URL
                        # e.g. https://[user]:[token]@[netloc]
                        parts = url.split('@')

                        parts_arr = []
                        if len(parts) >= 2:
                            # https://[user]:[token]
                            parts2 = parts[0].split(':')
                            # ['https', '', 'user', 'token']
                            parts2[len(parts2) - 1] = '[token]'
                            parts_arr.append(':'.join(parts2))
                            parts_arr += parts[1:]
                        else:
                            parts_arr += parts

                        url = '@'.join(parts_arr)

                    urls.append(url)
            except GitCommandError as err:
                print('WARNING (mage_ai.data_preparation.git.remotes):')
                print(err)

            arr.append(dict(
                name=remote.name,
                refs=refs,
                repository_names=repository_names,
                urls=urls,
            ))

        return arr

    def reset_file(self, filename: str) -> None:
        self.repo.git.reset(filename)

    def show_file_from_branch(self, branch: str, filename: str) -> str:
        return self.repo.git.show(f'{branch}:{filename}')

    def commit(self, message, files: List[str] = None) -> None:
        if files:
            for file in files:
                self.repo.git.add(file)
        self.repo.index.commit(message)

    def commit_message(self, message: str) -> None:
        self.repo.index.commit(message)

    def switch_branch(self, branch) -> None:
        if branch in self.repo.heads:
            self.repo.git.switch(branch)
        else:
            self.repo.git.switch('-c', branch)

    @_remote_command
    def clone(self, sync_submodules: bool = False) -> None:
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

            if sync_submodules:
                self.__submodules_update(repo_path=tmp_path)

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
            'safe', 'directory', Path(self.repo_path).as_posix()).release()

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
                print(f'Skip installing {requirements_file} due to error: {str(err)}')
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
        import git.cmd
        tmp_path = f'{self.repo_path}_{str(uuid.uuid4())}'
        os.mkdir(tmp_path)
        repo_git = git.cmd.Git(self.repo_path)
        try:
            # Clone the remote repo and copy over the .git folder
            # to initialize the local repository.
            env = {}
            if self.auth_type == AuthType.SSH:
                private_key_file = self.__create_ssh_keys()
                env = {'GIT_SSH_COMMAND': f'ssh -i {private_key_file}'}
                if not self.__add_host_to_known_hosts():
                    raise Exception('Could not add host to known_hosts')
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
    ) -> str:
        ct = 0
        return_code = None
        while ct < timeout * 2:
            return_code = proc.poll()
            if return_code is not None:
                proc.kill()
                break
            ct += 1
            await asyncio.sleep(0.5)

        if error_message is None:
            error_message = 'Error running Git process'

        if return_code is not None:
            out, err = proc.communicate()
            if return_code != 0:
                message = (
                    err.decode('UTF-8') if err
                    else error_message
                )
                raise ChildProcessError(message)
            else:
                return out.decode('UTF-8') if out else None

        if return_code is None:
            proc.kill()
            raise TimeoutError

    def get_access_token(self) -> str:
        token = None
        if os.getenv(GIT_ACCESS_TOKEN_VAR):
            token = os.getenv(GIT_ACCESS_TOKEN_VAR)
        elif self.git_config and self.git_config.access_token_secret_name:
            token = get_secret_value(
                self.git_config.access_token_secret_name,
                repo_name=get_repo_path(),
            )

        return token
