from email.headerregistry import ParameterizedMIMEHeader
import unittest
from unittest import mock
from tap_github.client import GithubClient, GithubException
from parameterized import parameterized


@mock.patch('tap_github.client.GithubClient.verify_access_for_repo')
@mock.patch('tap_github.client.GithubClient.get_all_repos')
class TestExtractReposFromConfig(unittest.TestCase):
    """
    Test `extract_repos_from_config` method from client.
    """

    @parameterized.expand([
        ['test_single_repo', 'singer-io/test-repo', [], ['singer-io/test-repo'], {'singer-io'}],
        ['test_multiple_repos', 'singer-io/test-repo singer-io/tap-github', [], ['singer-io/tap-github', 'singer-io/test-repo'], {'singer-io'}],
        ['test_org_all_repos', 'singer-io/test-repo test-org/*', ['test-org/repo1', 'test-org/repo2'], ['singer-io/test-repo', 'test-org/repo1', 'test-org/repo2'], {'singer-io', 'test-org'}]
    ])
    def test_extract_repos_from_config(self, mocked_get_all_repos, mock_verify_access, name, repo_paths, all_repos, expected_repos, expected_orgs):
        """
        Test `extract_repos_from_config` if only one repo path is given in config.
        """
        config = {'repository': repo_paths, "access_token": "TOKEN"}
        test_client = GithubClient(config)
        mocked_get_all_repos.return_value = all_repos
        
        actual_repos, actual_orgs = test_client.extract_repos_from_config()
        # Verify list of repo path with expected
        self.assertEqual((sorted(expected_repos), sorted(expected_orgs)), (sorted(actual_repos), sorted(actual_orgs)))

    @parameterized.expand([
        ['test_organization_without_repo_in_config', 'singer-io', ['singer-io']],
        ['test_organization_without_repo_with_slash_in_config', 'singer-io/', ['singer-io/']],
        ['test_organization_with_only_slash_in_config', '/', ['/']],
        ['test_organization_with_multiple_wrong_formatted_repo_path_in_config', 'singer-io/ /tap-github', ["singer-io/", "/tap-github"]]
    ])
    def test_organization_without_repo_in_config(self, mocked_get_all_repos, mock_verify_access, name, repo_paths, expected_repo):
        """
        Verify that the tap throws an exception with a proper error message for invalid organization names.
        """
        config = {'repository': repo_paths, "access_token": "TOKEN"}
        test_client = GithubClient(config)
        expected_error_message = "Please provide valid organization/repository for: {}".format(sorted(expected_repo))
        with self.assertRaises(GithubException) as exc:
            test_client.extract_repos_from_config()

        # Verify that we get expected error message
        self.assertEqual(str(exc.exception), expected_error_message)

    @mock.patch('tap_github.client.LOGGER.warning')
    def test_organization_with_duplicate_repo_paths_in_config(self, mock_warn, mocked_get_all_repos, mock_verify_access):
        """
        Verify that the tap logs proper warning message for duplicate repos in config and returns list without duplicates
        """
        config = {'repository': 'singer-io/tap-github singer-io/tap-github singer-io/test-repo', "access_token": "TOKEN"}
        test_client = GithubClient(config)
        expected_repos = ['singer-io/tap-github', 'singer-io/test-repo']
        actual_repos, orgs = test_client.extract_repos_from_config()
        expected_message = "Duplicate repositories found: %s and will be synced only once."

        # Verify that the logger is called with expected error message
        mock_warn.assert_called_with(expected_message, ['singer-io/tap-github'])

        # Verify that extract_repos_from_config() returns repos without duplicates
        self.assertEqual(sorted(expected_repos), sorted(actual_repos))