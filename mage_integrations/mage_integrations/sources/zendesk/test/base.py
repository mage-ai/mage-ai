import unittest
import os
import backoff
from datetime import datetime as dt
from datetime import timedelta
import dateutil.parser
import pytz

from tap_tester import connections
from tap_tester import menagerie
from tap_tester import runner
from tap_tester import LOGGER

# BUG https://jira.talendforge.org/browse/TDL-19985


class RetryableTapError(Exception): # BUG_TDL-19985
    def __init__(self, message):
        super().__init__(message)


class ZendeskTest(unittest.TestCase):
    start_date = ""
    DATETIME_FMT = {
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%fZ"
    }
    START_DATE_FORMAT = "%Y-%m-%dT00:00:00Z"
    PRIMARY_KEYS = "table-key-properties"
    REPLICATION_METHOD = "forced-replication-method"
    REPLICATION_KEYS = "valid-replication-keys"
    FULL_TABLE = "FULL_TABLE"
    INCREMENTAL = "INCREMENTAL"
    OBEYS_START_DATE = "obey-start-date"

    def tap_name(self):
        return "tap-zendesk"

    def setUp(self):
        required_env = {
            "TAP_ZENDESK_CLIENT_ID",
            "TAP_ZENDESK_CLIENT_SECRET",
            "TAP_ZENDESK_ACCESS_TOKEN",
        }
        missing_envs = [v for v in required_env if not os.getenv(v)]
        if missing_envs:
            raise Exception("set " + ", ".join(missing_envs))

    def get_type(self):
        return "platform.zendesk"

    def get_credentials(self):
        return {
            'access_token': os.getenv('TAP_ZENDESK_ACCESS_TOKEN'),
            'client_id': os.getenv('TAP_ZENDESK_CLIENT_ID'),
            'client_secret': os.getenv('TAP_ZENDESK_CLIENT_SECRET')
        }

    def get_properties(self, original: bool = True):
        return_value = {
            "start_date" : "2017-01-01T00:00:00Z",
            "subdomain": "rjmdev",
            "marketplace_app_id": int(os.getenv("TAP_ZENDESK_MARKETPLACE_APP_ID")) or 0,
            "marketplace_name": os.getenv("TAP_ZENDESK_MARKETPLACE_NAME") or "",
            "marketplace_organization_id": int(os.getenv("TAP_ZENDESK_MARKETPLACE_ORGANIZATION_ID")) or 0,
            "search_window_size":  "2592000"# seconds in a month
        }
        if original:
            return return_value

        # Reassign start date
        return_value["start_date"] = self.start_date
        return return_value

    def to_map(self, raw_metadata):
        return {tuple(md['breadcrumb']): md['metadata'] for md in raw_metadata}

    def expected_metadata(self):
        return {
            "groups": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"updated_at"},
                self.OBEYS_START_DATE: True
            },
            "group_memberships": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"updated_at"},
                self.OBEYS_START_DATE: True
            },
            "macros": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"updated_at"},
                self.OBEYS_START_DATE: True
            },
            "organizations": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"updated_at"},
                self.OBEYS_START_DATE: True
            },
            "satisfaction_ratings": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"updated_at"},
                self.OBEYS_START_DATE: True
            },
            "sla_policies": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.FULL_TABLE,
                self.OBEYS_START_DATE: False
            },
            "tags": {
                self.PRIMARY_KEYS: {"name"},
                self.REPLICATION_METHOD: self.FULL_TABLE,
                self.OBEYS_START_DATE: False
            },
            "ticket_comments": {
                # ticket_comments is child stream of tickets, and tickets is incremental stream.
                # But it does not save its own bookmark. It fetches records based on the record of the parent stream.
                # That's why make it FULL_TABLE
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.FULL_TABLE,
                self.OBEYS_START_DATE: False
            },
            "ticket_fields": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"updated_at"},
                self.OBEYS_START_DATE: True
            },
            "ticket_forms": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"updated_at"},
                self.OBEYS_START_DATE: True
            },
            "ticket_metrics": {
                # ticket_metrics is child stream of tickets, and tickets is incremental stream.
                # But it does not save its own bookmark. It fetches records based on the record of the parent stream.
                # That's why make it FULL_TABLE
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.FULL_TABLE,
                self.OBEYS_START_DATE: False
            },
            "tickets": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"generated_timestamp"},
                self.OBEYS_START_DATE: True
            },
            "users": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.REPLICATION_KEYS: {"updated_at"},
                self.OBEYS_START_DATE: True
            },
            "ticket_audits": {
                # ticket_audits is child stream of tickets, and tickets is incremental stream.
                # But it does not save its own bookmark. It fetches records based on the record of the parent stream.
                # That's why make it FULL_TABLE
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.FULL_TABLE,
                self.OBEYS_START_DATE: False
            }
        }

    def expected_check_streams(self):
        return set(self.expected_metadata().keys())

    def expected_replication_keys(self):
        return {table: properties.get(self.REPLICATION_KEYS, set()) for table, properties
                in self.expected_metadata().items()}

    def expected_primary_keys(self):
        return {table: properties.get(self.PRIMARY_KEYS, set()) for table, properties
                in self.expected_metadata().items()}

    def expected_replication_method(self):
        return {table: properties.get(self.REPLICATION_METHOD, set()) for table, properties
                in self.expected_metadata().items()}

    def expected_automatic_fields(self):
        """return a dictionary with key of table name and set of value of automatic(primary key and bookmark field) fields"""
        auto_fields = {}
        for k, v in self.expected_metadata().items():
            auto_fields[k] = v.get(self.PRIMARY_KEYS, set()) |  v.get(self.REPLICATION_KEYS, set())
        return auto_fields

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
        self.assertSetEqual(self.expected_check_streams(), found_catalog_names, msg="discovered schemas do not match")
        print("discovered schemas are OK")

        return found_catalogs

    def is_ssl_handshake_error(self, exit_status):
        """
        Return True if the exit_status matches our expectations for a known SSL error.
        Otherwise return False
        """
        tap_error_message = exit_status["tap_error_message"]
        if all([exit_status['tap_exit_status'] == 1,
                "HTTPSConnectionPool" in tap_error_message,
                "Caused by SSLError" in tap_error_message,
                "handshake" in tap_error_message.lower(),
                "failure" in tap_error_message.lower()]):

            return True
        return False

    # BUG_TDL-19985
    @backoff.on_exception(backoff.expo,
                          RetryableTapError,
                          max_tries=2,
                          factor=30)
    def run_and_verify_sync(self, conn_id, state=None):

        sync_job_name = runner.run_sync_mode(self, conn_id)

        # verify tap and target exit codes
        exit_status = menagerie.get_exit_status(conn_id, sync_job_name)

        # BUG_TDL-19985 WORKAROUND START
        try:
            menagerie.verify_sync_exit_status(self, exit_status, sync_job_name)
        except AssertionError as err:
            LOGGER.info("*******************ASSERTION ERROR*******************")
            if self.is_ssl_handshake_error(exit_status):
                LOGGER.info("*******************RETRYING SYNC DUE TO TIMEOUT ERROR*******************")
                if state is not None:
                    LOGGER.info("*******************RESETTING STATE*******************")
                    menagerie.set_state(conn_id, state)
                raise RetryableTapError(err)
            raise
        # BUG_TDL-19985 WORKAROUND END

        sync_record_count = runner.examine_target_output_file(self,
                                                              conn_id,
                                                              self.expected_check_streams(),
                                                              self.expected_primary_keys())

        self.assertGreater(
            sum(sync_record_count.values()), 0,
            msg="failed to replicate any data: {}".format(sync_record_count)
        )
        print("total replicated row count: {}".format(sum(sync_record_count.values())))

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
            print("Validating selection on {}: {}".format(cat['stream_name'], selected))
            if cat['stream_name'] not in expected_selected:
                self.assertFalse(selected, msg="Stream selected, but not testable.")
                continue # Skip remaining assertions if we aren't selecting this stream
            self.assertTrue(selected, msg="Stream not selected.")

            if select_all_fields:
                # Verify all fields within each selected stream are selected
                for field, field_props in catalog_entry.get('annotated-schema').get('properties').items():
                    field_selected = field_props.get('selected')
                    print("\tValidating selection on {}.{}: {}".format(
                        cat['stream_name'], field, field_selected))
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

    def parse_date(self, date_value):
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

        raise NotImplementedError(
            "Tests do not account for dates of this format: {}".format(date_value))

    def calculated_states_by_stream(self, current_state):
        timedelta_by_stream = {stream: [0,2,1]  # {stream_name: [days, hours, minutes], ...}
                               for stream in self.expected_check_streams()}

        stream_to_calculated_state = {stream: "" for stream in current_state['bookmarks'].keys()}
        for stream, state in current_state['bookmarks'].items():
            state_key, state_value = next(iter(state.keys())), next(iter(state.values()))
            state_as_datetime = dateutil.parser.parse(state_value)

            days, hours, minutes = timedelta_by_stream[stream]
            calculated_state_as_datetime = state_as_datetime - timedelta(days=days, hours=hours, minutes=minutes)

            state_format = '%Y-%m-%dT%H:%M:%SZ'
            calculated_state_formatted = dt.strftime(calculated_state_as_datetime, state_format)

            stream_to_calculated_state[stream] = {state_key: calculated_state_formatted}

        return stream_to_calculated_state

    def timedelta_formatted(self, dtime, days=0):
        try:
            date_stripped = dt.strptime(dtime, self.START_DATE_FORMAT)
            return_date = date_stripped + timedelta(days=days)

            return dt.strftime(return_date, self.START_DATE_FORMAT)

        except ValueError:
                return Exception("Datetime object is not of the format: {}".format(self.START_DATE_FORMAT))

    def convert_state_to_utc(self, date_str):
        """
        Convert a saved bookmark value of the form '2020-08-25T13:17:36-07:00' to
        a string formatted utc datetime,
        in order to compare aginast json formatted datetime values
        """
        date_object = dateutil.parser.parse(date_str)
        date_object_utc = date_object.astimezone(tz=pytz.UTC)
        return dt.strftime(date_object_utc, "%Y-%m-%dT%H:%M:%SZ")
