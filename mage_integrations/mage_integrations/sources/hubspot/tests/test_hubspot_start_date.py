import datetime

import tap_tester.connections as connections
import tap_tester.menagerie   as menagerie
import tap_tester.runner      as runner
from tap_tester import LOGGER

from base import HubspotBaseTest
from client import TestClient


STATIC_DATA_STREAMS = {'owners', 'campaigns'}

class TestHubspotStartDate(HubspotBaseTest):

    @staticmethod
    def name():
        return "tt_hubspot_start_date"

    def setUp(self):
        """
        Create 1 record for every stream under test, because we must guarantee that
        over time there will always be more records in the sync 1 time bin
        (of start_date_1 -> now) than there are in the sync 2 time bin (of start_date_2 -> now).
        """

        LOGGER.info("running streams with creates")
        streams_under_test = self.expected_streams() - {'email_events'} # we get this for free with subscription_changes
        self.my_start_date = self.get_properties()['start_date']
        self.test_client = TestClient(self.my_start_date)
        for stream in streams_under_test:
            if stream == 'contacts_by_company':
                companies_records = self.test_client.read('companies', since=self.my_start_date)
                company_ids = [company['companyId'] for company in companies_records]
                self.test_client.create(stream, company_ids)
            else:
                self.test_client.create(stream)

    def expected_streams(self):
        """
        If any streams cannot have data generated programmatically,
        hardcode start_dates for these streams and run the test twice.
        streams tested in TestHubspotStartDateStatic should be removed.
        """
        return self.expected_check_streams().difference({
            'owners', # static test data, covered in separate test
            'campaigns', # static test data, covered in separate test
        })


    def get_properties(self, original=True):
        utc_today = datetime.datetime.strftime(
            datetime.datetime.utcnow(), self.START_DATE_FORMAT
        )

        if original:
            return {
                'start_date' : self.timedelta_formatted(utc_today, days=-2)
            }
        else:
            return {
                'start_date': utc_today
            }

    def test_run(self):

        # SYNC 1
        conn_id = connections.ensure_connection(self)
        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # Select only the expected streams tables
        expected_streams = self.expected_streams()
        catalog_entries = [ce for ce in found_catalogs if ce['tap_stream_id'] in expected_streams]
        self.select_all_streams_and_fields(conn_id, catalog_entries)

        first_record_count_by_stream = self.run_and_verify_sync(conn_id)
        first_sync_records = runner.get_records_from_target_output()

        # SYNC 2
        conn_id = connections.ensure_connection(self, original_properties=False)
        found_catalogs = self.run_and_verify_check_mode(conn_id)
        catalog_entries = [ce for ce in found_catalogs if ce['tap_stream_id'] in expected_streams]
        self.select_all_streams_and_fields(conn_id, catalog_entries)
        second_record_count_by_stream = self.run_and_verify_sync(conn_id)
        second_sync_records = runner.get_records_from_target_output()

        # Test by stream
        for stream in self.expected_streams():
            with self.subTest(stream=stream):

                # gather expectations
                start_date_1 = self.get_properties()['start_date']
                start_date_2 = self.get_properties(original=False)['start_date']
                primary_keys = self.expected_primary_keys()[stream]
                replication_key = list(self.expected_replication_keys()[stream])

                # gather results
                first_sync_count = first_record_count_by_stream.get(stream, 0)
                second_sync_count = second_record_count_by_stream.get(stream, 0)
                first_sync_messages = first_sync_records.get(stream, {'messages': []}).get('messages')
                second_sync_messages = second_sync_records.get(stream, {'messages': []}).get('messages')
                first_sync_primary_keys = set(tuple([record['data'][pk] for pk in primary_keys])
                                              for record in first_sync_messages)
                second_sync_primary_keys = set(tuple([record['data'][pk] for pk in primary_keys])
                                               for record in second_sync_messages)

                if self.expected_metadata()[stream][self.OBEYS_START_DATE]:

                    # Verify sync 2 overlaps with sync 1
                    self.assertFalse(first_sync_primary_keys.isdisjoint(second_sync_primary_keys),
                                     msg='There should be a shared set of data from start date 2 through sync execution time.')

                    # Verify the second sync has less data
                    self.assertGreater(first_sync_count, second_sync_count)

                    # for incrmental streams we can compare records agains the start date
                    if replication_key and stream not in {'contacts', 'subscription_changes', 'email_events'}:  # BUG_TDL-9939

                        # BUG_TDL-9939 replication key is not listed correctly
                        if stream in {"campaigns", "companies", "contacts_by_company", "deal_pipelines", "deals"}:
                            # For deals stream, the replication key is already prefixed with 'property_'.
                            replication_key =  [replication_key[0]] if stream in ["deals", "companies"] else [f'property_{replication_key[0]}']
                            first_sync_replication_key_values = [record['data'][replication_key[0]]['value']
                                                                 for record in first_sync_messages]
                            second_sync_replication_key_values = [record['data'][replication_key[0]]['value']
                                                                  for record in second_sync_messages]
                        else:
                            first_sync_replication_key_values = [record['data'][replication_key[0]] for record in first_sync_messages]
                            second_sync_replication_key_values = [record['data'][replication_key[0]] for record in second_sync_messages]
                        formatted_start_date_1 = start_date_1.replace('Z', '.000000Z')
                        formatted_start_date_2 = start_date_2.replace('Z', '.000000Z')

                        # Verify the replication key values are greater than or equal to the start date
                        # for sync 1
                        for value in first_sync_replication_key_values:
                            self.assertGreaterEqual(value, formatted_start_date_1)
                        # and for sync 2
                        for value in second_sync_replication_key_values:
                            self.assertGreaterEqual(value, formatted_start_date_2)
                else:

                    # If Start date is not obeyed then verify the syncs are equal
                    self.assertEqual(first_sync_count, second_sync_count)
                    self.assertEqual(first_sync_primary_keys, second_sync_primary_keys)

                # Verify records are replicated for both syncs
                self.assertGreater(first_sync_count, 0,
                                   msg='start date usage is not confirmed when no records are replicated')
                self.assertGreater(second_sync_count, 0,
                                   msg='start date usage is not confirmed when no records are replicated')


class TestHubspotStartDateStatic(TestHubspotStartDate):
    @staticmethod
    def name():
        return "tt_hubspot_start_date_static"

    def expected_streams(self):
        """expected streams minus the streams not under test"""
        return {
            'owners',
            'campaigns',
        }

    def get_properties(self, original=True):
        utc_today = datetime.datetime.strftime(
            datetime.datetime.utcnow(), self.START_DATE_FORMAT
        )

        if original:
            return {'start_date' : '2017-11-22T00:00:00Z'}

        else:
            return {
                'start_date' : '2022-02-25T00:00:00Z'
            }

    def setUp(self):
        LOGGER.info("running streams with no creates")
