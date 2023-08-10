import unittest
from unittest import mock
from tap_github.sync import (update_currently_syncing_repo, update_currently_syncing,
                             get_ordered_stream_list, get_ordered_repos)

class TestGetOrderedStreamList(unittest.TestCase):
    """
    Test `get_ordered_stream_list` function to get ordered list od streams
    """

    streams_to_sync = ["commits", "pull_requests", "collaborators", "releases", "issue_labels", "assignees", "stargazers", "teams"]

    def test_currently_syncing_not_in_list(self):
        """Test if currently syncing is not available in `streams_to_sync` list, function returns sorted streams_to_sync list."""
        expected_list = ['assignees', 'collaborators', 'commits', 'issue_labels',
                         'pull_requests', 'releases', 'stargazers', 'teams']
        final_list = get_ordered_stream_list("issues", self.streams_to_sync)

        # Verify with expected ordered list of streams
        self.assertEqual(final_list, expected_list)

    def test_for_interrupted_sync(self):
        """Test when the sync was interrupted, the function returns ordered list of streams starting with 'currently_syncing' stream."""
        expected_list = ['releases', 'stargazers', 'teams', 'assignees', 'collaborators',
                         'commits', 'issue_labels', 'pull_requests']
        final_list = get_ordered_stream_list("releases", self.streams_to_sync)

        # Verify with expected ordered list of streams
        self.assertEqual(final_list, expected_list)

    def test_for_completed_sync(self):
        """Test when sync was not interrupted, the function returns sorted streams_to_sync list."""
        expected_list = ['assignees', 'collaborators', 'commits', 'issue_labels',
                         'pull_requests', 'releases', 'stargazers', 'teams']
        final_list = get_ordered_stream_list(None, self.streams_to_sync)

        # Verify with expected ordered list of streams
        self.assertEqual(final_list, expected_list)

class TestGetOrderedRepos(unittest.TestCase):

    """
    Test `get_ordered_repos` function to get ordered list repositories.
    """
    repo_list = ["org/repo1", "org/repo2", "org/repo3", "org/repo4", "org/repo5"]

    def test_for_interupted_sync(self):
        """Test when the sync was interrupted, the function returns ordered list of repositories starting with 'currently_syncing_repo'."""
        state = {"currently_syncing_repo": "org/repo3"}
        expected_list = ["org/repo3", "org/repo4", "org/repo5", "org/repo1", "org/repo2"]
        final_repo_list = get_ordered_repos(state, self.repo_list)

        # Verify with expected ordered list of repos
        self.assertEqual(final_repo_list, expected_list)

    def test_currently_syncing_repo_removed_from_config(self):
        """Test if currently syncing repo was removed from config."""
        state = {"currently_syncing_repo": "org/repo3"}
        repo_list = ["org/repo1", "org/repo2", "org/repo4", "org/repo5"]
        final_repo_list = get_ordered_repos(state, repo_list)

        # Verify with expected ordered list of repos
        self.assertEqual(final_repo_list, repo_list)

    def test_for_completed_sync(self):
        """Test when sync was not interrupted, the function returns repos list."""
        state = {}
        final_repo_list = get_ordered_repos(state, self.repo_list)

        # Verify with expected ordered list of repos
        self.assertEqual(final_repo_list, self.repo_list)

@mock.patch("tap_github.sync.update_currently_syncing")
class TestUpdateCurrentlySyncingRepo(unittest.TestCase):

    """
    Test `update_currently_syncing_repo` function of sync.
    """
    def test_adding_repo(self, mock_currently_syncing):
        """Test for adding currently syncing repo in state"""
        state = {"currently_syncing_repo": None}
        update_currently_syncing_repo(state, "org/test-repo")

        # Verify with expected state
        self.assertEqual(state, {"currently_syncing_repo": "org/test-repo"})

    def test_flush_completed_repo(self, mock_currently_syncing):
        """Test for removing currently syncing repo from state."""
        state = {"currently_syncing_repo": "org/test-repo"}
        update_currently_syncing_repo(state, None)

        # Verify with expected state
        self.assertEqual(state, {})

class TestUpdateCurrentlySyncing(unittest.TestCase):

    """
    Test `update_currently_syncing` function of sync.
    """
    def test_update_syncing_stream(self):
        """Test for adding currently syncing stream in state."""
        state = {"currently_syncing": "assignees"}
        update_currently_syncing(state, "issues")

        # Verify with expected state
        self.assertEqual(state, {"currently_syncing": "issues"})

    def test_flush_currently_syncing(self):
        """Test for removing currently syncing stream from state."""
        state = {"currently_syncing": "assignees"}
        update_currently_syncing(state, None)

        # Verify with expected state
        self.assertEqual(state, {})
