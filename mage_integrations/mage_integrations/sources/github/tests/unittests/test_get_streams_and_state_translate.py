import unittest
from tap_github.sync import get_selected_streams, translate_state, get_stream_to_sync
from parameterized import parameterized

def get_stream_catalog(stream_name, selected_in_metadata = False):
    """Return catalog for stream"""
    return {
                "schema":{},
                "tap_stream_id": stream_name,
                "key_properties": [],
                "metadata": [
                        {
                            "breadcrumb": [],
                            "metadata":{"selected": selected_in_metadata}
                        }
                    ]
            }

class TestTranslateState(unittest.TestCase):
    """
    Testcase for `translate_state` in sync
    """

    catalog = {
        "streams": [
            get_stream_catalog("comments"),
            get_stream_catalog("releases"),
            get_stream_catalog("issue_labels"),
            get_stream_catalog("issue_events")
        ]
    }

    def test_newer_format_state_with_repo_name(self):
        """Verify that `translate_state` return the state itself if a newer format bookmark is found."""
        state = {
            "bookmarks": {
                "org/test-repo" : {
                        "comments": {"since": "2019-01-01T00:00:00Z"}
                    },
                "org/test-repo2" : {}
            }
        }

        final_state = translate_state(state, self.catalog, ["org/test-repo", "org/test-repo2"])
        self.assertEqual(state, dict(final_state))

    def test_older_format_state_without_repo_name(self):
        """Verify that `translate_state` migrate each stream's bookmark into the repo name"""
        older_format_state = {
            "bookmarks": {
                "comments": {"since": "2019-01-01T00:00:00Z"}
            }
        }
        expected_state =  {
            "bookmarks": {
                "org/test-repo" : {
                        "comments": {"since": "2019-01-01T00:00:00Z"}
                    },
                "org/test-repo2" : {
                        "comments": {"since": "2019-01-01T00:00:00Z"}
                    }
            }
        }
        final_state = translate_state(older_format_state, self.catalog, ["org/test-repo", "org/test-repo2"])
        self.assertEqual(expected_state, dict(final_state))

    def test_with_empty_state(self):
        """Verify for empty state"""

        final_state = translate_state({}, self.catalog, ["org/test-repo"])

        self.assertEqual({}, dict(final_state))

    def test_state_with_no_previous_repo_name_newer_format_bookmark(self):
        """Verify that `translate_state` return the existing state if all existing repo unselected in the current sync."""
        newer_format_state = {
            "bookmarks": {
                "org/test-repo" : {
                        "comments": {"since": "2019-01-01T00:00:00Z"}
                    },
                "org/test-repo2" : {}
            }
        }
        final_state = translate_state(newer_format_state, self.catalog, ["org/test-repo3", "org/test-repo4"])
        self.assertEqual(newer_format_state, dict(final_state))

    def test_state_with_no_previous_repo_name_old_format_bookmark(self):
        """Verify that `translate_state` migrate each stream's bookmark into the repo name"""
        older_format_state = {
            "bookmarks": {
                "comments": {"since": "2019-01-01T00:00:00Z"}
            }
        }
        expected_state = {
            "bookmarks": {
                "org/test-repo3" : {
                        "comments": {"since": "2019-01-01T00:00:00Z"}
                    },
                "org/test-repo4" : {
                        "comments": {"since": "2019-01-01T00:00:00Z"}
                    }
            }
        }
        final_state = translate_state(older_format_state, self.catalog, ["org/test-repo3", "org/test-repo4"])
        self.assertEqual(expected_state, dict(final_state))

class TestGetStreamsToSync(unittest.TestCase):
    """
    Testcase for `get_stream_to_sync` in sync
    """

    def get_catalog(self, parent=False, mid_child = False, child = False):
        return {
            "streams": [
                get_stream_catalog("projects", selected_in_metadata=parent),
                get_stream_catalog("project_columns", selected_in_metadata=mid_child),
                get_stream_catalog("project_cards", selected_in_metadata=child),
                get_stream_catalog("teams", selected_in_metadata=parent),
                get_stream_catalog("team_members", selected_in_metadata=mid_child),
                get_stream_catalog("team_memberships", selected_in_metadata=child),
                get_stream_catalog("assignees", selected_in_metadata=parent),
            ]
        }

    @parameterized.expand([
        ['test_parent_selected', ["assignees", "projects", "teams"], True, False, False],
        ['test_mid_child_selected', ["projects", "project_columns", "teams", "team_members"], False, True, False],
        ['test_lowest_child_selected', ["projects", "project_columns", "project_cards", "teams", "team_members", "team_memberships"], False, False, True]
    ])
    def test_stream_selection(self, name, expected_streams, is_parent, is_mid_child, is_child):
        """Test that if an only child or mid-child is selected in the catalog, then `get_stream_to_sync` returns the parent stream also"""
        catalog = self.get_catalog(parent=is_parent, mid_child=is_mid_child, child=is_child)
        sync_streams = get_stream_to_sync(catalog)
        
        self.assertEqual(sync_streams, expected_streams)
