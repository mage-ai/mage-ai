from tap_tester import runner, connections
import os

from base import TestLinkedinAdsBase

class LinkedinAdsPaginationTest(TestLinkedinAdsBase):

    @staticmethod
    def name():
        return "tap_tester_linkedin_ads_pagination_test"

    def test_run(self):
        page_size = 1
        conn_id = connections.ensure_connection(self)

        # "ad_analytics_by_creative" and "ad_analytics_by_campaign" does not support pagination
        # Documentation: https://docs.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/ads-reporting?tabs=http
        expected_streams = self.expected_streams() - set({"ad_analytics_by_campaign", "ad_analytics_by_creative"})
        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # table and field selection
        test_catalogs = [catalog for catalog in found_catalogs
                                      if catalog.get('stream_name') in expected_streams]

        self.perform_and_verify_table_and_field_selection(conn_id, test_catalogs)

        record_count_by_stream = self.run_and_verify_sync(conn_id)

        synced_records = runner.get_records_from_target_output()

        for stream in expected_streams:
            with self.subTest(stream=stream):
                # expected values
                expected_primary_keys = self.expected_primary_keys()

                # collect information for assertions from sync based on expected values
                record_count_sync = record_count_by_stream.get(stream, 0)
                primary_keys_list = [(message.get('data').get(expected_pk) for expected_pk in expected_primary_keys)
                                       for message in synced_records.get(stream).get('messages')
                                       if message.get('action') == 'upsert']

                # verify records are more than page size so multiple page is working
                self.assertGreater(record_count_sync, page_size)

                if record_count_sync > page_size:
                    primary_keys_list_1 = primary_keys_list[:page_size]
                    primary_keys_list_2 = primary_keys_list[page_size:2*page_size]

                    primary_keys_page_1 = set(primary_keys_list_1)
                    primary_keys_page_2 = set(primary_keys_list_2)

                    # Verify by private keys that data is unique for page
                    self.assertTrue(primary_keys_page_1.isdisjoint(primary_keys_page_2))
