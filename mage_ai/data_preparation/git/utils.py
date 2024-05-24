import asyncio
import base64
import os
import subprocess
from typing import Callable
from urllib.parse import urlparse, urlsplit, urlunsplit

from mage_ai.authentication.oauth.constants import ProviderName, get_ghe_hostname
from mage_ai.authentication.oauth.utils import access_tokens_for_client
from mage_ai.data_preparation.git.constants import (
    DEFAULT_KNOWN_HOSTS_FILE,
    DEFAULT_SSH_KEY_DIRECTORY,
)
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.data_preparation.shared.secrets import get_secret_value
from mage_ai.data_preparation.sync import AuthType, GitConfig
from mage_ai.orchestration.db.models.oauth import Oauth2AccessToken, User
from mage_ai.settings import get_bool_value, get_settings_value
from mage_ai.settings.keys import (
    BITBUCKET_HOST,
    GIT_ACCESS_TOKEN,
    GIT_OVERWRITE_WITH_PROJECT_SETTINGS,
    GIT_SSH_PRIVATE_KEY,
    GIT_SSH_PUBLIC_KEY,
    GITLAB_HOST,
)


def get_auth_type_from_url(remote_url: str) -> AuthType:
    if 'http://' in remote_url or 'https://' in remote_url:
        return AuthType.HTTPS
    elif 'ssh://' in remote_url:
        return AuthType.SSH
    else:
        return AuthType.OAUTH


def get_provider_from_remote_url(remote_url: str) -> str:
    ghe_hostname = get_ghe_hostname()

    if not remote_url:
        return ProviderName.GITHUB

    bitbucket_host = get_settings_value(BITBUCKET_HOST)
    gitlab_host = get_settings_value(GITLAB_HOST)
    if bitbucket_host and bitbucket_host in remote_url or 'bitbucket.org' in remote_url:
        return ProviderName.BITBUCKET
    elif gitlab_host and gitlab_host in remote_url or 'gitlab.com' in remote_url:
        return ProviderName.GITLAB
    elif 'dev.azure.com' in remote_url:
        return ProviderName.AZURE_DEVOPS
    elif ghe_hostname and ghe_hostname in remote_url:
        return ProviderName.GHE
    else:
        return ProviderName.GITHUB


def create_ssh_keys(
    git_config: GitConfig, repo_path: str, overwrite: bool = False
) -> str:
    if not os.path.exists(DEFAULT_SSH_KEY_DIRECTORY):
        os.mkdir(DEFAULT_SSH_KEY_DIRECTORY, 0o700)
    pubk_secret_name = git_config.ssh_public_key_secret_name
    overwrite_with_project_settings = get_bool_value(
        get_settings_value(GIT_OVERWRITE_WITH_PROJECT_SETTINGS)
    )
    if pubk_secret_name:
        public_key_file = os.path.join(
            DEFAULT_SSH_KEY_DIRECTORY, f'id_rsa_{pubk_secret_name}.pub'
        )
        if not os.path.exists(public_key_file) or overwrite:
            try:
                public_key = get_settings_value(GIT_SSH_PUBLIC_KEY)
                public_key_from_secrets = get_secret_value(
                    pubk_secret_name,
                    repo_name=repo_path,
                    suppress_warning=True,
                )
                if public_key_from_secrets and (
                    not public_key or overwrite_with_project_settings
                ):
                    public_key = public_key_from_secrets
                if public_key:
                    with open(public_key_file, 'w') as f:
                        f.write(base64.b64decode(public_key).decode('utf-8'))
                    os.chmod(public_key_file, 0o600)
            except Exception:
                pass
    pk_secret_name = git_config.ssh_private_key_secret_name
    private_key_file = os.path.join(DEFAULT_SSH_KEY_DIRECTORY, 'id_rsa')
    if pk_secret_name:
        custom_private_key_file = os.path.join(
            DEFAULT_SSH_KEY_DIRECTORY, f'id_rsa_{pk_secret_name}'
        )
        if not os.path.exists(custom_private_key_file) or overwrite:
            try:
                private_key = get_settings_value(GIT_SSH_PRIVATE_KEY)
                private_key_from_secrets = get_secret_value(
                    pk_secret_name,
                    repo_name=repo_path,
                    suppress_warning=True,
                )
                if private_key_from_secrets and (
                    not private_key or overwrite_with_project_settings
                ):
                    private_key = private_key_from_secrets
                if private_key:
                    with open(custom_private_key_file, 'w') as f:
                        f.write(base64.b64decode(private_key).decode('utf-8'))
                    os.chmod(custom_private_key_file, 0o600)
                    private_key_file = custom_private_key_file
            except Exception:
                pass
        else:
            private_key_file = custom_private_key_file

    url = git_config.remote_repo_link
    if url:
        if not url.startswith('ssh://'):
            url = f'ssh://{url}'
        hostname = urlparse(url).hostname

        # Codecommit requires additional configuration for SSH connection
        config_file = os.path.join(DEFAULT_SSH_KEY_DIRECTORY, 'config')
        if hostname and hostname.startswith('git-codecommit'):
            if not os.path.exists(config_file) or overwrite:
                config = f'''Host {hostname}
User {git_config.username}
IdentityFile {private_key_file}
                '''
                with open(os.path.join(DEFAULT_SSH_KEY_DIRECTORY, 'config'), 'w') as f:
                    f.write(config)

    return private_key_file


def run_command(command: str) -> None:
    proc = subprocess.Popen(args=command, shell=True)
    proc.wait()


def add_host_to_known_hosts(remote_repo_link: str):
    url = remote_repo_link
    if url and not url.startswith('ssh://'):
        url = f'ssh://{url}'

    hostname = urlparse(url).hostname
    if hostname:
        cmd = f'ssh-keyscan -t rsa {hostname} >> {DEFAULT_KNOWN_HOSTS_FILE}'
        run_command(cmd)
        return True
    return False


def get_access_token(git_config, repo_path: str) -> str:
    token = get_settings_value(GIT_ACCESS_TOKEN)
    overwrite_with_project_settings = get_bool_value(
        get_settings_value(GIT_OVERWRITE_WITH_PROJECT_SETTINGS)
    )
    if git_config and git_config.access_token_secret_name:
        token_from_secrets = get_secret_value(
            git_config.access_token_secret_name,
            repo_name=repo_path,
            suppress_warning=True,
        )
        if token_from_secrets and (not token or overwrite_with_project_settings):
            token = token_from_secrets

    return token


def build_authenticated_remote_url(remote_url: str, username: str, token: str) -> str:
    # https://[username]:[token]@github.com/[remote_url]
    url = urlsplit(remote_url)
    url = url._replace(netloc=f'{username}:{token}@{url.netloc}')
    return urlunsplit(url)


async def poll_process_with_timeout(
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
            message = err.decode('UTF-8') if err else error_message
            raise ChildProcessError(message)
        else:
            return out.decode('UTF-8') if out else None

    if return_code is None:
        proc.kill()
        raise TimeoutError


def check_connection(git, remote_url: str) -> None:
    asyncio.run(validate_authentication_for_remote_url(git, remote_url))


async def check_connection_async(git, remote_name: str) -> None:
    proc = git.ls_remote(remote_name, as_process=True)

    await poll_process_with_timeout(
        proc,
        error_message=(
            'Error connecting to remote, make sure your access token or SSH key is '
            'set up properly.'
        ),
        timeout=5,
    )


async def validate_authentication_for_remote_url(git, remote_url: str) -> None:
    proc = git.ls_remote(remote_url, as_process=True)

    await poll_process_with_timeout(
        proc,
        error_message='Error connecting to remote, make sure your access is valid.',
    )


def execute_on_remote_branch(func: Callable, branch) -> None:
    """
    Decorator method for commands that need to connect to the remote repo. This decorator
    will configure and test SSH settings before executing the Git command.
    """
    auth_type = branch.auth_type
    git = branch.git
    git_config = branch.project.git_config
    remote_name = branch.remote.name
    remote_repo_link = branch.remote.url
    repo_path = branch.project.repo_path

    async def wrapper(*args, **kwargs):
        async def __add_host_to_known_hosts(remote_name: str):
            add_host_to_known_hosts(remote_name)
            await check_connection_async(git, remote_name)

        if AuthType.SSH == auth_type:
            url = f'ssh://{remote_repo_link}'
            hostname = urlparse(url).hostname

            private_key_file = create_ssh_keys(git_config, repo_path)
            git_ssh_cmd = f'ssh -i {private_key_file}'

            with git.custom_environment(GIT_SSH_COMMAND=git_ssh_cmd):
                if not os.path.exists(DEFAULT_KNOWN_HOSTS_FILE):
                    add_host_to_known_hosts(remote_name)
                try:
                    await check_connection_async(git, remote_name)
                except ChildProcessError as err:
                    if 'Host key verification failed' in str(err):
                        if hostname:
                            await __add_host_to_known_hosts(remote_name)
                    else:
                        raise err
                except TimeoutError:
                    if hostname:
                        await __add_host_to_known_hosts(remote_name)
                    else:
                        raise TimeoutError(
                            """
Connecting to remote timed out, make sure your SSH key is set up properly
and your repository host is added as a known host. More information
here: https://docs.mage.ai/developing-in-the-cloud/setting-up-git#5-add-github-com-to-known-hosts
"""
                        )
            return await func(*args, **kwargs)
        else:
            await check_connection_async(git, remote_name)
            return await func(*args, **kwargs)

    return wrapper


def get_oauth_client_id(provider: str) -> str:
    return f'{provider}_{get_project_uuid()}'


def get_oauth_access_token_for_user(
    user: User, provider: str = None
) -> Oauth2AccessToken:
    if not provider:
        provider = ProviderName.GHE if get_ghe_hostname() else ProviderName.GITHUB
    access_tokens = access_tokens_for_client(get_oauth_client_id(provider), user=user)
    if access_tokens:
        return access_tokens[0]
