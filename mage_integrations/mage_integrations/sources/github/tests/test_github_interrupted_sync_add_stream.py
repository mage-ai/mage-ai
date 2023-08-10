from tap_tester import connections, runner, menagerie
from base import TestGithubBase


class TestGithubInterruptedSyncAddStream(TestGithubBase):
    """Test tap's ability to recover from an interrupted sync"""

    @staticmethod
    def name():
        return "tt_github_interrupted_sync_add_stream_test"

    def get_properties(self):
        """
        Maintain states for start_date and end_date
        """
        return {
            'start_date' : '2021-10-01T00:00:00Z',
            'repository': 'singer-io/test-repo singer-io/singer-python'
        }

    def test_run(self):
        """
        Testing that if a sync job is interrupted and state is saved with `currently_syncing`(stream) and `currently_syncing_repo`,
        the next sync job kicks off and the tap picks back up on that `currently_syncing` stream of `currently_syncing_repo`.
        - Verify behavior is consistent when an added stream is selected between initial and resuming sync
        """
        streams_to_test = {"issues", "stargazers", "pull_requests"}
        conn_id = connections.ensure_connection(self)
        expected_replication_methods = self.expected_replication_method()
        expected_replication_keys = self.expected_bookmark_keys()
        repo_key = "_sdc_repository"

        start_date = self.dt_to_ts(self.get_properties().get("start_date"), self.BOOKMARK_FORMAT)

        # Run a discovery job
        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # Partition catalogs for use in table/field selection
        test_catalogs = [catalog for catalog in found_catalogs
                           if catalog.get('stream_name') in streams_to_test]
        self.perform_and_verify_table_and_field_selection(conn_id, test_catalogs, select_all_fields=True)

        # Run a sync
        self.run_and_verify_sync(conn_id)

        # Acquire records from the target output
        full_sync_records = runner.get_records_from_target_output()
        full_sync_state = menagerie.get_state(conn_id)
        
        # Add a stream between syncs
        added_stream = 'issue_events'
        streams_to_test.add(added_stream)
        test_catalogs = [catalog for catalog in found_catalogs
                           if catalog.get('stream_name') in streams_to_test]
        # Add new stream to selected list
        self.perform_and_verify_table_and_field_selection(conn_id, test_catalogs, select_all_fields=True)

        # Set state in which all streams of one repo(singer-io/singer-python) have completed a sync.
        #   And one stream (pull_requests) of other repo(singer-io/test-repo) is syncing currently.

        interrupted_state = {
            "currently_syncing": "pull_requests",
            "currently_syncing_repo": "singer-io/test-repo",
            "bookmarks": {
                "singer-io/singer-python": {
                    "issues": {
                        "since": "2022-06-22T13:32:42Z"
                    },
                    "pull_requests": {
                        "since": "2022-06-22T13:32:42Z"
                    }
                },
                "singer-io/test-repo": {
                    "issues": {
                        "since": "2022-07-14T07:47:21Z"
                    },
                    "pull_requests": {
                        "since": "2022-07-13T07:47:21Z"
                    }
                }
            }
        }

        menagerie.set_state(conn_id, interrupted_state)

        # Run another sync
        self.run_and_verify_sync(conn_id)

        # acquire records from target output
        interrupted_sync_records = runner.get_records_from_target_output()
        final_state = menagerie.get_state(conn_id)
        currently_syncing = final_state.get('currently_syncing')

        # Checking resuming sync resulted in a successfully saved state
        with self.subTest():

            # Verify sync is not interrupted by checking currently_syncing in the state for sync
            self.assertIsNone(currently_syncing)

            # Verify bookmarks are saved
            self.assertIsNotNone(final_state.get('bookmarks'))

        for repository in self.get_properties().get("repository").split():
            with self.subTest(repository=repository):
            
                full_sync_bookmark = full_sync_state["bookmarks"][repository]
                final_bookmark = final_state["bookmarks"][repository]
                interrupted_repo_bookmark = interrupted_state["bookmarks"][repository]

                for stream in streams_to_test:
                    with self.subTest(stream=stream):
                        
                        # Expected values
                        expected_replication_method = expected_replication_methods[stream]

                        # Gather results
                        if stream != added_stream:
                            full_records = [message['data'] for message in
                                            full_sync_records.get(stream, {}).get('messages', []) 
                                            if message['data'][repo_key] == repository]
                            full_record_count = len(full_records)

                        interrupted_records = [message['data'] for message in
                                            interrupted_sync_records.get(stream, {}).get('messages', [])
                                            if message['data'][repo_key] == repository]
                        interrupted_record_count = len(interrupted_records)

                        if expected_replication_method == self.INCREMENTAL:
                            expected_replication_key = next(iter(expected_replication_keys[stream]))

                            if stream in full_sync_bookmark.keys():
                                full_sync_stream_bookmark = self.dt_to_ts(full_sync_bookmark.get(stream, {}).get("since"), self.BOOKMARK_FORMAT)
                                final_sync_stream_bookmark = self.dt_to_ts(final_bookmark.get(stream, {}).get("since"), self.BOOKMARK_FORMAT)
                                
                            if stream in interrupted_repo_bookmark.keys():
                                interrupted_bookmark = self.dt_to_ts(interrupted_repo_bookmark[stream]["since"], self.BOOKMARK_FORMAT)

                                for record in interrupted_records:
                                    rec_time = self.dt_to_ts(record[expected_replication_key], self.RECORD_REPLICATION_KEY_FORMAT)
                                    self.assertGreaterEqual(rec_time, interrupted_bookmark)

                            else:
                                # verify we collected records that have the same replication value as a bookmark for streams that are already synced
                                self.assertGreater(interrupted_record_count, 0)

                            if stream != added_stream:
                                
                                # Verify state ends with the same value for common streams after both full and interrupted syncs
                                self.assertEqual(full_sync_stream_bookmark, final_sync_stream_bookmark)
                                
                                for record in interrupted_records:

                                    # Verify all interrupted recs are in full recs
                                    self.assertIn(record, full_records,  msg='incremental table record in interrupted sync not found in full sync')

                                # Record count for all streams of interrupted sync match expectations
                                full_records_after_interrupted_bookmark = 0

                                for record in full_records:
                                    rec_time = self.dt_to_ts(record[expected_replication_key], self.RECORD_REPLICATION_KEY_FORMAT)
                                    self.assertGreater(rec_time, start_date, msg=f"{expected_replication_key} {stream} {repository} {record}")

                                    if (rec_time >= interrupted_bookmark):
                                        full_records_after_interrupted_bookmark += 1
                                        
                                self.assertGreaterEqual(full_records_after_interrupted_bookmark, interrupted_record_count, \
                                                    msg="Expected max {} records in each sync".format(full_records_after_interrupted_bookmark))

                        else:
                            # Verify full table streams do not save bookmarked values after a successful sync
                            self.assertNotIn(stream, full_sync_bookmark.keys())
                            self.assertNotIn(stream, final_bookmark.keys())

                            # Verify first and second sync have the same records
                            self.assertEqual(full_record_count, interrupted_record_count)
                            for rec in interrupted_records:
                                self.assertIn(rec, full_records, msg='full table record in interrupted sync not found in full sync')
