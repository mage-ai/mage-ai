from tap_tester import connections
from base import TestLinkedinAdsBase

class LinkedinAdsSyncTest(TestLinkedinAdsBase):

    @staticmethod
    def name():
        return "tap_tester_linkedin_ads_sync_test"

    def test_run(self):
        """
        Testing that sync creates the appropriate catalog with valid metadata.
        Verify that all fields and all streams have selected set to True in the metadata
        """
        conn_id = connections.ensure_connection(self)

        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # removed "ad_analytics_by_campaign" and "ad_analytics_by_creative" as
        # it makes lots of api calls so sync canary test for these streams is covered in the start date test
        expected_streams = ['accounts','video_ads']
        test_catalogs = [catalog for catalog in found_catalogs
                                      if catalog.get('stream_name') in expected_streams]

        self.perform_and_verify_table_and_field_selection(conn_id, test_catalogs, non_selected_properties=['reference_organization_id'])
        
        record_count_by_stream = self.run_and_verify_sync(conn_id)

        # check if all streams have collected records
        for stream in expected_streams:
            self.assertGreater(record_count_by_stream.get(stream, 0), 0)