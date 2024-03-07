from abc import ABC, abstractmethod

from mage_ai.authentication.oauth.constants import ProviderName


class Client(ABC):
    def __init__(self, access_token: str):
        self.access_token = access_token

    @classmethod
    def get_client_for_provider(cls, provider: str):
        if not provider or provider == ProviderName.GITHUB:
            from mage_ai.data_preparation.git.clients.github import GitHubClient

            return GitHubClient
        elif provider == ProviderName.BITBUCKET:
            from mage_ai.data_preparation.git.clients.bitbucket import BitbucketClient

            return BitbucketClient
        elif provider == ProviderName.GITLAB:
            from mage_ai.data_preparation.git.clients.gitlab import GitlabClient

            return GitlabClient
        elif provider == ProviderName.GHE:
            from mage_ai.data_preparation.git.clients.ghe import GHEClient

            return GHEClient
        elif provider == ProviderName.AZURE_DEVOPS:
            from mage_ai.data_preparation.git.clients.azure_devops import (
                AzureDevopsClient,
            )

            return AzureDevopsClient
        else:
            raise NotImplementedError()

    @abstractmethod
    def get_user(self):
        raise NotImplementedError()

    @abstractmethod
    def get_branches(self, repository_name: str):
        raise NotImplementedError()

    @abstractmethod
    def get_pull_requests(self, repository_name: str):
        raise NotImplementedError()

    @abstractmethod
    def create_pull_request(
        self,
        repository_name: str,
        base_branch: str,
        body: str,
        compare_branch: str,
        title: str,
    ):
        raise NotImplementedError()
