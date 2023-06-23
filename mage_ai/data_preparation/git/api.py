import asyncio
import requests
import subprocess
from datetime import datetime
from git.remote import RemoteProgress
from git.repo.base import Repo
from mage_ai.authentication.oauth.constants import OAUTH_PROVIDER_GITHUB
from mage_ai.orchestration.db.models.oauth import Oauth2AccessToken, Oauth2Application, User
from typing import Dict
from urllib.parse import urlsplit, urlunsplit


API_ENDPOINT = 'https://api.github.com'


def get_access_token_for_user(user: User) -> Oauth2AccessToken:
    oauth_client = Oauth2Application.query.filter(
        Oauth2Application.client_id == OAUTH_PROVIDER_GITHUB,
    ).first()

    if oauth_client:
        access_token = Oauth2AccessToken.query.filter(
            Oauth2AccessToken.expires > datetime.utcnow(),
            Oauth2AccessToken.oauth2_application_id == oauth_client.id,
        ).first()

        return access_token


def fetch(remote_name: str, remote_url: str, token: str) -> RemoteProgress:
    from mage_ai.data_preparation.git import Git

    custom_progress = RemoteProgress()
    username = get_username(token)

    url = build_authenticated_remote_url(remote_url, username, token)
    git_manager = Git.get_manager()

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


def pull(remote_name: str, remote_url: str, branch_name: str, token: str) -> RemoteProgress:
    from mage_ai.data_preparation.git import Git

    custom_progress = RemoteProgress()
    username = get_username(token)

    url = build_authenticated_remote_url(remote_url, username, token)
    git_manager = Git.get_manager()

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


def push(remote_name: str, remote_url: str, branch_name: str, token: str) -> RemoteProgress:
    from mage_ai.data_preparation.git import Git

    custom_progress = RemoteProgress()
    username = get_username(token)

    url = build_authenticated_remote_url(remote_url, username, token)
    git_manager = Git.get_manager()

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


def build_authenticated_remote_url(remote_url: str, username: str, token: str) -> str:
    # https://[username]:[token]@github.com/[remote_url]
    url = urlsplit(remote_url)
    url = url._replace(netloc=f'{username}:{token}@{url.netloc}')
    return urlunsplit(url)


def get_username(token: str) -> str:
    return get_user(token)['login']


def get_user(token: str) -> Dict:
    """
    https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
    """
    resp = requests.get(f'{API_ENDPOINT}/user', headers={
        'Accept': 'application/vnd.github+json',
        'Authorization': f'Bearer {token}',
        'X-GitHub-Api-Version': '2022-11-28',
    })

    return resp.json()


def check_connection(repo: Repo, remote_url: str) -> None:
    asyncio.run(validate_authentication_for_remote_url(repo, remote_url))


async def validate_authentication_for_remote_url(repo: Repo, remote_url: str) -> None:
    proc = repo.git.ls_remote(remote_url, as_process=True)

    asyncio.run(__poll_process_with_timeout(
        proc,
        error_message='Error connecting to remote, make sure your access is valid.',
    ))


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
        message = (
            err.decode('UTF-8') if err
            else error_message
        )
        raise ChildProcessError(message)

    if return_code is None:
        proc.kill()
        raise TimeoutError(error_message)
