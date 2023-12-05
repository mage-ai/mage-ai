import asyncio
import os
import shutil
import subprocess
import uuid
from typing import Dict
from urllib.parse import urlsplit, urlunsplit

import requests
from git.remote import RemoteProgress
from git.repo.base import Repo

from mage_ai.authentication.oauth.constants import (
    DEFAULT_GITHUB_HOSTNAME,
    OAUTH_PROVIDER_GHE,
    OAUTH_PROVIDER_GITHUB,
    get_ghe_hostname,
)
from mage_ai.authentication.oauth.utils import access_tokens_for_client
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.orchestration.db.models.oauth import Oauth2AccessToken, User

API_ENDPOINT = 'https://api.github.com'


def get_oauth_client_id(provider: str) -> str:
    return f'{provider}_{get_project_uuid()}'


def get_access_token_for_user(user: User, provider: str = None) -> Oauth2AccessToken:
    if not provider:
        provider = OAUTH_PROVIDER_GHE if get_ghe_hostname() else OAUTH_PROVIDER_GITHUB
    access_tokens = access_tokens_for_client(get_oauth_client_id(provider), user=user)
    if access_tokens:
        return access_tokens[0]


def fetch(
    remote_name: str,
    remote_url: str,
    token: str,
    user: User = None,
) -> RemoteProgress:
    from mage_ai.data_preparation.git import Git

    custom_progress = RemoteProgress()
    username = get_username(token, user=user)

    url = build_authenticated_remote_url(remote_url, username, token)
    git_manager = Git.get_manager(user=user)

    remote = git_manager.repo.remotes[remote_name]
    url_original = list(remote.urls)[0]
    remote.set_url(url)

    try:
        remote.fetch(progress=custom_progress)
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
) -> RemoteProgress:
    from mage_ai.data_preparation.git import Git

    custom_progress = RemoteProgress()
    username = get_username(token, user=user)

    url = build_authenticated_remote_url(remote_url, username, token)
    git_manager = Git.get_manager(user=user)

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


def push(
    remote_name: str,
    remote_url: str,
    branch_name: str,
    token: str,
    user: User = None,
) -> RemoteProgress:
    from mage_ai.data_preparation.git import Git

    custom_progress = RemoteProgress()
    username = get_username(token, user=user)

    url = build_authenticated_remote_url(remote_url, username, token)
    git_manager = Git.get_manager(user=user)

    remote = git_manager.repo.remotes[remote_name]
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


def reset_hard(
    remote_name: str,
    remote_url: str,
    branch_name: str,
    token: str,
    user: User = None,
) -> None:
    from mage_ai.data_preparation.git import Git

    username = get_username(token, user=user)

    url = build_authenticated_remote_url(remote_url, username, token)
    git_manager = Git.get_manager(user=user)

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
) -> None:
    from mage_ai.data_preparation.git import Git

    username = get_username(token, user=user)

    url = build_authenticated_remote_url(remote_url, username, token)
    git_manager = Git.get_manager(user=user)

    remote = git_manager.repo.remotes[remote_name]
    url_original = list(remote.urls)[0]
    remote.set_url(url)

    all_remotes = git_manager.remotes()

    tmp_path = f'{git_manager.repo_path}_{uuid.uuid4().hex}'
    os.mkdir(tmp_path)
    try:
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


def build_authenticated_remote_url(remote_url: str, username: str, token: str) -> str:
    # https://[username]:[token]@github.com/[remote_url]
    url = urlsplit(remote_url)
    url = url._replace(netloc=f'{username}:{token}@{url.netloc}')
    return urlunsplit(url)


def get_username(token: str, user: User = None) -> str:
    resp = get_user(token)
    if resp.get('login') is None:
        from mage_ai.data_preparation.git import Git
        git_manager = Git.get_manager(user=user, setup_repo=False)
        return git_manager.git_config.username
    else:
        return resp['login']


def get_user(token: str) -> Dict:
    """
    https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
    """
    ghe_hostname = get_ghe_hostname()
    endpoint = f'{API_ENDPOINT}/user'
    if ghe_hostname and ghe_hostname != DEFAULT_GITHUB_HOSTNAME:
        endpoint = f'{ghe_hostname}/api/v3/user'
    resp = requests.get(
        endpoint,
        headers={
            'Accept': 'application/vnd.github+json',
            'Authorization': f'Bearer {token}',
            'X-GitHub-Api-Version': '2022-11-28',
        },
        timeout=10,
    )

    return resp.json()


def check_connection(repo: Repo, remote_url: str) -> None:
    asyncio.run(validate_authentication_for_remote_url(repo, remote_url))


async def validate_authentication_for_remote_url(repo: Repo, remote_url: str) -> None:
    proc = repo.git.ls_remote(remote_url, as_process=True)

    asyncio.run(
        __poll_process_with_timeout(
            proc,
            error_message='Error connecting to remote, make sure your access is valid.',
        )
    )


async def __poll_process_with_timeout(
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
        message = err.decode('UTF-8') if err else error_message
        raise ChildProcessError(message)

    if return_code is None:
        proc.kill()
        raise TimeoutError(error_message)
