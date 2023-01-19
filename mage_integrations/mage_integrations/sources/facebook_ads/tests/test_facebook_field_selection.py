import os
from functools import reduce

from tap_tester import connections, menagerie, runner, LOGGER

from base import FacebookBaseTest


class FacebookFieldSelection(FacebookBaseTest):  # TODO use base.py, determine if test is needed

    @staticmethod
    def name():
        return "tap_tester_facebook_field_selection"

    @staticmethod
    def streams_to_test():
        return {
            'ads',
            'adcreative',
            'adsets',
            'campaigns',
            'ads_insights',
            'ads_insights_age_and_gender',
            'ads_insights_country',
            'ads_insights_platform_and_device',
            'ads_insights_region',
            'ads_insights_dma',
            "ads_insights_hourly_advertiser",
            #'leads',
        }

    @staticmethod
    def expected_pks():
        return {
            "ads" :                             {"id", "updated_time"},
            "adcreative" :                      {"id"},
            "adsets" :                          {"id", "updated_time"},
            "campaigns" :                       {"id"},
            "ads_insights" :                    {"campaign_id", "adset_id", "ad_id", "date_start"},
            "ads_insights_age_and_gender" :     {"campaign_id", "adset_id", "ad_id", "date_start", "age", "gender"},
            "ads_insights_country" :            {"campaign_id", "adset_id", "ad_id", "date_start", "country"},
            "ads_insights_platform_and_device": {"campaign_id", "adset_id", "ad_id", "date_start", "publisher_platform", "platform_position", "impression_device"},
            "ads_insights_region" :             {"campaign_id", "adset_id", "ad_id", "date_start"},
            "ads_insights_dma" :                {"campaign_id", "adset_id", "ad_id", "date_start"},
            "ads_insights_hourly_advertiser":   {"campaign_id", "adset_id", "ad_id", "date_start", "hourly_stats_aggregated_by_advertiser_time_zone"},
            #"leads" :                           {"id"},
        }

    def expected_automatic_fields(self):
        return_value = self.expected_pks()
        return_value["campaigns"].add("updated_time")
        return return_value

    def get_properties(self):  # pylint: disable=arguments-differ
        return {'start_date' : '2015-03-15T00:00:00Z',
                'account_id': os.getenv('TAP_FACEBOOK_ACCOUNT_ID'),
                'end_date': '2015-03-16T00:00:00+00:00',
                'insights_buffer_days': '1'
        }

    def test_run(self):

        expected_streams = self.streams_to_test()

        conn_id = connections.ensure_connection(self)

        # run in check mode
        check_job_name = runner.run_check_mode(self, conn_id)

        # verify check exit codes
        exit_status = menagerie.get_exit_status(conn_id, check_job_name)
        menagerie.verify_check_exit_status(self, exit_status, check_job_name)

        found_catalogs = menagerie.get_catalogs(conn_id)
        self.assertGreater(len(found_catalogs), 0, msg="unable to locate schemas for connection {}".format(conn_id))

        found_catalog_names = set(map(lambda c: c['tap_stream_id'], found_catalogs))

        diff = expected_streams.symmetric_difference( found_catalog_names )
        self.assertEqual(len(diff), 0, msg="discovered schemas do not match: {}".format(diff))
        LOGGER.info("discovered schemas are kosher")

        all_excluded_fields = {}
        # select all catalogs
        for c in found_catalogs:
            if c['stream_name'] == 'ads':
                continue

            discovered_schema = menagerie.get_annotated_schema(conn_id, c['stream_id'])['annotated-schema']
            all_excluded_fields[c['stream_name']] = list(set(discovered_schema.keys()) - self.expected_automatic_fields().get(c['stream_name'], set()))[:5]
            connections.select_catalog_and_fields_via_metadata(
                conn_id,
                c,
                discovered_schema,
                non_selected_fields=all_excluded_fields[c['stream_name']])

        # clear state
        menagerie.set_state(conn_id, {})

        sync_job_name = runner.run_sync_mode(self, conn_id)

        # verify tap and target exit codes
        exit_status = menagerie.get_exit_status(conn_id, sync_job_name)
        menagerie.verify_sync_exit_status(self, exit_status, sync_job_name)

        # This should be validating the the PKs are written in each record
        record_count_by_stream = runner.examine_target_output_file(self, conn_id, expected_streams, self.expected_pks())
        replicated_row_count =  reduce(lambda accum,c : accum + c, record_count_by_stream.values())
        self.assertGreater(replicated_row_count, 0, msg="failed to replicate any data: {}".format(record_count_by_stream))
        print("total replicated row count: {}".format(replicated_row_count))

        synced_records = runner.get_records_from_target_output()
        self.assertTrue('ads' not in synced_records.keys())
        for stream_name, data in synced_records.items():
            record_messages = [set(row['data'].keys()) for row in data['messages']]
            for record_keys in record_messages:
                # The intersection should be empty
                self.assertFalse(record_keys.intersection(all_excluded_fields[stream_name]))
