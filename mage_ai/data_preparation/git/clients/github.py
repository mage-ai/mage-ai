import requests
from github import Auth, Github

from mage_ai.data_preparation.git.clients.base import Client


class GitHubClient(Client):
    def __init__(self, access_token: str):
        super().__init__(access_token)
        self.api_endpoint = 'https://api.github.com'

        auth = Auth.Token(access_token)
        self.github = Github(auth=auth)

    def get_user(self):
        endpoint = f'{self.api_endpoint}/user'
        resp = requests.get(
            endpoint,
            headers={
                'Accept': 'application/vnd.github+json',
                'Authorization': f'Bearer {self.access_token}',
                'X-GitHub-Api-Version': '2022-11-28',
            },
            timeout=10,
        )
        data = resp.json()

        return dict(
            username=data.get('login'),
            email=data.get('email'),
        )

    def get_branches(self, repository_name: str):
        repo = self.github.get_repo(repository_name)
        return [branch.name for branch in repo.get_branches()]

    def get_pull_requests(self, repository_name: str):
        repo = self.github.get_repo(repository_name)
        return [self.__pull_request_to_dict(pr) for pr in repo.get_pulls()]

    def create_pull_request(
        self,
        repository_name: str,
        base_branch: str,
        body: str,
        compare_branch: str,
        title: str,
    ):
        repo = self.github.get_repo(repository_name)
        pr = repo.create_pull(
            base=base_branch,
            body=body,
            head=compare_branch,
            title=title,
        )

        return self.__pull_request_to_dict(pr)

    def __pull_request_to_dict(self, pr):
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
