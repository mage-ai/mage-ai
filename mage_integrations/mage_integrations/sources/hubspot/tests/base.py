import os
import unittest
from datetime import datetime as dt
from datetime import timedelta

import tap_tester.menagerie   as menagerie
import tap_tester.connections as connections
import tap_tester.runner      as runner
from tap_tester.base_case import BaseCase
from tap_tester import LOGGER


class HubspotBaseTest(BaseCase):

    REPLICATION_KEYS = "valid-replication-keys"
    PRIMARY_KEYS = "table-key-properties"
    FOREIGN_KEYS = "table-foreign-key-properties"
    REPLICATION_METHOD = "forced-replication-method"
    INCREMENTAL = "INCREMENTAL"
    FULL = "FULL_TABLE"

    START_DATE_FORMAT = "%Y-%m-%dT00:00:00Z" # %H:%M:%SZ
    BASIC_DATE_FORMAT = "%Y-%m-%dT%H:%M:%S.%fZ"

    EXPECTED_PAGE_SIZE = "expected-page-size"
    OBEYS_START_DATE = "obey-start-date"
    PARENT_STREAM = "parent-stream"

    #######################################
    #  Tap Configurable Metadata Methods  #
    #######################################

    def setUp(self):
        missing_envs = [x for x in [
            'TAP_HUBSPOT_REDIRECT_URI',
            'TAP_HUBSPOT_CLIENT_ID',
            'TAP_HUBSPOT_CLIENT_SECRET',
            'TAP_HUBSPOT_REFRESH_TOKEN'
        ] if os.getenv(x) is None]
        if missing_envs:
            raise Exception("Missing environment variables: {}".format(missing_envs))

    @staticmethod
    def get_type():
        return "platform.hubspot"

    @staticmethod
    def tap_name():
        return "tap-hubspot"

    def get_properties(self):
        start_date = dt.today() - timedelta(days=1)
        start_date_with_fmt = dt.strftime(start_date, self.START_DATE_FORMAT)

        return {'start_date' : start_date_with_fmt}

    def get_credentials(self):
        return {'refresh_token': os.getenv('TAP_HUBSPOT_REFRESH_TOKEN'),
                'client_secret': os.getenv('TAP_HUBSPOT_CLIENT_SECRET'),
                'redirect_uri':  os.getenv('TAP_HUBSPOT_REDIRECT_URI'),
                'client_id':     os.getenv('TAP_HUBSPOT_CLIENT_ID')}

    def expected_check_streams(self):
        return set(self.expected_metadata().keys())

    def expected_metadata(self):  # DOCS_BUG https://stitchdata.atlassian.net/browse/DOC-1523)
        """The expected streams and metadata about the streams"""
        return  {
            "campaigns": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.FULL,
                self.OBEYS_START_DATE: False
            },
            "companies": {
                self.PRIMARY_KEYS: {"companyId"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"property_hs_lastmodifieddate"},
                self.EXPECTED_PAGE_SIZE: 250,
                self.OBEYS_START_DATE: True
            },
            "contact_lists": {
                self.PRIMARY_KEYS: {"listId"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"updatedAt"},
                self.EXPECTED_PAGE_SIZE: 250,
                self.OBEYS_START_DATE: True
            },
            "contacts": {
                self.PRIMARY_KEYS: {"vid"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"versionTimestamp"},
                self.EXPECTED_PAGE_SIZE: 100,
                self.OBEYS_START_DATE: True
            },
            "contacts_by_company": {
                self.PRIMARY_KEYS: {"company-id", "contact-id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.EXPECTED_PAGE_SIZE: 100,
                self.OBEYS_START_DATE: True,
                self.PARENT_STREAM: 'companies'
            },
            "deal_pipelines": {
                self.PRIMARY_KEYS: {"pipelineId"},
                self.REPLICATION_METHOD: self.FULL,
                self.OBEYS_START_DATE: False,
            },
            "deals": {
                self.PRIMARY_KEYS: {"dealId"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"property_hs_lastmodifieddate"},
                self.OBEYS_START_DATE: True
            },
            "email_events": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"startTimestamp"},
                self.EXPECTED_PAGE_SIZE: 1000,
                self.OBEYS_START_DATE: True
            },
            "engagements": {
                self.PRIMARY_KEYS: {"engagement_id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"lastUpdated"},
                self.EXPECTED_PAGE_SIZE: 250,
                self.OBEYS_START_DATE: True
            },
            "forms": {
                self.PRIMARY_KEYS: {"guid"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"updatedAt"},
                self.OBEYS_START_DATE: True
            },
            "owners": {
                self.PRIMARY_KEYS: {"ownerId"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"updatedAt"},
                self.OBEYS_START_DATE: True  # TODO is this a BUG?
            },
            "subscription_changes": {
                self.PRIMARY_KEYS: {"timestamp", "portalId", "recipient"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"startTimestamp"},
                self.EXPECTED_PAGE_SIZE: 1000,
                self.OBEYS_START_DATE: True
            },
            "workflows": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"updatedAt"},
                self.OBEYS_START_DATE: True
            }
        }

    #############################
    #  Common Metadata Methods  #
    #############################

    def expected_primary_keys(self):
        """
        return a dictionary with key of table name
        and value as a set of primary key fields
        """
        return {table: properties.get(self.PRIMARY_KEYS, set())
                for table, properties
                in self.expected_metadata().items()}


    def expected_automatic_fields(self):
        """
        return a dictionary with key of table name and value as the primary keys and replication keys
        """
        pks = self.expected_primary_keys()
        rks = self.expected_replication_keys()

        return {stream: rks.get(stream, set()) | pks.get(stream, set())
                for stream in self.expected_streams()}


    def expected_replication_method(self):
        """return a dictionary with key of table name and value of replication method"""
        return {table: properties.get(self.REPLICATION_METHOD, None)
                for table, properties
                in self.expected_metadata().items()}

    def expected_streams(self):
        """A set of expected stream names"""
        return set(self.expected_metadata().keys())

    def expected_replication_keys(self):
        """
        return a dictionary with key of table name
        and value as a set of replication key fields
        """
        return {table: properties.get(self.REPLICATION_KEYS, set())
                for table, properties
                in self.expected_metadata().items()}

    def expected_page_limits(self):
        return {table: properties.get(self.EXPECTED_PAGE_SIZE, set())
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

    def expected_automatic_fields(self):
        auto_fields = {}
        for k, v in self.expected_metadata().items():
            auto_fields[k] = v.get(self.PRIMARY_KEYS, set()) | v.get(self.REPLICATION_KEYS, set())
        return auto_fields

    ##########################
    #  Common Test Actions   #
    ##########################

    def create_connection_and_run_check(self, original_properties: bool = True):
        """Create a new connection with the test name"""
        # Create the connection
        conn_id = connections.ensure_connection(self, original_properties)

        # Run a check job using orchestrator (discovery)
        check_job_name = runner.run_check_mode(self, conn_id)

        # Assert that the check job succeeded
        exit_status = menagerie.get_exit_status(conn_id, check_job_name)
        menagerie.verify_check_exit_status(self, exit_status, check_job_name)
        return conn_id

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

        found_catalog_names = set(map(lambda c: c['tap_stream_id'], found_catalogs))
        self.assertSetEqual(self.expected_check_streams(), found_catalog_names,
                            msg="discovered schemas do not match")
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
        sync_record_count = runner.examine_target_output_file(self,
                                                              conn_id,
                                                              self.expected_streams(),
                                                              self.expected_primary_keys())
        total_row_count = sum(sync_record_count.values())
        self.assertGreater(total_row_count, 0,
                           msg="failed to replicate any data: {}".format(sync_record_count))
        LOGGER.info("total replicated row count: %s", total_row_count)

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
        expected_selected = [tc.get('tap_stream_id') for tc in test_catalogs]
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
                expected_automatic_fields = self.expected_automatic_fields().get(cat['tap_stream_id'])
                selected_fields = self.get_selected_fields_from_metadata(catalog_entry['metadata'])
                self.assertEqual(expected_automatic_fields, selected_fields)

    @staticmethod
    def get_selected_fields_from_metadata(metadata):
        selected_fields = set()
        for field in metadata:
            is_field_metadata = len(field['breadcrumb']) > 1
            inclusion_automatic_or_selected = (field['metadata'].get('inclusion') == 'automatic'
                                               or field['metadata'].get('selected') is True)
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

    def timedelta_formatted(self, dtime, days=0, str_format="%Y-%m-%dT00:00:00Z"):
        date_stripped = dt.strptime(dtime, str_format)
        return_date = date_stripped + timedelta(days=days)

        return dt.strftime(return_date, str_format)

    ################################
    #  Tap Specific Test Actions   #
    ################################

    def datetime_from_timestamp(self, value, str_format="%Y-%m-%dT00:00:00Z"):
        """
        Takes in a unix timestamp in milliseconds.
        Returns a string formatted python datetime
        """
        try:
            datetime_value = dt.fromtimestamp(value)
            datetime_str = dt.strftime(datetime_value, str_format)
        except ValueError as err:
            raise NotImplementedError(
                f"Invalid argument 'value':  {value}  "
                "This method was designed to accept unix timestamps in milliseconds."
            )
        return datetime_str

    def is_child(self, stream):
        """return true if this stream is a child stream"""
        return self.expected_metadata()[stream].get(self.PARENT_STREAM) is not None
