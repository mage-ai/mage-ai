import unittest
from unittest import mock
from tap_github.client import GithubClient, DEFAULT_DOMAIN

@mock.patch('tap_github.GithubClient.verify_access_for_repo', return_value = None)
class TestCustomDomain(unittest.TestCase):
    """
    Test custom domain is supported in client
    """

    def test_config_without_domain(self, mock_verify_access):
        """
        Test if the domain is not given in the config
        """
        mock_config = {'repository': 'singer-io/test-repo', "access_token": ""}
        test_client = GithubClient(mock_config)

        # Verify domain in client is default
        self.assertEqual(test_client.base_url, DEFAULT_DOMAIN)
    
    def test_config_with_domain(self, mock_verify_access):
        """
        Test if the domain is given in the config
        """
        mock_config = {'repository': 'singer-io/test-repo', "base_url": "http://CUSTOM-git.com", "access_token": ""}
        test_client = GithubClient(mock_config)

        # Verify domain in client is from config
        self.assertEqual(test_client.base_url, mock_config["base_url"])
