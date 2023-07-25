from github import Auth, Github
from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.git import api
from typing import Dict


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

        repository = query.get('repository', None)
        if repository:
            repository = repository[0]

            access_token = api.get_access_token_for_user(user)
            if access_token:
                auth = Auth.Token(access_token.token)
                g = Github(auth=auth)
                repo = g.get_repo(repository)
                pulls = repo.get_pulls(
                    direction='desc',
                    sort='created',
                    state='open',
                ).get_page(0)

                for pr in pulls:
                    arr.append(pull_request_to_dict(pr))

        return self.build_result_set(arr, user, **kwargs)

    @classmethod
    def create(self, payload, user, **kwargs):
        error = ApiError.RESOURCE_INVALID

        for key in [
            'base_branch',
            'compare_branch',
            'title',
        ]:
            if key not in payload:
                error.update(dict(message=f'Value for {key} is required but empty.'))
                raise ApiError(error)

        repository = payload.get('repository')
        if not repository:
            error.update(dict(
                message='Repository is empty, ' +
                'please select a repository to create a pull request in.',
            ))
            raise ApiError(error)

        access_token = api.get_access_token_for_user(user)
        if not access_token:
            error.update(dict(
                message='Access token not found, please authenticate with GitHub.',
            ))
            raise ApiError(error)

        auth = Auth.Token(access_token.token)
        g = Github(auth=auth)
        repo = g.get_repo(repository)

        pr = repo.create_pull(
            base=payload.get('base_branch'),
            body=payload.get('body'),
            head=payload.get('compare_branch'),
            title=payload.get('title'),
        )

        return self(pull_request_to_dict(pr), user, **kwargs)
