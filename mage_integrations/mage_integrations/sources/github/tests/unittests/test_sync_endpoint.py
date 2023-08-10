import unittest
from unittest import mock
from tap_github.client import GithubClient
from tap_github.streams import Commits, Events, Projects, PullRequests, StarGazers, Teams

class MockResponse():
    """Mock response object class."""
    def __init__(self, json_data):
        self.json_data = json_data
    
    def json(self):
        return self.json_data

@mock.patch("tap_github.streams.get_schema")
@mock.patch("tap_github.client.GithubClient.verify_access_for_repo", return_value = None)
@mock.patch("tap_github.client.GithubClient.authed_get_all_pages")
class TestSyncEndpoints(unittest.TestCase):

    config = {"access_token": "", "repository": "singer-io/tap-github"}
    catalog = {'schema': {}, "metadata": {}}

    @mock.patch("singer.write_record")
    def test_sync_without_state(self, mock_write_records, mock_authed_all_pages, mock_verify_access, mock_get_schema):
        """Verify that `write_records` is called for syncing stream endpoint."""

        test_stream = Events()
        mock_get_schema.return_value = self.catalog
        mock_authed_all_pages.return_value = [MockResponse([{"id": 1, "created_at": "2019-01-01T00:00:00Z"},
                                                           {"id": 2, "created_at": "2019-01-04T00:00:00Z"}]),
                                              MockResponse([{"id": 3, "created_at": "2019-01-03T00:00:00Z"},
                                                           {"id": 4, "created_at": "2019-01-02T00:00:00Z"}])]
        expected_state = {'bookmarks': {'tap-github': {'events': {'since': '2019-01-04T00:00:00Z'}}}}
        test_client = GithubClient(self.config)
        final_state = test_stream.sync_endpoint(test_client, {}, self.catalog, "tap-github", "2018-01-02T00:00:00Z", ["events"], ['events'])
        
        # Verify returned state deom `sync_endpoint`
        self.assertEqual(final_state, expected_state)

        # Verify `get_auth_all_pages` called with expected url
        mock_authed_all_pages.assert_called_with(mock.ANY, 'https://api.github.com/repos/tap-github/events', mock.ANY, stream='events')

        # Verify `write_records` call count
        self.assertEqual(mock_write_records.call_count, 4)

    @mock.patch("singer.write_record")
    def test_sync_with_state(self, mock_write_records, mock_authed_all_pages, mock_verify_access, mock_get_schema):
        """Verify that `write_records` is called for records with replication value greater than bookmark."""

        test_stream = Events()
        mock_get_schema.return_value = self.catalog
        mock_authed_all_pages.return_value = [MockResponse([{"id": 1, "created_at": "2019-01-01T00:00:00Z"},
                                                           {"id": 2, "created_at": "2019-01-04T00:00:00Z"}]),
                                              MockResponse([{"id": 3, "created_at": "2019-01-03T00:00:00Z"},
                                                           {"id": 4, "created_at": "2019-01-02T00:00:00Z"}])]
        mock_state = {'bookmarks': {'tap-github': {'events': {'since': '2019-01-02T00:00:00Z'}}}}
        
        expected_state = {'bookmarks': {'tap-github': {'events': {'since': '2019-01-04T00:00:00Z'}}}}
        test_client = GithubClient(self.config)
        final_state = test_stream.sync_endpoint(test_client, mock_state, self.catalog, "tap-github", "2018-01-02T00:00:00Z", ["events"], ['events'])
        
        # Verify returned state deom `sync_endpoint`
        self.assertEqual(final_state, expected_state)
        
        # Verify `write_records` call count
        self.assertEqual(mock_write_records.call_count, 3)
        
        # Verify `get_auth_all_pages` called with expected url
        mock_authed_all_pages.assert_called_with(mock.ANY, 'https://api.github.com/repos/tap-github/events', mock.ANY, stream='events')
        mock_write_records.assert_called_with(mock.ANY, {'id': 4, 'created_at': '2019-01-02T00:00:00Z', '_sdc_repository': 'tap-github'},time_extracted = mock.ANY)


@mock.patch("tap_github.streams.get_schema")
@mock.patch("tap_github.client.GithubClient.verify_access_for_repo", return_value = None)
@mock.patch("tap_github.client.GithubClient.authed_get_all_pages")
class TestFullTable(unittest.TestCase):
    """
    Test `sync_endpoint` for full table streams.
    """
    config = {"access_token": "", "repository": "singer-io/tap-github"}
    catalog = {"schema": {}, "metadata": {}}

    @mock.patch("tap_github.streams.Stream.get_child_records")
    def test_without_child_stream(self, mock_get_child_records, mock_authed_get_all_pages, mock_verify_access, mock_get_schema):
        """Verify that get_child_records() is not called for streams which do not have child streams"""

        test_client = GithubClient(self.config)
        test_stream = StarGazers()
        mock_get_schema.return_value = self.catalog
        mock_authed_get_all_pages.return_value = [MockResponse([{"user": {"id": 1}}, {"user": {"id": 2}}]),
                                            MockResponse([{"user": {"id": 4}}, {"user": {"id": 3}}])]
        test_stream.sync_endpoint(test_client, {}, self.catalog, "tap-github", "", ["stargazers"], ["stargazers"])

        # Verify that the authed_get_all_pages() is called with the expected url
        mock_authed_get_all_pages.assert_called_with(mock.ANY, "https://api.github.com/repos/tap-github/stargazers", mock.ANY, stream='stargazers')
        
        # Verify that the get_child_records() is not called as Stargazers doesn't have a child stream
        self.assertFalse(mock_get_child_records.called)

    @mock.patch("tap_github.streams.Stream.get_child_records")
    def test_with_child_streams(self,  mock_get_child_records, mock_authed_get_all_pages, mock_verify_access, mock_get_schema):
        """Verify that get_child_records() is called for streams with child streams"""

        test_client = GithubClient(self.config)
        test_stream = Teams()
        mock_get_schema.return_value = self.catalog

        mock_authed_get_all_pages.return_value = [MockResponse([{"id": 1, "slug": "s1"}, {"id": 2, "slug": "s2"}]),
                                            MockResponse([{"id": 3, "slug": "s3"}, {"id": 4, "slug": "s4"}])]

        test_stream.sync_endpoint(test_client, {}, self.catalog, "tap-github", "", ["teams", "team_members"], ["teams","team_members"])

        # Verify that the authed_get_all_pages() is called with the expected url
        mock_authed_get_all_pages.assert_called_with(mock.ANY, "https://api.github.com/orgs/tap-github/teams", mock.ANY, stream='teams')
        
        # Verify that the get_child_records() is called
        self.assertTrue(mock_get_child_records.called)

    def test_with_nested_child_streams(self, mock_authed_get_all_pages, mock_verify_access, mock_get_schema):
        """Verify that get_child_records() is called for streams with child streams and calls authed_get_all_pages() is called as expected"""

        test_client = GithubClient(self.config)
        test_stream = Teams()
        mock_get_schema.return_value = self.catalog

        mock_authed_get_all_pages.side_effect = [
                [MockResponse([{"id": 1, "slug": "stitch-dev"}])],
                [MockResponse([{"login": "log1"}, {"login": "log2"}])],
                [MockResponse({"url": "u1"})],
                [MockResponse({"url": "u3"})],
                [], []
            ]

        test_stream.sync_endpoint(test_client, {}, self.catalog, "tap-github", "", ["teams", "team_members", "team_memberships"], ["teams","team_members", "team_memberships"])

        # Verify that the authed_get_all_pages() is called expected number of times
        self.assertEqual(mock_authed_get_all_pages.call_count, 4)
        
        # Verify that the authed_get_all_pages() is called with the expected url
        exp_call_1 = mock.call(mock.ANY, "https://api.github.com/orgs/tap-github/teams", mock.ANY, stream='teams')
        exp_call_2 = mock.call(mock.ANY, "https://api.github.com/orgs/tap-github/teams/stitch-dev/members", stream='team_members')
        exp_call_3 = mock.call(mock.ANY, "https://api.github.com/orgs/tap-github/teams/stitch-dev/memberships/log1", stream='team_memberships')

        self.assertEqual(mock_authed_get_all_pages.mock_calls[0], exp_call_1)
        self.assertEqual(mock_authed_get_all_pages.mock_calls[1], exp_call_2)
        self.assertEqual(mock_authed_get_all_pages.mock_calls[2], exp_call_3)

@mock.patch("tap_github.streams.get_schema")
@mock.patch("tap_github.client.GithubClient.verify_access_for_repo", return_value = None)
@mock.patch("tap_github.client.GithubClient.authed_get_all_pages")
class TestIncrementalStream(unittest.TestCase):
    """
    Test `sync_endpoint` for incremental streams.
    """

    config = {"access_token": "", "repository": "singer-io/tap-github"}
    catalog = {"schema": {}, "metadata": {}}

    @mock.patch("tap_github.streams.Stream.get_child_records")
    def test_without_child_stream(self, mock_get_child_records, mock_authed_get_all_pages, mock_verify_access, mock_get_schema):
        """Verify that get_child_records() is not called for streams which do not have child streams"""
        test_client = GithubClient(self.config)
        test_stream = Commits()
        mock_get_schema.return_value = self.catalog
        mock_authed_get_all_pages.return_value = [MockResponse([{"commit": {"committer": {"date": "2022-07-05T09:42:14.000000Z"}}}, {"commit": {"committer": {"date": "2022-07-06T09:42:14.000000Z"}}}]),
                                            MockResponse([{"commit": {"committer": {"date": "2022-07-07T09:42:14.000000Z"}}}, {"commit": {"committer": {"date": "2022-07-08T09:42:14.000000Z"}}}])]
        test_stream.sync_endpoint(test_client, {}, self.catalog, "tap-github", "", ["commits"], ["commits"])

        # Verify that the authed_get_all_pages() is called with the expected url
        mock_authed_get_all_pages.assert_called_with(mock.ANY, "https://api.github.com/repos/tap-github/commits?since=", mock.ANY, stream='commits')
        
        # Verify that the get_child_records() is not called as Commits does not contain any child stream.
        self.assertFalse(mock_get_child_records.called)

    @mock.patch("tap_github.streams.Stream.get_child_records")
    def test_with_child_streams(self,  mock_get_child_records, mock_authed_get_all_pages, mock_verify_access, mock_get_schema):
        """Verify that get_child_records() is called for streams with child streams"""
        test_client = GithubClient(self.config)
        test_stream = Projects()
        mock_get_schema.return_value = self.catalog

        mock_authed_get_all_pages.return_value = [MockResponse([{"id": 1, "updated_at": "2022-07-05T09:42:14.000000Z"}, {"id": 1, "updated_at": "2022-07-06T09:42:14.000000Z"}]),
                                            MockResponse([{"id": 1, "updated_at": "2022-07-07T09:42:14.000000Z"}, {"id": 1, "updated_at": "2022-07-08T09:42:14.000000Z"}])]

        test_stream.sync_endpoint(test_client, {}, self.catalog, "tap-github", "", ["projects", "project_columns"], ["projects","project_columns"])

        # Verify that the authed_get_all_pages() is called with the expected url
        mock_authed_get_all_pages.assert_called_with(mock.ANY, "https://api.github.com/repos/tap-github/projects?state=all", mock.ANY, stream='projects')
        
        # Verify that the get_child_records() is called as thw Projects stream has a child stream
        self.assertTrue(mock_get_child_records.called)

    def test_with_nested_child_streams(self, mock_authed_get_all_pages, mock_verify_access, mock_get_schema):
        """Verify that get_child_records() is called for streams with child streams and calls authed_get_all_pages() is called as expected"""
        test_client = GithubClient(self.config)
        test_stream = Projects()
        mock_get_schema.return_value = self.catalog

        mock_authed_get_all_pages.side_effect = [
                [MockResponse([{"id": 1, "updated_at": "2022-07-05T09:42:14.000000Z"}])],
                [MockResponse([{"id": 1}, {"id": 2}])],
                [MockResponse({"id": 1})],
                [MockResponse({"id": 2})],
                [], []
            ]

        test_stream.sync_endpoint(test_client, {}, self.catalog, "tap-github", "", ["projects", "project_columns", "project_cards"], ["projects","project_columns", "project_cards"])

        # Verify that the authed_get_all_pages() is called expected number of times
        self.assertEqual(mock_authed_get_all_pages.call_count, 4)
        
        exp_call_1 = mock.call(mock.ANY, "https://api.github.com/repos/tap-github/projects?state=all", mock.ANY, stream='projects')
        exp_call_2 = mock.call(mock.ANY, "https://api.github.com/projects/1/columns", stream='project_columns')
        exp_call_3 = mock.call(mock.ANY, "https://api.github.com/projects/columns/1/cards", stream='project_cards')

        # Verify that the API calls are done as expected with the correct url
        self.assertEqual(mock_authed_get_all_pages.mock_calls[0], exp_call_1)
        self.assertEqual(mock_authed_get_all_pages.mock_calls[1], exp_call_2)
        self.assertEqual(mock_authed_get_all_pages.mock_calls[2], exp_call_3)

@mock.patch("tap_github.streams.get_schema")
@mock.patch("tap_github.client.GithubClient.verify_access_for_repo", return_value = None)
@mock.patch("tap_github.client.GithubClient.authed_get_all_pages")
@mock.patch("tap_github.streams.singer.utils.strptime_to_utc")
class TestIncrementalOrderedStream(unittest.TestCase):
    """
    Test `sync_endpoint` for incremental ordered streams.
    """
    config = {"access_token": "", "repository": "singer-io/tap-github"}
    catalog = {"schema": {}, "metadata": {}}

    @mock.patch("tap_github.streams.Stream.get_child_records")
    def test_without_child_stream(self, mock_get_child_records, mock_strptime_to_utc, mock_authed_get_all_pages, mock_verify_access, mock_get_schema):
        """Verify that get_child_records() is not called when child stream is not selected"""
        test_client = GithubClient(self.config)
        test_stream = PullRequests()
        mock_strptime_to_utc.side_effect = ["2022-07-05 09:42:14", "2022-07-04 09:42:14"]
        mock_get_schema.return_value = self.catalog
        mock_authed_get_all_pages.return_value = [MockResponse([{"id": 1, "updated_at": "2022-07-05 09:42:14"}, {"id": 2, "updated_at": "2022-07-06 09:42:14"}]),
                                                MockResponse([{"id": 3, "updated_at": "2022-07-07 09:42:14"}, {"id": 4, "updated_at": "2022-07-08 09:42:14"}])]
        test_stream.sync_endpoint(test_client, {}, self.catalog, "tap-github", "", ["pull_requests"], ["pull_requests"])

        # Verify that the authed_get_all_pages() is called with the expected url
        mock_authed_get_all_pages.assert_called_with(mock.ANY, "https://api.github.com/repos/tap-github/pulls?state=all&sort=updated&direction=desc", stream='pull_requests')


    @mock.patch("tap_github.streams.Stream.get_child_records")
    def test_with_child_streams(self, mock_get_child_records, mock_strptime_to_utc, mock_authed_get_all_pages, mock_verify_access, mock_get_schema):
        """Verify that get_child_records() is called for streams with child streams"""
        test_client = GithubClient(self.config)
        test_stream = PullRequests()
        mock_strptime_to_utc.side_effect = ["2022-07-05T09:42:14.000000Z", "2022-07-06T09:42:14.000000Z", "2022-07-05T09:42:14.000000Z", "2022-07-05T09:42:14.000000Z", "2022-07-05T09:42:14.000000Z"]
        mock_get_schema.return_value = self.catalog

        mock_authed_get_all_pages.return_value = [MockResponse([{"id": 1, "number": 1, "updated_at": "2022-07-05T09:42:14.000000Z"}, {"id": 1, "number": 1, "updated_at": "2022-07-06T09:42:14.000000Z"}]),
                                            MockResponse([{"id": 1, "number": 1, "updated_at": "2022-07-07T09:42:14.000000Z"}, {"id": 1, "number": 1, "updated_at": "2022-07-08T09:42:14.000000Z"}])]

        test_stream.sync_endpoint(test_client, {}, self.catalog, "tap-github", "", ["pull_requests", "review_comments"], ["pull_requests","review_comments"])

        # Verify that the authed_get_all_pages() is called with the expected url
        mock_authed_get_all_pages.assert_called_with(mock.ANY, "https://api.github.com/repos/tap-github/pulls?state=all&sort=updated&direction=desc", stream='pull_requests')
        
        # Verify that the get_child_records() is called as the PullRequests stream has a child stream
        self.assertTrue(mock_get_child_records.called)

    def test_with_nested_child_streams(self, mock_strptime_to_utc, mock_authed_get_all_pages, mock_verify_access, mock_get_schema):
        """Verify that get_child_records() is called for streams with child streams and calls authed_get_all_pages() is called as expected"""
        test_client = GithubClient(self.config)
        test_stream = PullRequests()
        mock_get_schema.return_value = self.catalog
        mock_strptime_to_utc.side_effect = ["2022-07-05T09:42:14.000000Z", "2022-07-06T09:42:14.000000Z", "2022-07-06T09:42:14.000000Z"]

        mock_authed_get_all_pages.side_effect = [
                [MockResponse([{"id": 1, "number": 1, "updated_at": "2022-07-05T09:42:14.000000Z"}])],
                [MockResponse([{"id": 1, "updated_at": "2022-07-06T09:42:14.000000Z"}, {"id": 2, "updated_at": "2022-07-06T09:42:14.000000Z"}])],
                [], []
            ]

        test_stream.sync_endpoint(test_client, {}, self.catalog, "tap-github", "", ["pull_requests", "review_comments"], ["pull_requests","review_comments"])

        # Verify that the authed_get_all_pages() is called expected number of times
        self.assertEqual(mock_authed_get_all_pages.call_count, 2)
        
        print(mock_authed_get_all_pages.mock_calls)
        exp_call_1 = mock.call(mock.ANY, "https://api.github.com/repos/tap-github/pulls?state=all&sort=updated&direction=desc", stream='pull_requests')
        exp_call_2 = mock.call(mock.ANY, "https://api.github.com/repos/tap-github/pulls/1/comments?sort=updated_at&direction=desc", stream='review_comments')

        # Verify that the API calls are done as expected with the correct url
        self.assertEqual(mock_authed_get_all_pages.mock_calls[0], exp_call_1)
        self.assertEqual(mock_authed_get_all_pages.mock_calls[1], exp_call_2)
