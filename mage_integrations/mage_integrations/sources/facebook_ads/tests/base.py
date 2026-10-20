"""
Setup expectations for test sub classes
Run discovery for as a prerequisite for most tests
"""
import os
from datetime import timedelta
from datetime import datetime as dt

from tap_tester import connections, menagerie, runner, LOGGER
from tap_tester.base_case import BaseCase


class FacebookBaseTest(BaseCase):
    """
    Setup expectations for test sub classes.
    Metadata describing streams.

    A bunch of shared methods that are used in tap-tester tests.
    Shared tap-specific methods (as needed).

    Insights Test Data by Date Ranges
        "ads_insights":
          "2019-08-02T00:00:00.000000Z" -> "2019-10-30T00:00:00.000000Z"
          "2021-04-07T00:00:00.000000Z" -> "2021-04-08T00:00:00.000000Z"
        "ads_insights_age_and_gender":
          "2019-08-02T00:00:00.000000Z" -> "2019-10-30T00:00:00.000000Z"
          "2021-04-07T00:00:00.000000Z" -> "2021-04-08T00:00:00.000000Z"
        "ads_insights_country":
          "2019-08-02T00:00:00.000000Z" -> "2019-10-30T00:00:00.000000Z"
          "2021-04-07T00:00:00.000000Z" -> "2021-04-08T00:00:00.000000Z"
        "ads_insights_platform_and_device":
          "2019-08-02T00:00:00.000000Z" -> "2019-10-30T00:00:00.000000Z"
          "2021-04-07T00:00:00.000000Z" -> "2021-04-08T00:00:00.000000Z"
        "ads_insights_region":
          "2019-08-03T00:00:00.000000Z" -> "2019-10-30T00:00:00.000000Z"
          "2021-04-07T00:00:00.000000Z" -> "2021-04-08T00:00:00.000000Z"
        "ads_insights_dma":
          "2019-08-03T00:00:00.000000Z" -> "2019-10-30T00:00:00.000000Z"
          "2021-04-07T00:00:00.000000Z" -> "2021-04-08T00:00:00.000000Z"
        "ads_insights_hourly_advertiser":
          "2019-08-03T00:00:00.000000Z" -> "2019-10-30T00:00:00.000000Z"
          "2021-04-07T00:00:00.000000Z" -> "2021-04-08T00:00:00.000000Z"

    """
    AUTOMATIC_FIELDS = "automatic"
    REPLICATION_KEYS = "valid-replication-keys"
    PRIMARY_KEYS = "table-key-properties"
    FOREIGN_KEYS = "table-foreign-key-properties"
    REPLICATION_METHOD = "forced-replication-method"
    API_LIMIT = "max-row-limit"
    INCREMENTAL = "INCREMENTAL"
    FULL_TABLE = "FULL_TABLE"
    START_DATE_FORMAT = "%Y-%m-%dT00:00:00Z"
    BOOKMARK_COMPARISON_FORMAT = "%Y-%m-%dT00:00:00+00:00"

    start_date = ""
    end_date = ""

    @staticmethod
    def tap_name():
        """The name of the tap"""
        return "tap-facebook"

    @staticmethod
    def get_type():
        """the expected url route ending"""
        return "platform.facebook"

    def get_properties(self, original: bool = True):
        """Configuration properties required for the tap."""
        return_value = {
            'account_id': os.getenv('TAP_FACEBOOK_ACCOUNT_ID'),
            'start_date' : '2021-04-07T00:00:00Z',
            'end_date': '2021-04-09T00:00:00Z',
            'insights_buffer_days': '1',
        }
        if original:
            return return_value

        return_value["start_date"] = self.start_date
        if self.end_date:
            return_value["end_date"] = self.end_date

        return return_value

    @staticmethod
    def get_credentials():
        """Authentication information for the test account"""
        return {'access_token': os.getenv('TAP_FACEBOOK_ACCESS_TOKEN')}

    def expected_metadata(self):
        """The expected streams and metadata about the streams"""
        return {
            "ads": {
                self.PRIMARY_KEYS: {"id", "updated_time"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"updated_time"}
            },
            "adcreative": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.FULL_TABLE,
            },
            "adsets": {
                self.PRIMARY_KEYS: {"id", "updated_time"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"updated_time"}
            },
            "campaigns": {
                self.PRIMARY_KEYS: {"id", },
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"updated_time"}
            },
            "ads_insights": {
                self.PRIMARY_KEYS: {"campaign_id", "adset_id", "ad_id", "date_start"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"date_start"}
            },
            "ads_insights_age_and_gender": {
                self.PRIMARY_KEYS: {
                    "campaign_id", "adset_id", "ad_id", "date_start", "age", "gender"
                },
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"date_start"}
            },
            "ads_insights_country": {
                self.PRIMARY_KEYS: {"campaign_id", "adset_id", "ad_id", "date_start", "country"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"date_start"}
            },
            "ads_insights_platform_and_device": {
                self.PRIMARY_KEYS: {
                    "campaign_id", "adset_id", "ad_id", "date_start",
                    "publisher_platform", "platform_position", "impression_device"
                },
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"date_start"}
            },
            "ads_insights_region": {
                self.PRIMARY_KEYS: {"region", "campaign_id", "adset_id", "ad_id", "date_start"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"date_start"}
            },
            "ads_insights_dma": {
                self.PRIMARY_KEYS: {"dma", "campaign_id", "adset_id", "ad_id", "date_start"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"date_start"}
            },
            "ads_insights_hourly_advertiser": {
                self.PRIMARY_KEYS: {"hourly_stats_aggregated_by_advertiser_time_zone", "campaign_id", "adset_id", "ad_id", "date_start"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"date_start"}
            },
            # "leads": {
            #     self.PRIMARY_KEYS: {"id"},
            #     self.REPLICATION_METHOD: self.INCREMENTAL,
            #     self.REPLICATION_KEYS: {"created_time"}
            # },
        }


    def expected_streams(self):
        """A set of expected stream names"""
        return set(self.expected_metadata().keys())

    def child_streams(self):
        """
        Return a set of streams that are child streams
        based on having foreign key metadata
        """
        return {stream for stream, metadata in self.expected_metadata().items()
                if metadata.get(self.FOREIGN_KEYS)}

    def expected_primary_keys(self):
        """
        return a dictionary with key of table name
        and value as a set of primary key fields
        """
        return {table: properties.get(self.PRIMARY_KEYS, set())
                for table, properties
                in self.expected_metadata().items()}

    def expected_replication_keys(self):
        """
        return a dictionary with key of table name
        and value as a set of replication key fields
        """
        return {table: properties.get(self.REPLICATION_KEYS, set())
                for table, properties
                in self.expected_metadata().items()}

    def expected_foreign_keys(self):
        """
        return a dictionary with key of table name
        and value as a set of foreign key fields
        """
        return {table: properties.get(self.FOREIGN_KEYS, set())
                for table, properties
                in self.expected_metadata().items()}


    def expected_automatic_fields(self):
        auto_fields = {}
        for k, v in self.expected_metadata().items():
            auto_fields[k] = v.get(self.PRIMARY_KEYS, set()) | v.get(self.REPLICATION_KEYS, set()) \
                | v.get(self.FOREIGN_KEYS, set())
        return auto_fields

    def expected_replication_method(self):
        """return a dictionary with key of table name nd value of replication method"""
        return {table: properties.get(self.REPLICATION_METHOD, None)
                for table, properties
                in self.expected_metadata().items()}

    def setUp(self):
        missing_envs = [x for x in [os.getenv('TAP_FACEBOOK_ACCESS_TOKEN'),
                                    os.getenv('TAP_FACEBOOK_ACCOUNT_ID')] if x is None]
        if len(missing_envs) != 0:
            raise Exception("set environment variables")


    #########################
    #   Helper Methods      #
    #########################

    def run_and_verify_check_mode(self, conn_id):
        """
        Run the tap in check mode and verify it succeeds.
        This should be ran prior to field selection and initial sync.

        Return the connection id and found catalogs from menagerie.
        """
        # run in check mode
        check_job_name = runner.run_check_mode(self, conn_id)

        # verify check exit codes
        exit_status = menagerie.get_exit_status(conn_id, check_job_name)
        menagerie.verify_check_exit_status(self, exit_status, check_job_name)

        found_catalogs = menagerie.get_catalogs(conn_id)
        self.assertGreater(len(found_catalogs), 0, msg="unable to locate schemas for connection {}".format(conn_id))

        found_catalog_names = set(map(lambda c: c['stream_name'], found_catalogs))

        self.assertSetEqual(self.expected_streams(), found_catalog_names, msg="discovered schemas do not match")
        LOGGER.info("discovered schemas are OK")

        return found_catalogs

    def run_and_verify_sync(self, conn_id):
        """
        Run a sync job and make sure it exited properly.
        Return a dictionary with keys of streams synced
        and values of records synced for each stream
        """
        # Run a sync job using orchestrator
        sync_job_name = runner.run_sync_mode(self, conn_id)

        # Verify tap and target exit codes
        exit_status = menagerie.get_exit_status(conn_id, sync_job_name)
        menagerie.verify_sync_exit_status(self, exit_status, sync_job_name)

        # Verify actual rows were synced
        sync_record_count = runner.examine_target_output_file(
            self, conn_id, self.expected_streams(), self.expected_primary_keys())
        self.assertGreater(
            sum(sync_record_count.values()), 0,
            msg="failed to replicate any data: {}".format(sync_record_count)
        )
        LOGGER.info("total replicated row count: %s", sum(sync_record_count.values()))

        return sync_record_count

    def perform_and_verify_table_and_field_selection(self,
                                                     conn_id,
                                                     test_catalogs,
                                                     select_all_fields=True):
        """
        Perform table and field selection based off of the streams to select
        set and field selection parameters.

        Verify this results in the expected streams selected and all or no
        fields selected for those streams.
        """

        # Select all available fields or select no fields from all testable streams
        self.select_all_streams_and_fields(
            conn_id=conn_id, catalogs=test_catalogs, select_all_fields=select_all_fields
        )

        catalogs = menagerie.get_catalogs(conn_id)

        # Ensure our selection affects the catalog
        expected_selected = [tc.get('stream_name') for tc in test_catalogs]
        for cat in catalogs:
            catalog_entry = menagerie.get_annotated_schema(conn_id, cat['stream_id'])

            # Verify all testable streams are selected
            selected = catalog_entry.get('annotated-schema').get('selected')
            LOGGER.info("Validating selection on %s: %s", cat['stream_name'], selected)
            if cat['stream_name'] not in expected_selected:
                self.assertFalse(selected, msg="Stream selected, but not testable.")
                continue # Skip remaining assertions if we aren't selecting this stream
            self.assertTrue(selected, msg="Stream not selected.")

            if select_all_fields:
                # Verify all fields within each selected stream are selected
                for field, field_props in catalog_entry.get('annotated-schema').get('properties').items():
                    field_selected = field_props.get('selected')
                    LOGGER.info("\tValidating selection on %s.%s: %s",
                                cat['stream_name'], field, field_selected)
                    self.assertTrue(field_selected, msg="Field not selected.")
            else:
                # Verify only automatic fields are selected
                expected_automatic_fields = self.expected_automatic_fields().get(cat['stream_name'])
                selected_fields = self.get_selected_fields_from_metadata(catalog_entry['metadata'])
                self.assertEqual(expected_automatic_fields, selected_fields)

    @staticmethod
    def get_selected_fields_from_metadata(metadata):
        selected_fields = set()
        for field in metadata:
            is_field_metadata = len(field['breadcrumb']) > 1
            inclusion_automatic_or_selected = (
                field['metadata']['selected'] is True or \
                field['metadata']['inclusion'] == 'automatic'
            )
            if is_field_metadata and inclusion_automatic_or_selected:
                selected_fields.add(field['breadcrumb'][1])
        return selected_fields


    @staticmethod
    def select_all_streams_and_fields(conn_id, catalogs, select_all_fields: bool = True):
        """Select all streams and all fields within streams"""
        for catalog in catalogs:
            schema = menagerie.get_annotated_schema(conn_id, catalog['stream_id'])

            non_selected_properties = []
            if not select_all_fields:
                # get a list of all properties so that none are selected
                non_selected_properties = schema.get('annotated-schema', {}).get(
                    'properties', {}).keys()

            connections.select_catalog_and_fields_via_metadata(
                conn_id, catalog, schema, [], non_selected_properties)

    @staticmethod
    def parse_date(date_value):
        """
        Pass in string-formatted-datetime, parse the value, and return it as an unformatted datetime object.
        """
        date_formats = {
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S.%f+00:00",
            "%Y-%m-%dT%H:%M:%S+00:00",
            "%Y-%m-%d"
        }
        for date_format in date_formats:
            try:
                date_stripped = dt.strptime(date_value, date_format)
                return date_stripped
            except ValueError:
                continue

        raise NotImplementedError("Tests do not account for dates of this format: {}".format(date_value))

    def timedelta_formatted(self, dtime, days=0, date_format=''):
        try:
            date_stripped = dt.strptime(dtime, date_format)
            return_date = date_stripped + timedelta(days=days)

            return dt.strftime(return_date, date_format)

        except ValueError:
            raise AssertionError("Datetime object is not of the format: {}".format(date_format))

    ##########################################################################
    ### Tap Specific Methods
    ##########################################################################

    @staticmethod
    def is_insight(stream):
        return stream.startswith('ads_insights')

    def setUp(self):
        LOGGER.info("-------------------------------------------- STARTING TEST ---------------------------------------------------")
        LOGGER.info("test: %s", self.name())
        LOGGER.info("streams covered: %s", self.streams_to_test())
        LOGGER.info("--------------------------------------------------------------------------------------------------------------")

    def tearDown(self):
        LOGGER.info("--------------------------------------------- ENDING TEST ----------------------------------------------------")
        LOGGER.info("test: %s", self.name())
        LOGGER.info("streams covered: %s", self.streams_to_test())
        LOGGER.info("--------------------------------------------------------------------------------------------------------------")
