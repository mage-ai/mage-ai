from datetime import datetime, timedelta
from time import sleep


import tap_tester.connections as connections
import tap_tester.menagerie   as menagerie
import tap_tester.runner      as runner

from base import HubspotBaseTest
from client import TestClient


STREAMS_WITHOUT_UPDATES = {'email_events', 'contacts_by_company', 'workflows'}
STREAMS_WITHOUT_CREATES = {'campaigns', 'owners'}


class TestHubspotBookmarks(HubspotBaseTest):
    """Ensure tap replicates new and upated records based on the replication method of a given stream.

    Create records for each stream. Run check mode, perform table and field selection, and run a sync.
    Create 1 record for each stream and update 1 record for each stream prior to running a  2nd sync.
     - Verify for each incremental stream you can do a sync which records bookmarks, and that the format matches expectations.
     - Verify that a bookmark doesn't exist for full table streams.
     - Verify the bookmark is the max value sent to the target for the a given replication key.
     - Verify 2nd sync respects the bookmark.
    """
    @staticmethod
    def name():
        return "tt_hubspot_bookmarks"

    def streams_to_test(self):
        """expected streams minus the streams not under test"""

        expected_streams = self.expected_streams().difference(STREAMS_WITHOUT_CREATES)

        return expected_streams.difference({
            'subscription_changes', # BUG_TDL-14938 https://jira.talendforge.org/browse/TDL-14938
        })

    def get_properties(self):
        return {
            'start_date' : datetime.strftime(datetime.today()-timedelta(days=3), self.START_DATE_FORMAT),
        }

    def setUp(self):
        self.maxDiff = None  # see all output in failure

        self.test_client = TestClient(self.get_properties()['start_date'])

    def create_test_data(self, expected_streams):

        self.expected_records = {stream: []
                                 for stream in expected_streams}

        for stream in expected_streams - {'contacts_by_company'}:
            if stream == 'email_events':
                email_records = self.test_client.create(stream, times=3)
                self.expected_records['email_events'] += email_records
            else:
                # create records, one will be updated between syncs
                for _ in range(3):
                    record = self.test_client.create(stream)
                    self.expected_records[stream] += record

        if 'contacts_by_company' in expected_streams:  # do last
            company_ids = [record['companyId'] for record in self.expected_records['companies']]
            contact_records = self.expected_records['contacts']
            for i in range(3):
                record = self.test_client.create_contacts_by_company(
                    company_ids=company_ids, contact_records=contact_records
                )
                self.expected_records['contacts_by_company'] += record

    def test_run(self):
        expected_streams = self.streams_to_test()

        # generate 3 records for every stream that has a create endpoint
        create_streams = expected_streams - STREAMS_WITHOUT_CREATES
        self.create_test_data(create_streams)

        conn_id = connections.ensure_connection(self)

        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # Select only the expected streams tables
        catalog_entries = [ce for ce in found_catalogs if ce['tap_stream_id'] in expected_streams]
        for catalog_entry in catalog_entries:
            stream_schema = menagerie.get_annotated_schema(conn_id, catalog_entry['stream_id'])
            connections.select_catalog_and_fields_via_metadata(
                conn_id,
                catalog_entry,
                stream_schema
            )

        # Run sync 1
        first_record_count_by_stream = self.run_and_verify_sync(conn_id)
        synced_records = runner.get_records_from_target_output()
        state_1 = menagerie.get_state(conn_id)

        # Create 1 record for each stream between syncs
        for stream in expected_streams - {'contacts_by_company'}:
            record = self.test_client.create(stream)
            self.expected_records[stream] += record
        if 'contacts_by_company' in expected_streams:
            company_ids = [record['companyId'] for record in self.expected_records['companies'][:-1]]
            contact_records = self.expected_records['contacts'][-1:]
            record = self.test_client.create_contacts_by_company(
                company_ids=company_ids, contact_records=contact_records
            )
            self.expected_records['contacts_by_company'] += record


        # Update 1 record from the test seutp for each stream that has an update endpoint
        for stream in expected_streams - STREAMS_WITHOUT_UPDATES:
            primary_key = list(self.expected_primary_keys()[stream])[0]
            record_id = self.expected_records[stream][0][primary_key]
            record = self.test_client.update(stream, record_id)
            self.expected_records[stream].append(record)

        #run second sync
        second_record_count_by_stream = self.run_and_verify_sync(conn_id)
        synced_records_2 = runner.get_records_from_target_output()
        state_2 = menagerie.get_state(conn_id)

        # Test by Stream
        for stream in expected_streams:

            with self.subTest(stream=stream):

                # gather expected values
                replication_method = self.expected_replication_method()[stream]
                primary_keys = self.expected_primary_keys()[stream]

                # setting expected records for sync 1 based on the unsorted list of record
                # which does not inclue the created record between syncs 1 and 2
                expected_records_1 = self.expected_records[stream][:3]

                # gather replicated records
                actual_record_count_2 = second_record_count_by_stream[stream]
                actual_records_2 = [message['data']
                                    for message in synced_records_2[stream]['messages']
                                    if message['action'] == 'upsert']
                actual_record_count_1 = first_record_count_by_stream[stream]
                actual_records_1 = [message['data']
                                    for message in synced_records[stream]['messages']
                                    if message['action'] == 'upsert']

                if self.is_child(stream): # we will set expectations for child streeams based on the parent

                    parent_stream = self.expected_metadata()[stream][self.PARENT_STREAM]
                    parent_replication_method = self.expected_replication_method()[parent_stream]

                    if parent_replication_method == self.INCREMENTAL:

                        expected_record_count = 1 if stream not in STREAMS_WITHOUT_UPDATES else 2
                        expected_records_2 = self.expected_records[stream][-expected_record_count:]

                        # verify the record count matches our expectations for a child streams with incremental parents
                        self.assertGreater(actual_record_count_1, actual_record_count_2)

                    elif parent_replication_method == self.FULL:

                        # verify the record count matches our expectations for child streams with full table parents
                        expected_records_2 = self.expected_records[stream]
                        self.assertEqual(actual_record_count_1 + 1, actual_record_count_2)

                    else:
                        raise AssertionError(f"Replication method is {replication_method} for stream: {stream}")


                elif replication_method == self.INCREMENTAL:

                    # NB: FOR INCREMENTAL STREAMS the tap does not replicate the replication-key for any records.
                    #     It does functionaly replicate as a standard incremental sync would but does not order
                    #     records by replication-key value (since it does not exist on the record). To get around
                    #     this we are putting the replication-keys on our expected records via test_client. We will
                    #     verify the records we expect (via primary-key) are replicated prior to checking the
                    #     replication-key values.

                    # get saved states
                    stream_replication_key = list(self.expected_replication_keys()[stream])[0]
                    bookmark_1 = state_1['bookmarks'][stream][stream_replication_key]
                    bookmark_2 = state_2['bookmarks'][stream][stream_replication_key]

                    # setting expected records  knowing they are ordered by replication-key value
                    expected_record_count = 1 if stream not in STREAMS_WITHOUT_UPDATES else 2
                    expected_records_2 = self.expected_records[stream][-expected_record_count:]

                    # Given streams does not contain proper replication-key value in the response.
                    if stream not in {"companies","deals","contacts_by_company","email_events"}:
                        # verify first sync bookmark value is max bookmark value
                        for record in actual_records_1:
                            replication_key_value = record.get(stream_replication_key)
                            self.assertLessEqual(replication_key_value,bookmark_1,
                                                msg="First sync bookmark was incorrect, A record with greater replication-key value was found.")

                        # verify second sync bookmark value is max bookmark value
                        for record in actual_records_2:
                            replication_key_value = record.get(stream_replication_key)
                            self.assertLessEqual(replication_key_value,bookmark_2,
                                                msg="Second sync bookmark was incorrect, A record with greater replication-key value was found.")

                    # verify only the new and updated records are captured  checking record countx
                    self.assertGreater(actual_record_count_1, actual_record_count_2)

                    # verify the state was updated with incremented bookmark
                    if stream != 'email_events':  # BUG TDL-15706
                        self.assertGreater(bookmark_2, bookmark_1)

                elif replication_method == self.FULL:
                    expected_records_2 = self.expected_records[stream]
                    self.assertEqual(actual_record_count_1 + 1, actual_record_count_2)

                else:
                    raise AssertionError(f"Replication method is {replication_method} for stream: {stream}")

                # verify by primary key that all expected records are replicated in sync 1
                sync_1_pks = [tuple([record[pk] for pk in primary_keys]) for record in actual_records_1]
                expected_sync_1_pks = [tuple([record[pk] for pk in primary_keys])
                                       for record in expected_records_1]
                for expected_pk in expected_sync_1_pks:
                    self.assertIn(expected_pk, sync_1_pks)

                # verify by primary key that all expected records are replicated in sync 2
                sync_2_pks = sorted([tuple([record[pk] for pk in primary_keys]) for record in actual_records_2])
                expected_sync_2_pks = sorted([tuple([record[pk] for pk in primary_keys])
                                              for record in expected_records_2])
                for expected_pk in expected_sync_2_pks:
                    self.assertIn(expected_pk, sync_2_pks)

                # verify that at least 1 record from the first sync is replicated in the 2nd sync
                # to prove that the bookmarking is inclusive
                if stream in {'companies', # BUG | https://jira.talendforge.org/browse/TDL-15503
                              'email_events'}: # BUG | https://jira.talendforge.org/browse/TDL-15706
                    continue  # skipping failures
                self.assertTrue(any([expected_pk in sync_2_pks for expected_pk in expected_sync_1_pks]))
