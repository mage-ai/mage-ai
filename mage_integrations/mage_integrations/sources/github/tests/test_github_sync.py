from tap_tester import connections
from base import TestGithubBase

class TestGithubSync(TestGithubBase):
    """Test tap sync mode and metadata conforms to standards."""

    @staticmethod
    def name():
        return "tap_tester_github_sync_test"

    def get_properties(self):

        return {
            'start_date' : '2021-10-01T00:00:00Z',
            'base_url': 'https://api.github.com',
            'repository': 'singer-io/test-repo'
        }

    def test_run(self):
        """
        Testing that sync creates the appropriate catalog with valid metadata.
        Verify that all fields and all streams have selected set to True in the metadata
        """
        conn_id = connections.ensure_connection(self)

        found_catalogs = self.run_and_verify_check_mode(conn_id)

        self.perform_and_verify_table_and_field_selection(conn_id,found_catalogs)

        record_count_by_stream = self.run_and_verify_sync(conn_id)

        self.assertGreater(sum(record_count_by_stream.values()), 0)
