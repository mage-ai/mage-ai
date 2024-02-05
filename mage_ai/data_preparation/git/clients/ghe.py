from github import Auth, Github

from mage_ai.authentication.oauth.constants import (
    DEFAULT_GITHUB_HOSTNAME,
    get_ghe_hostname,
)
from mage_ai.data_preparation.git.clients.github import GitHubClient


class GHEClient(GitHubClient):
    def __init__(self, access_token: str):
        self.access_token = access_token
        ghe_hostname = get_ghe_hostname()
        if ghe_hostname and ghe_hostname != DEFAULT_GITHUB_HOSTNAME:
            self.api_endpoint = f'{ghe_hostname}/api/v3'
        else:
            self.api_endpoint = 'https://api.github.com'

        auth = Auth.Token(access_token)
        self.github = Github(auth=auth, base_url=self.api_endpoint)
