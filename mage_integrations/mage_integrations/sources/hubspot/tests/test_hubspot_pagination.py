from datetime import datetime
from datetime import timedelta
import time

import tap_tester.connections as connections
import tap_tester.menagerie   as menagerie
import tap_tester.runner      as runner
from tap_tester.logger import LOGGER

from client import TestClient
from base import HubspotBaseTest


class TestHubspotPagination(HubspotBaseTest):

    @staticmethod
    def name():
        return "tt_hubspot_pagination"

    def get_properties(self):
        return {
            'start_date' : datetime.strftime(datetime.today()-timedelta(days=7), self.START_DATE_FORMAT)
        }

    def setUp(self):
        self.maxDiff = None  # see all output in failure

        # initialize the test client
        setup_start = time.perf_counter()
        test_client = TestClient(self.get_properties()['start_date'])

        # gather expectations
        existing_records = dict()
        limits = self.expected_page_limits()
        streams = self.streams_to_test()

        # order the creation of test data for streams based on the streams under test
        # this is necessary for child streams and streams that share underlying data in hubspot
        if 'subscription_changes' in streams and 'email_events' in streams:
            streams.remove('email_events') # we get this for free with subscription_changes
        stream_to_run_last = 'contacts_by_company' # child stream depends on companyIds, must go last
        if stream_to_run_last in streams:
            streams.remove(stream_to_run_last)
            streams = list(streams)
            streams.append(stream_to_run_last)

        # generate test data if necessary, one stream at a time
        for stream in streams:

            # Get all records
            if stream == 'contacts_by_company':
                company_ids = [company['companyId'] for company in existing_records['companies']]
                existing_records[stream] = test_client.read(stream, parent_ids=company_ids)
            elif stream in {'companies', 'contact_lists', 'subscription_changes', 'engagements', 'email_events'}:
                existing_records[stream] = test_client.read(stream)
            else:
                existing_records[stream] = test_client.read(stream)

            # check if we exceed the pagination limit
            LOGGER.info(f"Pagination limit set to - {limits[stream]} and total number of existing record - {len(existing_records[stream])}")
            under_target = limits[stream] + 1 - len(existing_records[stream])
            LOGGER.info(f'under_target = {under_target} for {stream}')

            # if we do not exceed the limit generate more data so that we do
            if under_target > 0 :
                LOGGER.info(f"need to make {under_target} records for {stream} stream")
                if stream in {'subscription_changes', 'emails_events'}:
                    test_client.create(stream, subscriptions=existing_records[stream], times=under_target)
                elif stream == 'contacts_by_company':
                    test_client.create(stream, company_ids, times=under_target)
                else:
                    for i in range(under_target):
                        # create records to exceed limit
                        test_client.create(stream)

        setup_end = time.perf_counter()
        LOGGER.info(f"Test Client took about {str(setup_end-setup_start).split('.')[0]} seconds")

    def streams_to_test(self):
        """
        All streams with limits are under test
        """
        streams_with_page_limits =  {
            stream
            for stream, limit in self.expected_page_limits().items()
            if limit
        }
        streams_to_test = streams_with_page_limits.difference({
            # updates for contacts_by_company do not get processed quickly or consistently
            # via Hubspot API, unable to guarantee page limit is exceeded
            'contacts_by_company',
            'email_events',
            'subscription_changes', # BUG_TDL-14938 https://jira.talendforge.org/browse/TDL-14938
        })

        return streams_to_test

    def test_run(self):
        # Select only the expected streams tables
        expected_streams = self.streams_to_test()
        conn_id = connections.ensure_connection(self)
        found_catalogs = self.run_and_verify_check_mode(conn_id)

        catalog_entries = [ce for ce in found_catalogs if ce['tap_stream_id'] in expected_streams]
        for catalog_entry in catalog_entries:
            stream_schema = menagerie.get_annotated_schema(conn_id, catalog_entry['stream_id'])
            connections.select_catalog_and_fields_via_metadata(
                conn_id,
                catalog_entry,
                stream_schema
            )

        sync_record_count = self.run_and_verify_sync(conn_id)
        sync_records = runner.get_records_from_target_output()


        # Test by stream
        for stream in expected_streams:
            with self.subTest(stream=stream):

                record_count = sync_record_count.get(stream, 0)

                sync_messages = sync_records.get(stream, {'messages': []}).get('messages')

                primary_keys = self.expected_primary_keys().get(stream)

                # Verify the sync meets or exceeds the default record count
                stream_page_size = self.expected_page_limits()[stream]
                self.assertLess(stream_page_size, record_count)

                # Verify we did not duplicate any records across pages
                records_pks_set = {tuple([message.get('data').get(primary_key)
                                          for primary_key in primary_keys])
                                   for message in sync_messages}
                records_pks_list = [tuple([message.get('data').get(primary_key)
                                           for primary_key in primary_keys])
                                    for message in sync_messages]
                # records_pks_list = [message.get('data').get(primary_key) for message in sync_messages]
                self.assertCountEqual(records_pks_set, records_pks_list,
                                      msg=f"We have duplicate records for {stream}")
