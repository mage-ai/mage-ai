import os
import shutil
import uuid
from typing import Dict

from mage_ai.authentication.oauth.constants import ProviderName, get_ghe_hostname
from mage_ai.authentication.oauth.utils import access_tokens_for_client
from mage_ai.data_preparation.git.clients.base import Client as GitClient
from mage_ai.data_preparation.git.utils import (
    build_authenticated_remote_url,
    get_provider_from_remote_url,
)
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.orchestration.db.models.oauth import Oauth2AccessToken, User
from mage_ai.server.logger import Logger

API_ENDPOINT = 'https://api.github.com'
logger = Logger().new_server_logger(__name__)


def get_oauth_client_id(provider: str) -> str:
    return f'{provider}_{get_project_uuid()}'


def get_access_token_for_user(user: User, provider: str = None) -> Oauth2AccessToken:
    if not provider:
        provider = ProviderName.GHE if get_ghe_hostname() else ProviderName.GITHUB
    access_tokens = access_tokens_for_client(get_oauth_client_id(provider), user=user)
    if access_tokens:
        return access_tokens[0]


def switch_branch(
    remote_name: str,
    remote_url: str,
    branch_name: str,
    token: str,
    config_overwrite: Dict = None,
    user: User = None,
    **kwargs,
):
    from mage_ai.data_preparation.git import Git
    provider = get_provider_from_remote_url(remote_url)
    username = get_username(token, user=user, provider=provider)

    url = build_authenticated_remote_url(remote_url, username, token)
    git_manager = Git.get_manager(user=user, config_overwrite=config_overwrite)

    remote = git_manager.repo.remotes[remote_name]
    url_original = list(remote.urls)[0]
    remote.set_url(url)

    try:
        git_manager.switch_remote_branch(branch_name, remote_name)
    except Exception as err:
        raise err
    finally:
        try:
            remote.set_url(url_original)
        except Exception as err:
            print('WARNING (mage_ai.data_preparation.git.api):')
            print(err)


def fetch(
    remote_name: str,
    remote_url: str,
    token: str,
    user: User = None,
    config_overwrite: Dict = None,
    **kwargs,
):
    """
    Returns:
        git.remote.RemoteProgress: Custom progress object that can be used to monitor the
            fetch progress.
    """
    from git.remote import RemoteProgress

    from mage_ai.data_preparation.git import Git

    custom_progress = RemoteProgress()
    provider = get_provider_from_remote_url(remote_url)
    username = get_username(token, user=user, provider=provider)

    url = build_authenticated_remote_url(remote_url, username, token)
    git_manager = Git.get_manager(user=user, config_overwrite=config_overwrite)

    remote = git_manager.repo.remotes[remote_name]
    url_original = list(remote.urls)[0]
    remote.set_url(url)

    try:
        remote.fetch(progress=custom_progress, **kwargs)
    except Exception as err:
        raise err
    finally:
        try:
            remote.set_url(url_original)
        except Exception as err:
            print('WARNING (mage_ai.data_preparation.git.api):')
            print(err)

    return custom_progress


def pull(
    remote_name: str,
    remote_url: str,
    branch_name: str,
    token: str,
    user: User = None,
    config_overwrite: Dict = None,
    **kwargs,
):
    """
    Returns:
        git.remote.RemoteProgress: Custom progress object that can be used to monitor the
            pull progress.
    """
    from git.remote import RemoteProgress

    from mage_ai.data_preparation.git import Git

    custom_progress = RemoteProgress()
    provider = get_provider_from_remote_url(remote_url)
    username = get_username(token, user=user, provider=provider)

    url = build_authenticated_remote_url(remote_url, username, token)
    git_manager = Git.get_manager(user=user, config_overwrite=config_overwrite)

    remote = git_manager.repo.remotes[remote_name]
    url_original = list(remote.urls)[0]
    remote.set_url(url)

    try:
        remote.pull(branch_name, custom_progress)
    except Exception as err:
        raise err
    finally:
        try:
            remote.set_url(url_original)
        except Exception as err:
            print('WARNING (mage_ai.data_preparation.git.api):')
            print(err)

    return custom_progress


def push_raw(
    repo,
    remote_name: str,
    remote_url: str,
    branch_name: str,
    token: str,
    user: User = None,
    **kwargs,
):
    """
    Returns:
        git.remote.RemoteProgress: Custom progress object that can be used to monitor the
            push progress.
    """
    from git.remote import RemoteProgress
    custom_progress = RemoteProgress()
    provider = get_provider_from_remote_url(remote_url)
    username = get_username(token, user=user, provider=provider)

    url = build_authenticated_remote_url(remote_url, username, token)

    remote = repo.remotes[remote_name]
    url_original = list(remote.urls)[0]
    remote.set_url(url)

    try:
        remote.push(branch_name, custom_progress)
    except Exception as err:
        raise err
    finally:
        try:
            remote.set_url(url_original)
        except Exception as err:
            print('WARNING (mage_ai.data_preparation.git.api):')
            print(err)

    return custom_progress


def push(
    remote_name: str,
    remote_url: str,
    branch_name: str,
    token: str,
    user: User = None,
    config_overwrite: Dict = None,
    **kwargs,
):
    """
    Returns:
        git.remote.RemoteProgress: Custom progress object that can be used to monitor the
            push progress.
    """
    from mage_ai.data_preparation.git import Git

    git_manager = Git.get_manager(user=user, config_overwrite=config_overwrite)

    return push_raw(
        git_manager.repo,
        remote_name=remote_name,
        remote_url=remote_url,
        branch_name=branch_name,
        token=token,
        user=user,
        config_overwrite=config_overwrite,
    )


def reset_hard(
    remote_name: str,
    remote_url: str,
    branch_name: str,
    token: str,
    user: User = None,
    config_overwrite: Dict = None,
    **kwargs,
) -> None:
    from mage_ai.data_preparation.git import Git

    provider = get_provider_from_remote_url(remote_url)
    username = get_username(token, user=user, provider=provider)

    url = build_authenticated_remote_url(remote_url, username, token)
    git_manager = Git.get_manager(user=user, config_overwrite=config_overwrite)

    remote = git_manager.repo.remotes[remote_name]
    url_original = list(remote.urls)[0]
    remote.set_url(url)

    try:
        remote.fetch()
        git_manager.repo.git.reset('--hard', f'{remote_name}/{branch_name}')
    finally:
        try:
            remote.set_url(url_original)
        except Exception as err:
            print('WARNING (mage_ai.data_preparation.git.api):')
            print(err)


def clone(
    remote_name: str,
    remote_url: str,
    token: str,
    user: User = None,
    config_overwrite: Dict = None,
    **kwargs,
) -> None:
    from mage_ai.data_preparation.git import Git

    provider = get_provider_from_remote_url(remote_url)
    username = get_username(token, user=user, provider=provider)

    url = build_authenticated_remote_url(remote_url, username, token)
    git_manager = Git.get_manager(user=user, config_overwrite=config_overwrite)

    remote = git_manager.repo.remotes[remote_name]
    url_original = list(remote.urls)[0]
    remote.set_url(url)

    all_remotes = git_manager.remotes()

    tmp_path = f'{git_manager.repo_path}_{uuid.uuid4().hex}'
    os.mkdir(tmp_path)
    try:
        from git.repo.base import Repo

        # Clone to a tmp folder first, then copy the folder to the actual repo path. Git
        # won't allow you to clone to a folder that is not empty.
        Repo.clone_from(
            url,
            to_path=tmp_path,
            origin=remote_name,
        )

        shutil.rmtree(os.path.join(git_manager.repo_path, '.git'))
        shutil.copytree(
            tmp_path,
            git_manager.repo_path,
            dirs_exist_ok=True,
            ignore=lambda x, y: ['.preferences.yaml'],
        )
        Git.get_manager().repo.git.clean('-fd', exclude='.preferences.yaml')
    finally:
        shutil.rmtree(tmp_path)
        try:
            remote.set_url(url_original)
        except Exception as err:
            print('WARNING (mage_ai.data_preparation.git.api):')
            print(err)
        # Add old remotes since they may be deleted when cloning.
        git_manager = Git.get_manager()
        existing_remotes = set(remote['name'] for remote in git_manager.remotes())
        for remote in all_remotes:
            try:
                if remote['name'] not in existing_remotes:
                    git_manager.add_remote(remote['name'], remote['urls'][0])
            except Exception:
                pass


def get_username(token: str, user: User = None, provider: str = ProviderName.GITHUB) -> str:
    resp = get_user(token, provider=provider)
    if resp.get('username') is None:
        from mage_ai.data_preparation.git import Git
        git_manager = Git.get_manager(user=user, setup_repo=False)
        return git_manager.git_config.username
    else:
        return resp['username']


def get_user(token: str, provider: str = ProviderName.GITHUB) -> Dict:
    """
    https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
    """
    try:
        return GitClient.get_client_for_provider(provider)(token).get_user()
    except Exception:
        logger.exception('Error fetching user from git provider.')
        return dict()
