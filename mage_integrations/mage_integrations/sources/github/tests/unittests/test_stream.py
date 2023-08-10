import unittest
from unittest import mock
from tap_github.streams import Comments, ProjectColumns, Projects, Reviews, TeamMemberships, Teams, PullRequests, get_schema, get_child_full_url, get_bookmark
from parameterized import parameterized


class TestGetSchema(unittest.TestCase):
    """
    Test `get_schema` method of the stream class
    """

    def test_get_schema(self):
        """Verify function returns expected schema"""
        catalog = [
            {"tap_stream_id": "projects"},
            {"tap_stream_id": "comments"},
            {"tap_stream_id": "events"},
        ]
        expected_schema = {"tap_stream_id": "comments"}

        # Verify returned schema is same as exected schema 
        self.assertEqual(get_schema(catalog, "comments"), expected_schema)


class TestGetBookmark(unittest.TestCase):
    """
    Test `get_bookmark` method
    """

    test_stream = Comments()

    def test_with_out_repo_path(self):
        """
        Test if the state does not contain a repo path
        """
        state = {
            "bookmarks": {
                "projects": {"since": "2022-01-01T00:00:00Z"}
            }
        }
        returned_bookmark = get_bookmark(state, "org/test-repo", "projects", "since", "2021-01-01T00:00:00Z")
        self.assertEqual(returned_bookmark, "2021-01-01T00:00:00Z")

    def test_with_repo_path(self):
        """
        Test if the state does contains a repo path
        """
        state = {
            "bookmarks": {
                "org/test-repo": {
                    "projects": {"since": "2022-01-01T00:00:00Z"}
                }
            }
        }
        returned_bookmark = get_bookmark(state, "org/test-repo", "projects", "since", "2021-01-01T00:00:00Z")
        self.assertEqual(returned_bookmark, "2022-01-01T00:00:00Z")

class TestBuildUrl(unittest.TestCase):
    """
    Test the `build_url` method of the stream class
    """

    @parameterized.expand([
        ["test_stream_with_filter_params", "org/test-repo", "https://api.github.com/repos/org/test-repo/issues/comments?sort=updated&direction=desc?since=2022-01-01T00:00:00Z", Comments],
        ["test_stream_with_organization", "org", "https://api.github.com/orgs/org/teams", Teams]
    ])
    def test_build_url(self, name, param, expected_url, stream_class):
        """
        Test the `build_url` method for filter param or organization name only.
        """
        test_streams = stream_class()
        full_url = test_streams.build_url("https://api.github.com", param, "2022-01-01T00:00:00Z")

        # verify returned url is expected
        self.assertEqual(expected_url, full_url)


class GetMinBookmark(unittest.TestCase):
    """
    Test `get_min_bookmark` method of the stream class
    """

    start_date = "2020-04-01T00:00:00Z"
    state = {
        "bookmarks": {
            "org/test-repo": {
                "projects": {"since": "2022-03-29T00:00:00Z"},
                "project_columns": {"since": "2022-03-01T00:00:00Z"},
                "project_cards": {"since": "2022-03-14T00:00:00Z"},
                "pull_requests": {"since": "2022-04-01T00:00:00Z"},
                "review_comments": {"since": "2022-03-01T00:00:00Z"},
                "pr_commits": {"since": "2022-02-01T00:00:00Z"},
                "reviews": {"since": "2022-05-01T00:00:00Z"}
            }
        }
    }

    @parameterized.expand([
        ["test_multiple_children", PullRequests, "pull_requests", ["pull_requests","review_comments", "pr_commits"], "2022-04-01T00:00:00Z", "2022-02-01T00:00:00Z"],
        ["test_children_with_only_parent_selected", PullRequests, "pull_requests", ["pull_requests"], "2022-04-01T00:00:00Z", "2022-04-01T00:00:00Z"],
        ["test_for_mid_child_in_stream", Projects, "projects", ["projects", "project_columns"], "2022-03-29T00:00:00Z", "2022-03-01T00:00:00Z"],
        ["test_nested_child_bookmark", Projects, "projects", ["projects", "project_cards"], "2022-03-29T00:00:00Z", "2022-03-14T00:00:00Z"]
    ])
    def test_multiple_children(self, name, stream_class, stream_name, stream_to_sync, current_date, expected_bookmark):
        """
        Test that `get_min_bookmark` method returns the minimum bookmark from the parent and its corresponding child bookmarks. 
        """
        test_stream = stream_class()
        bookmark = test_stream.get_min_bookmark(stream_name, stream_to_sync,
                                     current_date, "org/test-repo", self.start_date, self.state)

        # Verify returned bookmark is expected
        self.assertEqual(bookmark, expected_bookmark)


@mock.patch("singer.write_bookmark")
class TestWriteBookmark(unittest.TestCase):
    """
    Test the `write_bookmarks` method of the stream class
    """

    state = {
        "bookmarks": {
            "org/test-repo": {
                "projects": {"since": "2021-03-29T00:00:00Z"},
                "project_columns": {"since": "2021-03-01T00:00:00Z"},
                "project_cards": {"since": "2021-03-14T00:00:00Z"},
                "pull_requests": {"since": "2021-04-01T00:00:00Z"},
                "review_comments": {"since": "2021-03-01T00:00:00Z"},
                "pr_commits": {"since": "2021-02-01T00:00:00Z"},
                "reviews": {"since": "2021-05-01T00:00:00Z"}
            }
        }
    }

    def test_multiple_child(self, mock_write_bookmark):
        """
        Test for a stream with multiple children is selected
        """
        test_stream = PullRequests()
        test_stream.write_bookmarks("pull_requests", ["pull_requests","review_comments", "pr_commits"],
                                     "2022-04-01T00:00:00Z", "org/test-repo", self.state)

        expected_calls = [
            mock.call(mock.ANY, mock.ANY, "pull_requests", {"since": "2022-04-01T00:00:00Z"}),
            mock.call(mock.ANY, mock.ANY, "pr_commits", {"since": "2022-04-01T00:00:00Z"}),
            mock.call(mock.ANY, mock.ANY, "review_comments", {"since": "2022-04-01T00:00:00Z"}),
        ]

        # Verify `write_bookmark` is called for all selected streams 
        self.assertEqual(mock_write_bookmark.call_count, 3)

        self.assertIn(mock_write_bookmark.mock_calls[0], expected_calls)
        self.assertIn(mock_write_bookmark.mock_calls[1], expected_calls)
        self.assertIn(mock_write_bookmark.mock_calls[2], expected_calls)

    def test_nested_child(self, mock_write_bookmark):
        """
        Test for the stream if the nested child is selected
        """
        test_stream = Projects()
        test_stream.write_bookmarks("projects", ["project_cards"],
                                     "2022-04-01T00:00:00Z", "org/test-repo", self.state)

        # Verify `write_bookmark` is called for all selected streams 
        self.assertEqual(mock_write_bookmark.call_count, 1)
        mock_write_bookmark.assert_called_with(mock.ANY, mock.ANY, 
                                               "project_cards", {"since": "2022-04-01T00:00:00Z"})


class TestGetChildUrl(unittest.TestCase):
    """
    Test `get_child_full_url` method of stream class
    """
    domain = 'https://api.github.com'

    @parameterized.expand([
        ["test_child_stream", ProjectColumns, "org1/test-repo", "https://api.github.com/projects/1309875/columns", None, (1309875,)],
        ["test_child_is_repository", Reviews, "org1/test-repo", "https://api.github.com/repos/org1/test-repo/pulls/11/reviews", (11,), None],
        ["test_child_is_organization", TeamMemberships, "org1", "https://api.github.com/orgs/org1/teams/dev-team/memberships/demo-user-1", ("dev-team",), ("demo-user-1",)]
    ])

    def test_child_stream(self, name, stream_class, param, expected_url, parent_id, grand_parent_id):
        """
        Test for a stream with one child
        """
        child_stream = stream_class()
        full_url = get_child_full_url(self.domain, child_stream, param, parent_id, grand_parent_id)
        self.assertEqual(expected_url, full_url)
