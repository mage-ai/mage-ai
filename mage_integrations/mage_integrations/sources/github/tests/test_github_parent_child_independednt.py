from tap_tester import runner, connections
from base import TestGithubBase

class GithubParentChildIndependentTest(TestGithubBase):

    def name(self):
        return "tap_tester_github_parent_child_test"

    def test_first_level_child_streams(self):
        """
            Test case to verify that tap is working fine if only first level child streams are selected
        """
        # Select first_level_child_streams only and run test
        first_level_child_streams = {"team_members", "project_columns", "reviews", "review_comments", "pr_commits"}
        self.run_test(first_level_child_streams)
    
    def test_second_level_child_streams(self):
        """
            Test case to verify that tap is working fine if only second level child streams are selected
        """
        # Select second_level_child_streams only and run test
        second_level_child_streams = {"team_memberships", "project_cards"}
        self.run_test(second_level_child_streams)
        
    def run_test(self, child_streams):
        """
            Testing that tap is working fine if only child streams are selected
            • Verify that if only child streams are selected then only child streams are replicated.
        """
        # Instantiate connection
        conn_id = connections.ensure_connection(self)

        # Run check mode
        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # Table and field selection
        test_catalogs = [catalog for catalog in found_catalogs
                         if catalog.get('stream_name') in child_streams]

        self.perform_and_verify_table_and_field_selection(conn_id, test_catalogs)

        # Run initial sync
        record_count_by_stream = self.run_and_verify_sync(conn_id)
        synced_records = runner.get_records_from_target_output()

        # Verify no unexpected streams were replicated
        synced_stream_names = set(synced_records.keys())
        self.assertSetEqual(child_streams, synced_stream_names)