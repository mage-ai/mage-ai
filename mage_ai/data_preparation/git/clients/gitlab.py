import json
from urllib.parse import quote_plus

import requests

from mage_ai.data_preparation.git.clients.base import Client
from mage_ai.settings import get_settings_value
from mage_ai.settings.keys import GITLAB_HOST


class GitlabClient(Client):
    def __init__(self, access_token: str):
        super().__init__(access_token)
        self.hostname = get_settings_value(GITLAB_HOST, 'https://gitlab.com')

    def get_user(self):
        # For GitLab, we don't need to make a request to the API to get the username
        # because the username will always be 'oauth2' for the access token we use.
        return dict(username='oauth2')

    def get_branches(self, repository_name: str):
        repository_name = quote_plus(repository_name)
        resp = requests.get(
            f'{self.hostname}/api/v4/projects/{repository_name}/repository/branches',
            headers={
                'Authorization': f'Bearer {self.access_token}',
            },
            timeout=10,
        )
        data = resp.json()

        arr = []
        for branch in data:
            arr.append(branch.get('name'))
        return arr

    def get_pull_requests(self, repository_name: str):
        repository_name = quote_plus(repository_name)
        resp = requests.get(
            f'{self.hostname}/api/v4/projects/{repository_name}/merge_requests',
            headers={
                'Authorization': f'Bearer {self.access_token}',
            },
            timeout=10,
        )
        data = resp.json()

        arr = []
        for pr in data:
            arr.append(
                dict(
                    body=pr.get('description'),
                    created_at=pr.get('created_at'),
                    id=pr.get('id'),
                    is_merged=pr.get('state') == 'merged',
                    last_modified=pr.get('updated_at'),
                    merged=pr.get('state') == 'merged',
                    state=pr.get('state'),
                    title=pr.get('title'),
                    url=pr.get('web_url'),
                    user=pr.get('author', {}).get('username'),
                )
            )

        return arr

    def create_pull_request(
        self,
        repository_name: str,
        base_branch: str,
        body: str,
        compare_branch: str,
        title: str,
    ):
        data = {
            'title': title,
            'description': body,
            'source_branch': compare_branch,
            'target_branch': base_branch,
        }
        repository_name = quote_plus(repository_name)

        resp = requests.post(
            f'{self.hostname}/api/v4/projects/{repository_name}/merge_requests',
            headers={
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.access_token}',
            },
            data=json.dumps(data),
            timeout=10,
        )

        resp.raise_for_status()
        pr = resp.json()
        return dict(
            body=pr.get('description'),
            created_at=pr.get('created_at'),
            id=pr.get('id'),
            is_merged=pr.get('state') == 'merged',
            last_modified=pr.get('updated_at'),
            merged=pr.get('state') == 'merged',
            state=pr.get('state'),
            title=pr.get('title'),
            url=pr.get('web_url'),
            user=pr.get('author', {}).get('username'),
        )
