from typing import Dict

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.authentication.oauth.constants import ProviderName
from mage_ai.data_preparation.git.clients.base import Client as GitClient
from mage_ai.data_preparation.git.utils import (
    get_oauth_access_token_for_user,
    get_provider_from_remote_url,
)


def pull_request_to_dict(pr) -> Dict:
    return dict(
        body=pr.body,
        created_at=pr.created_at,
        id=pr.id,
        is_merged=pr.is_merged(),
        last_modified=pr.last_modified,
        merged=pr.merged,
        state=pr.state,
        title=pr.title,
        url=pr.html_url,
        user=pr.user.login,
    )


class PullRequestResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        arr = []

        remote_url = query.get('remote_url', None)
        if remote_url:
            remote_url = remote_url[0]

        repository = query.get('repository', None)
        if repository:
            repository = repository[0]

            provider = ProviderName.GITHUB
            if remote_url:
                provider = get_provider_from_remote_url(remote_url)

            access_token = get_oauth_access_token_for_user(user, provider=provider)

            if access_token:
                arr = GitClient.get_client_for_provider(provider)(
                    access_token.token
                ).get_pull_requests(repository)

        return self.build_result_set(arr, user, **kwargs)

    @classmethod
    def create(self, payload, user, **kwargs):
        error = ApiError.RESOURCE_INVALID

        for key in [
            'base_branch',
            'compare_branch',
            'body',
            'title',
        ]:
            if key not in payload or payload.get(key) is None:
                error.update(dict(message=f'Value for {key} is required but empty.'))
                raise ApiError(error)

        if payload.get('base_branch') == payload.get('compare_branch'):
            error.update(
                dict(
                    message='Base branch and compare branch cannot be the same.',
                )
            )
            raise ApiError(error)

        repository = payload.get('repository')
        if not repository:
            error.update(
                dict(
                    message='Repository is empty, '
                    + 'please select a repository to create a pull request in.',
                )
            )
            raise ApiError(error)

        remote_url = payload.get('remote_url')
        provider = get_provider_from_remote_url(remote_url)

        access_token = get_oauth_access_token_for_user(user, provider=provider)
        if not access_token:
            error.update(
                dict(
                    message=f'Access token not found, please authenticate with {provider}.',
                )
            )
            raise ApiError(error)

        client = GitClient.get_client_for_provider(provider)(access_token.token)

        return self(
            client.create_pull_request(
                repository,
                payload.get('base_branch'),
                payload.get('body'),
                payload.get('compare_branch'),
                payload.get('title'),
            ),
            user,
            **kwargs,
        )
