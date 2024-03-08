import json

import requests

from mage_ai.data_preparation.git.clients.base import Client
from mage_ai.settings import get_settings_value
from mage_ai.settings.keys import AZURE_DEVOPS_ORGANIZATION


class AzureDevopsClient(Client):
    def __init__(self, access_token: str):
        super().__init__(access_token)
        self.organization = get_settings_value(AZURE_DEVOPS_ORGANIZATION)

    def get_user(self):
        return dict(username='oauth2')

    def get_branches(self, repository_name: str):
        project_name, repository_name = repository_name.split('/')
        resp = requests.get(
            f'https://dev.azure.com/{self.organization}/{project_name}/_apis/git/repositories/{repository_name}/refs?api-version=7.1-preview.1',  # noqa: E501
            headers={
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.access_token}',
            },
            timeout=10,
        )
        data = resp.json()

        arr = []
        for branch in data.get('value', []):
            branch_name = branch.get('name')
            if branch_name.startswith('refs/heads/'):
                arr.append(branch_name)
        return arr

    def get_pull_requests(self, repository_name: str):
        project_name, repository_name = repository_name.split('/')
        resp = requests.get(
            f'https://dev.azure.com/{self.organization}/{project_name}/_apis/git/repositories/{repository_name}/pullrequests?api-version=7.1-preview.1',  # noqa: E501
            headers={
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.access_token}',
            },
            timeout=10,
        )
        data = resp.json()

        arr = []
        for pr in data.get('value', []):
            arr.append(
                dict(
                    body=pr.get('description'),
                    created_at=pr.get('creationDate'),
                    id=pr.get('pullRequestId'),
                    is_merged=pr.get('status') == 'completed',
                    merged=pr.get('status') == 'completed',
                    state=pr.get('status'),
                    title=pr.get('title'),
                    url=f'https://dev.azure.com/{self.organization}/{project_name}/_git/{repository_name}/pullrequest/{pr.get("pullRequestId")}',  # noqa: E501
                    user=pr.get('createdBy', {}).get('displayName'),
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
        project_name, repository_name = repository_name.split('/')
        data = {
            'title': title,
            'description': body,
            'sourceRefName': compare_branch,
            'targetRefName': base_branch,
        }

        resp = requests.post(
            f'https://dev.azure.com/{self.organization}/{project_name}/_apis/git/repositories/{repository_name}/pullrequests?api-version=7.1-preview.1',  # noqa: E501
            headers={
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json',
            },
            data=json.dumps(data),
            timeout=10,
        )

        resp.raise_for_status()
        pr = resp.json()
        return dict(
            body=pr.get('description'),
            created_at=pr.get('creationDate'),
            id=pr.get('pullRequestId'),
            is_merged=pr.get('status') == 'completed',
            merged=pr.get('status') == 'completed',
            state=pr.get('status'),
            title=pr.get('title'),
            url=pr.get('url'),
            user=pr.get('createdBy', {}).get('displayName'),
        )
