import os

from tap_tester import runner, connections, menagerie

from base import TestGithubBase

# As we are not able to generate the following fields by Github UI, so removed them from the expectation list.
KNOWN_MISSING_FIELDS = {
    'events': {
        'ref',
        'head',
        'push_id',
        'distinct_size',
        'size'
    },
    'project_cards': {
        'name',
        'cards_url',
        'column_name',
        'project_id'
    },
    'commits': {
        'files',
        'pr_id',
        'id',
        'pr_number',
        'stats',
    },
    'pr_commits': {
        'files',
        'stats'
    },
    'review_comments': {
        'assignees',
        'commits_url',
        'diff_url',
        'head',
        'review_comments_url',
        'comments_url',
        'issue_url',
        'assignee',
        'requested_teams',
        'patch_url',
        'milestone',
        'review_comment_url',
        'statuses_url',
        'requested_reviewers',
        'labels',
        'base',
        'merge_commit_sha',
        'locked',
        'body_text',
        'body_html'
    },
    'comments': {
        'home_url',
        'body_text',
        'body_html'
    },
    'team_members': {
        'email',
        'starred_at',
        'name',
    },
    'issues': {
        'body_text',
        'closed_by',
        'body_html'
    },
    'releases': {
        'discussion_url',
        'body_html',
        'body_text',
        'mentions_count',
        'reactions'
    },
    'collaborators': {
        'email',
        'name'
    },
    'reviews': {
        'body_text',
        'body_html'
    },
    'teams': {
        'permissions'
    },
    'projects': {
        'organization_permission',
        'private'
    },
    'assignees': {
        'email',
        'starred_at',
        'name'
    },
    'pull_requests': {
        'issues_url'
    },
    'issue_events': {
        'dismissed_review',
        'requested_team',
        'author_association',
        'draft'
    },
}

class TestGithubAllFields(TestGithubBase):
    """Test that with all fields selected for a stream automatic and available fields are  replicated"""

    @staticmethod
    def name():
        return "tap_tester_github_all_fields"

    def test_run(self):
        """
        • Verify no unexpected streams were replicated
        • Verify that more than just the automatic fields are replicated for each stream. 
        • Verify all fields for each stream are replicated
        """

        expected_streams = self.expected_streams()
        # Instantiate connection
        conn_id = connections.ensure_connection(self)

        # Run check mode
        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # Table and field selection
        test_catalogs_all_fields = [catalog for catalog in found_catalogs
                                    if catalog.get('stream_name') in expected_streams]
        self.perform_and_verify_table_and_field_selection(
            conn_id, test_catalogs_all_fields, select_all_fields=True,
        )

        # Grab metadata after performing table-and-field selection to set expectations
        stream_to_all_catalog_fields = dict() # used for asserting all fields are replicated
        for catalog in test_catalogs_all_fields:
            stream_id, stream_name = catalog['stream_id'], catalog['stream_name']
            catalog_entry = menagerie.get_annotated_schema(conn_id, stream_id)
            fields_from_field_level_md = [md_entry['breadcrumb'][1]
                                          for md_entry in catalog_entry['metadata']
                                          if md_entry['breadcrumb'] != []]
            stream_to_all_catalog_fields[stream_name] = set(fields_from_field_level_md)

        # Run initial sync
        record_count_by_stream = self.run_and_verify_sync(conn_id)
        synced_records = runner.get_records_from_target_output()

        # Verify no unexpected streams were replicated
        synced_stream_names = set(synced_records.keys())
        self.assertSetEqual(expected_streams, synced_stream_names)

        for stream in expected_streams:
            with self.subTest(stream=stream):
                # Expected values
                expected_automatic_keys = self.expected_automatic_keys().get(stream)

                # Get all expected keys
                expected_all_keys = stream_to_all_catalog_fields[stream]

                messages = synced_records.get(stream)
                # Collect actual values
                actual_all_keys = set()
                for message in messages['messages']:
                    if message['action'] == 'upsert':
                        actual_all_keys.update(message['data'].keys())
                    
                expected_all_keys = expected_all_keys - KNOWN_MISSING_FIELDS.get(stream, set())

                # Verify all fields for a stream were replicated
                self.assertGreater(len(expected_all_keys), len(expected_automatic_keys))
                self.assertTrue(expected_automatic_keys.issubset(expected_all_keys), msg=f'{expected_automatic_keys-expected_all_keys} is not in "expected_all_keys"')
                self.assertSetEqual(expected_all_keys, actual_all_keys)
