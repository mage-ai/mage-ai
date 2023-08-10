from math import ceil

from tap_tester import runner, connections

from base import TestGithubBase

class GitHubPaginationTest(TestGithubBase):

    @staticmethod
    def name():
        return "tap_tester_github_pagination_test"

    def get_properties(self, original: bool = True):
        return_value = {
            'start_date' : '2020-01-01T00:00:00Z',
            'repository': self.repository_name
        }
        if original:
            return return_value

        # Reassign start and end dates
        return_value["start_date"] = self.START_DATE
        return return_value

    def test_run(self):

        streams_to_test = self.expected_streams()

        # Pagination is not supported for "team_memberships" by Github API.
        # Skipping "teams" stream as it's RECORD count is <= 30.
        untestable_streams = {
            'team_memberships',
            'teams',
            'team_members',
            'collaborators',
            'assignees',
        }

        # For some streams RECORD count were not > 30 in same test-repo.
        # So, separated streams on the basis of RECORD count.
        self.repository_name = 'singer-io/tap-github'
        expected_stream_1 = {
            'comments',
            'stargazers',
            'commits',
            'pull_requests',
            'reviews',
            'review_comments',
            'pr_commits',
            'issues',
        }
        self.run_test(expected_stream_1)

        self.repository_name = 'singer-io/test-repo'
        expected_stream_2 = streams_to_test - expected_stream_1 - untestable_streams
        self.run_test(expected_stream_2)

    def run_test(self, streams):
        """
        • Verify that for each stream you can get multiple pages of data.
        This requires we ensure more than 1 page of data exists at all times for any given stream.
        • Verify by pks that the data replicated matches the data we expect.
        """

        # Page size for pagination supported streams
        page_size = 30
        conn_id = connections.ensure_connection(self)

        expected_streams = streams
        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # Table and field selection
        test_catalogs = [catalog for catalog in found_catalogs
                         if catalog.get('stream_name') in expected_streams]

        self.perform_and_verify_table_and_field_selection(conn_id, test_catalogs)

        record_count_by_stream = self.run_and_verify_sync(conn_id)

        synced_records = runner.get_records_from_target_output()

        # Verify no unexpected streams were replicated
        synced_stream_names = set(synced_records.keys())
        self.assertSetEqual(expected_streams, synced_stream_names)

        for stream in expected_streams:
            with self.subTest(stream=stream):
                # Expected values
                expected_primary_keys = self.expected_primary_keys()[stream]

                # Collect information for assertions from syncs 1 & 2 base on expected values
                record_count_sync = record_count_by_stream.get(stream, 0)
                primary_keys_list = [tuple(message.get('data').get(expected_pk)
                                           for expected_pk in expected_primary_keys)
                                     for message in synced_records.get(stream).get('messages')
                                     if message.get('action') == 'upsert']

                # Verify that for each stream you can get multiple pages of data
                self.assertGreater(record_count_sync, page_size,
                                   msg="The number of records is not over the stream max limit")

                # Chunk the replicated records (just primary keys) into expected pages
                pages = []
                page_count = ceil(len(primary_keys_list) / page_size)
                for page_index in range(page_count):
                    page_start = page_index * page_size
                    page_end = (page_index + 1) * page_size
                    pages.append(set(primary_keys_list[page_start:page_end]))

                # Verify by primary keys that data is unique for each page
                for current_index, current_page in enumerate(pages):
                    with self.subTest(current_page_primary_keys=current_page):

                        for other_index, other_page in enumerate(pages):
                            if current_index == other_index:
                                continue  # don't compare the page to itself

                            self.assertTrue(
                                current_page.isdisjoint(other_page), msg=f'other_page_primary_keys={other_page}'
                            )
