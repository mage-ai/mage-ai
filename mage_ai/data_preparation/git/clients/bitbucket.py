import json

import requests

from mage_ai.data_preparation.git.clients.base import Client


class BitbucketClient(Client):
    def __init__(self, access_token: str):
        super().__init__(access_token)

    def get_user(self):
        resp = requests.get(
            'https://api.bitbucket.org/2.0/user',
            headers={
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.access_token}',
            },
            timeout=10,
        )
        data = resp.json()

        return dict(
            username=data.get('username'),
        )

    def get_branches(self, repository_name: str):
        resp = requests.get(
            f'https://api.bitbucket.org/2.0/repositories/{repository_name}/refs/branches',
            headers={
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.access_token}',
            },
            timeout=10,
        )
        data = resp.json()

        arr = []
        for branch in data.get('values', []):
            arr.append(branch.get('name'))
        return arr

    def get_pull_requests(self, repository_name: str):
        resp = requests.get(
            f'https://api.bitbucket.org/2.0/repositories/{repository_name}/pullrequests',
            headers={
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.access_token}',
            },
            timeout=10,
        )
        data = resp.json()

        arr = []
        for pr in data.get('values', []):
            arr.append(
                dict(
                    body=pr.get('summary', {}).get('raw'),
                    created_at=pr.get('created_on'),
                    id=pr.get('id'),
                    is_merged=pr.get('state') == 'MERGED',
                    last_modified=pr.get('updated_on'),
                    merged=pr.get('state') == 'MERGED',
                    state=pr.get('state'),
                    title=pr.get('title'),
                    url=pr.get('links', {}).get('html', {}).get('href'),
                    user=pr.get('author', {}).get('display_name'),
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
            'source': {
                'branch': {
                    'name': compare_branch,
                },
            },
            'destination': {
                'branch': {
                    'name': base_branch,
                },
            },
        }

        resp = requests.post(
            f'https://api.bitbucket.org/2.0/repositories/{repository_name}/pullrequests',
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
            body=pr.get('summary', {}).get('raw'),
            created_at=pr.get('created_on'),
            id=pr.get('id'),
            is_merged=pr.get('state') == 'MERGED',
            last_modified=pr.get('updated_on'),
            merged=pr.get('state') == 'MERGED',
            state=pr.get('state'),
            title=pr.get('title'),
            url=pr.get('links', {}).get('html', {}).get('href'),
            user=pr.get('author', {}).get('display_name'),
        )
