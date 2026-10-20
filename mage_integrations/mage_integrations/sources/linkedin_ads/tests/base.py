import os
import unittest
from datetime import datetime as dt
import time
import backoff
import requests
import json

import tap_tester.menagerie   as menagerie
import tap_tester.connections as connections
import tap_tester.runner      as runner


class TestLinkedinAdsBase(unittest.TestCase):
    PRIMARY_KEYS = "table-key-properties"
    REPLICATION_METHOD = "forced-replication-method"
    REPLICATION_KEYS = "valid-replication-keys"
    DATETIME_FMT = {
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%fZ"
    }
    START_DATE = ""

    def setUp(self):
        missing_envs = [x for x in [
            "TAP_LINKEDIN_ADS_ACCOUNTS"
        ] if os.getenv(x) is None]
        if missing_envs:
            raise Exception("Missing environment variables: {}".format(missing_envs))

    @staticmethod
    def get_type():
        return "platform.linkedin-ads"

    @staticmethod
    def tap_name():
        return "tap-linkedin-ads"

    def get_properties(self, original: bool = True):
        """Returns the connection properties"""
        return_value = {
            "start_date" : "2018-08-21T00:00:00Z",
            "accounts": os.getenv("TAP_LINKEDIN_ADS_ACCOUNTS"),
            "page_size": 100
        }
        if original:
            return return_value

        # Reassign start date
        return_value["start_date"] = self.START_DATE
        return return_value

    def get_credentials(self):
        """Returns the connection credentials"""
        return {
            "client_id": os.getenv("TAP_LINKEDIN_ADS_CLIENT_ID"),
            "client_secret": os.getenv("TAP_LINKEDIN_ADS_CLIENT_SECRET"),
            "refresh_token": os.getenv("TAP_LINKEDIN_ADS_REFRESH_TOKEN"),
            "access_token": os.getenv("TAP_LINKEDIN_ADS_ACCESS_TOKEN")
            }

    @staticmethod
    def expected_check_streams():
        return {
            'accounts',
            'video_ads',
            'account_users',
            'campaign_groups',
            'campaigns',
            'creatives',
            'ad_analytics_by_campaign',
            'ad_analytics_by_creative'
        }

    def expected_metadata(self):
        """The expected streams and metadata about the streams"""

        return {
            'accounts': {
                self.PRIMARY_KEYS: {'id'},
                self.REPLICATION_METHOD: 'INCREMENTAL',
                self.REPLICATION_KEYS: {'last_modified_time'}
            },
            'video_ads': {
                self.PRIMARY_KEYS: {'content_reference'},
                self.REPLICATION_METHOD: 'INCREMENTAL',
                self.REPLICATION_KEYS: {'last_modified_time'}
            },
            'account_users': {
                self.PRIMARY_KEYS: {'account_id', 'user_person_id'},
                self.REPLICATION_METHOD: 'INCREMENTAL',
                self.REPLICATION_KEYS: {'last_modified_time'}
            },
            'campaign_groups': {
                self.PRIMARY_KEYS: {'id'},
                self.REPLICATION_METHOD: 'INCREMENTAL',
                self.REPLICATION_KEYS: {'last_modified_time'}
            },
            'campaigns': {
                self.PRIMARY_KEYS: {'id'},
                self.REPLICATION_METHOD: 'INCREMENTAL',
                self.REPLICATION_KEYS: {'last_modified_time'}
            },
            'creatives': {
                self.PRIMARY_KEYS: {'id'},
                self.REPLICATION_METHOD: 'INCREMENTAL',
                self.REPLICATION_KEYS: {'last_modified_time'}
            },
            'ad_analytics_by_campaign': {
                self.PRIMARY_KEYS: {'campaign_id', 'start_at'},
                self.REPLICATION_METHOD: 'INCREMENTAL',
                self.REPLICATION_KEYS: {'end_at'}
            },
            'ad_analytics_by_creative': {
                self.PRIMARY_KEYS: {'creative_id', 'start_at'},
                self.REPLICATION_METHOD: 'INCREMENTAL',
                self.REPLICATION_KEYS: {'end_at'}
            }
        }

    def expected_automatic_fields(self):
        """
        return a dictionary with key of table name
        and value as a set of automatic key fields
        """
        auto_fields = {}
        for k, v in self.expected_metadata().items():
            auto_fields[k] = v.get(self.PRIMARY_KEYS, set()).union(v.get(self.REPLICATION_KEYS, set()))
        return auto_fields

    def expected_replication_method(self):
        """return a dictionary with key of table name and value of replication method"""
        return {table: properties.get(self.REPLICATION_METHOD, None)
                for table, properties
                in self.expected_metadata().items()}

    def expected_streams(self):
        """A set of expected stream names"""
        return set(self.expected_metadata().keys())

    def expected_start_date_keys(self):
        """
        return a dictionary with key of table name
        and value as a set of start_date key fields
        """
        return {table: properties.get(self.REPLICATION_KEYS, set())
                for table, properties
                in self.expected_metadata().items()}

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
        print(found_catalog_names)
        self.assertSetEqual(self.expected_streams(), found_catalog_names, msg="discovered schemas do not match")
        print("discovered schemas are OK")

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
        print("total replicated row count: {}".format(sum(sync_record_count.values())))

        return sync_record_count

    def perform_and_verify_table_and_field_selection(self,
                                                     conn_id,
                                                     test_catalogs,
                                                     select_all_fields=True,
                                                     non_selected_properties=[]):
        """
        Perform table and field selection based off of the streams to select
        set and field selection parameters.
        Verify this results in the expected streams selected and all or no
        fields selected for those streams.
        """

        # Select all available fields or select no fields from all testable streams
        self.select_all_streams_and_fields(
            conn_id=conn_id, catalogs=test_catalogs, select_all_fields=select_all_fields, non_selected_properties=non_selected_properties
        )

        catalogs = menagerie.get_catalogs(conn_id)

        # Ensure our selection affects the catalog
        expected_selected = [tc.get('stream_name') for tc in test_catalogs]
        for cat in catalogs:
            catalog_entry = menagerie.get_annotated_schema(conn_id, cat['stream_id'])

            # Verify all testable streams are selected
            selected = catalog_entry.get('annotated-schema').get('selected')
            print("Validating selection on {}: {}".format(cat['stream_name'], selected))
            if cat['stream_name'] not in expected_selected:
                self.assertFalse(selected, msg="Stream selected, but not testable.")
                continue # Skip remaining assertions if we aren't selecting this stream
            self.assertTrue(selected, msg="Stream not selected.")

            if select_all_fields:
                # Verify all fields within each selected stream are selected
                for field, field_props in catalog_entry.get('annotated-schema').get('properties').items():
                    if field not in non_selected_properties:
                        field_selected = field_props.get('selected')
                        print("\tValidating selection on {}.{}: {}".format(
                            cat['stream_name'], field, field_selected))
                        self.assertTrue(field_selected, msg="Field not selected.")
            else:
                # Verify only automatic fields are selected
                expected_automatic_fields = self.expected_primary_keys().get(cat['stream_name'])
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
    def select_all_streams_and_fields(conn_id, catalogs, select_all_fields: bool = True, non_selected_properties=[]):
        """Select all streams and all fields within streams"""
        for catalog in catalogs:
            schema = menagerie.get_annotated_schema(conn_id, catalog['stream_id'])

            non_selected_properties = non_selected_properties
            if not select_all_fields:
                # get a list of all properties so that none are selected
                non_selected_properties = schema.get('annotated-schema', {}).get(
                    'properties', {}).keys()

            connections.select_catalog_and_fields_via_metadata(
                conn_id, catalog, schema, [], non_selected_properties)

    ##########################################################################
    ### Tap Specific Methods
    ##########################################################################

    def dt_to_ts(self, dtime):
        for date_format in self.DATETIME_FMT:
            try:
                date_stripped = int(time.mktime(dt.strptime(dtime, date_format).timetuple()))
                return date_stripped
            except ValueError:
                continue
