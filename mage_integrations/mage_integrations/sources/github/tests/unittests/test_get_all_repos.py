import unittest
from unittest import mock
import requests
import requests_mock
import simplejson as json

from tap_github.client import GithubClient

from itertools import cycle


SESSION = requests.Session()
ADAPTER = requests_mock.Adapter()
SESSION.mount('mock://', ADAPTER)

class MockResponse():
    """ Mock response object class."""

    def __init__(self, links):
        self.links = links

@mock.patch('tap_github.client.GithubClient.verify_repo_access')
@mock.patch('tap_github.client.GithubClient.authed_get_all_pages')
class TestGetAllRepos(unittest.TestCase):
    """
    Test `get_all_repos` method from client.
    """
    config = {"access_token": "", "repository": "test-org/repo1 test-org/repo2 test-org/repo3"}

    def test_single_organization(self, mocked_authed_get_all_pages, mocked_verify_repo_access):
        """Verify for single organisation with all repos."""
        test_client = GithubClient(self.config)
        orgs = ['test-org/*']
        repos = ['repo1', 'repo2', 'repo3']

        mocked_url = 'mock://github.com/orgs/test-org/repos'
        mocked_response_body = [
            {'full_name': ''.join(r).replace('*', '')} for r in zip(cycle(orgs), repos)
            ]
        mocked_response_text = json.dumps(mocked_response_body)
        ADAPTER.register_uri(
            'GET',
            mocked_url,
            text=mocked_response_text)
        mocked_response = SESSION.get(mocked_url)

        expected_repositories = [
            'test-org/repo1',
            'test-org/repo2',
            'test-org/repo3'
            ]
        mocked_authed_get_all_pages.return_value = [mocked_response]

        # Verify expected list of repo paths
        self.assertEqual(expected_repositories, test_client.get_all_repos(orgs))

    def test_multiple_organizations(self, mocked_authed_get_all_pages, mocked_verify_repo_access):
        """Verify for multiple organisations with all repos."""
        test_client = GithubClient(self.config)
        orgs = ['test-org/*', 'singer-io/*']
        repos = ['repo1', 'repo2', 'repo3']

        mocked_url = 'mock://github.com/orgs/test-org/repos'
        side_effect = []
        for org in orgs:
            mocked_response_body = [
                {'full_name': ''.join(r).replace('*', '')} for r in zip(cycle([org]), repos)
                ]
            ADAPTER.register_uri(
                'GET',
                mocked_url,
                text=json.dumps(mocked_response_body))
            mocked_response = SESSION.get(mocked_url)
            mocked_authed_get_all_pages.return_value = [mocked_response]

            call_response = test_client.get_all_repos([org])

            side_effect.extend(call_response)

        expected_repositories = [
            'test-org/repo1',
            'test-org/repo2',
            'test-org/repo3',
            'singer-io/repo1',
            'singer-io/repo2',
            'singer-io/repo3'
            ]

        # Verify expected list of repo paths
        self.assertListEqual(expected_repositories, side_effect)

@mock.patch('tap_github.client.GithubClient.verify_repo_access')
@mock.patch('tap_github.client.GithubClient.authed_get')
class TestAuthedGetAllPages(unittest.TestCase):
    """
    Test `authed_get_all_pages` method from client.
    """
    config = {"access_token": "", "repository": "test-org/repo1"}
    
    def test_for_one_page(self, mock_auth_get, mock_verify_access):

        """Verify `authed_get` is called only once if one page is available."""

        test_client = GithubClient(self.config)
        mock_auth_get.return_value = MockResponse({})
        
        list(test_client.authed_get_all_pages("", "mock_url", {}))
        
        # Verify `auth_get` call count
        self.assertEqual(mock_auth_get.call_count, 1)

    def test_for_multiple_pages(self, mock_auth_get, mock_verify_access):

        """Verify `authed_get` is called equal number times as pages available."""

        test_client = GithubClient(self.config)
        mock_auth_get.side_effect = [MockResponse({"next": {"url": "mock_url_2"}}),MockResponse({"next": {"url": "mock_url_3"}}),MockResponse({})]
        
        list(test_client.authed_get_all_pages("", "mock_url_1", {}))
        
        # Verify `auth_get` call count
        self.assertEqual(mock_auth_get.call_count, 3)
        
        # Verify `auth_get` calls with expected url
        self.assertEqual(mock_auth_get.mock_calls[0], mock.call("", "mock_url_1", {}, '', True))
        self.assertEqual(mock_auth_get.mock_calls[1], mock.call("", "mock_url_2", {}, '', True))
        self.assertEqual(mock_auth_get.mock_calls[2], mock.call("", "mock_url_3", {}, '', True))
