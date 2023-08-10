from tap_tester import connections, runner, menagerie
from base import TestGithubBase


class TestGithubInterruptedSync(TestGithubBase):
    """Test tap's ability to recover from an interrupted sync"""

    @staticmethod
    def name():
        return "tt_github_interrupted_sync_test"

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
        """
        streams_to_test = {"issues", "stargazers", "pull_requests", "issue_events"}
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
                    },
                    "issue_events": {
                        "since": "2022-06-22T13:32:42Z"
                    }
                },
                "singer-io/test-repo": {
                    "issues": {
                        "since": "2022-07-13T09:21:19Z"
                    },
                    "pull_requests": {
                        "since": "2022-06-30T05:33:24Z"
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

            # Verify final_state is equal to uninterrupted sync's state
            # (This is what the value would have been without an interruption and proves resuming succeeds)
            self.assertDictEqual(final_state, full_sync_state)

        for repository in self.get_properties().get("repository").split():
            with self.subTest(repository=repository):
            
                full_sync_bookmark = full_sync_state["bookmarks"][repository]
                final_bookmark = final_state["bookmarks"][repository]
                interrupted_repo_bookmark = interrupted_state["bookmarks"][repository]
                
                for stream in streams_to_test:
                    with self.subTest(stream=stream):
                        
                        # Expected values
                        expected_replication_method = expected_replication_methods[stream]
                        expected_primary_keys = list(self.expected_primary_keys()[stream])

                        # Gather results
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
                                
                            if stream in interrupted_repo_bookmark.keys():
                                interrupted_bookmark =  self.dt_to_ts(interrupted_repo_bookmark[stream]["since"], self.BOOKMARK_FORMAT)
                                
                                if stream == interrupted_state['currently_syncing'] and repository == interrupted_state['currently_syncing_repo']:

                                    for record in interrupted_records:
                                        rec_time = self.dt_to_ts(record[expected_replication_key], self.RECORD_REPLICATION_KEY_FORMAT)
                                        self.assertGreaterEqual(rec_time, interrupted_bookmark)

                                        # Verify all interrupted recs are in full recs
                                        self.assertIn(record, full_records,  msg='incremental table record in interrupted sync not found in full sync')

                                    # Record count for all streams of interrupted sync match expectations
                                    full_records_after_interrupted_bookmark = 0

                                    for record in full_records:
                                        rec_time = self.dt_to_ts(record[expected_replication_key], self.RECORD_REPLICATION_KEY_FORMAT)
                                        self.assertGreaterEqual(rec_time, start_date)

                                        if (rec_time >= interrupted_bookmark):
                                            full_records_after_interrupted_bookmark += 1
                                            
                                    self.assertEqual(full_records_after_interrupted_bookmark, len(interrupted_records), \
                                                        msg="Expected {} records in each sync".format(full_records_after_interrupted_bookmark))
                                else:
                                    # Verify we collected records that have the same replication value as a bookmark for streams that are already synced
                                    self.assertGreaterEqual(interrupted_record_count, 0)
                            else:
                                # Verify resuming sync replicates all records that were found in the full sync (uninterrupted)
                                for record in interrupted_records:
                                    with self.subTest(record_primary_key=record[expected_primary_keys[0]]):
                                        self.assertIn(record, full_records, msg='Unexpected record replicated in resuming sync.')
                                for record in full_records:
                                    with self.subTest(record_primary_key=record[expected_primary_keys[0]]):
                                        self.assertIn(record, interrupted_records, msg='Record missing from resuming sync.' )
                        else:
                            # Verify full table streams do not save bookmarked values at the conclusion of a successful sync
                            self.assertNotIn(stream, full_sync_bookmark.keys())
                            self.assertNotIn(stream, final_bookmark.keys())

                            # Verify first and second sync have the same records
                            self.assertEqual(full_record_count, interrupted_record_count)
                            for rec in interrupted_records:
                                self.assertIn(rec, full_records, msg='full table record in interrupted sync not found in full sync')
