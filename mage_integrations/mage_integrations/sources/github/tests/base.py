import os
import time
import unittest
from datetime import datetime as dt
from datetime import timedelta

from tap_tester import LOGGER, connections, menagerie, runner


class TestGithubBase(unittest.TestCase):
    PRIMARY_KEYS = "table-key-properties"
    REPLICATION_METHOD = "forced-replication-method"
    INCREMENTAL = "INCREMENTAL"
    FULL = "FULL_TABLE"
    BOOKMARK = "bookmark"
    PK_CHILD_FIELDS = "pk_child_fields"
    START_DATE_FORMAT = "%Y-%m-%dT00:00:00Z"  # %H:%M:%SZ
    BOOKMARK_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
    RECORD_REPLICATION_KEY_FORMAT = "%Y-%m-%dT%H:%M:%S.%fZ"
    EVENTS_RECORD_REPLICATION_KEY_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
    DATETIME_FMT = {
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.000000Z",
    }
    START_DATE = ""
    OBEYS_START_DATE = "obey-start-date"

    def setUp(self):
        missing_envs = [x for x in ["TAP_GITHUB_TOKEN"] if os.getenv(x) is None]
        if missing_envs:
            raise Exception("Missing environment variables: {}".format(missing_envs))

    @staticmethod
    def get_type():
        return "platform.github"

    @staticmethod
    def tap_name():
        return "tap-github"

    def get_properties(self, original: bool = True):
        """
        Maintain states for start_date and end_date
        :param original: set to false to change the start_date or end_date
        """
        return_value = {
            "start_date": "2021-10-01T00:00:00Z",
            "repository": "singer-io/test-repo",
        }
        if original:
            return return_value

        # Reassign start and end dates
        return_value["start_date"] = self.START_DATE
        return return_value

    def get_credentials(self):
        return {"access_token": os.getenv("TAP_GITHUB_TOKEN")}

    def expected_metadata(self):
        """The expected streams and metadata about the streams"""

        return {
            "assignees": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.FULL,
                self.OBEYS_START_DATE: False,
            },
            "collaborators": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.FULL,
                self.OBEYS_START_DATE: False,
            },
            "comments": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.BOOKMARK: {"updated_at"},
                self.OBEYS_START_DATE: True,
            },
            "commit_comments": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.BOOKMARK: {"updated_at"},
                self.OBEYS_START_DATE: True,
            },
            "commits": {
                self.PRIMARY_KEYS: {"sha"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.BOOKMARK: {"updated_at"},
                self.OBEYS_START_DATE: True,
            },
            "events": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.BOOKMARK: {"created_at"},
                self.OBEYS_START_DATE: True,
            },
            "issue_labels": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.FULL,
                self.OBEYS_START_DATE: False,
            },
            "issue_milestones": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.BOOKMARK: {"updated_at"},
                self.OBEYS_START_DATE: True,
            },
            "issue_events": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.BOOKMARK: {"created_at"},
                self.OBEYS_START_DATE: True,
            },
            "issues": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.BOOKMARK: {"updated_at"},
                self.OBEYS_START_DATE: True,
            },
            "pr_commits": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.BOOKMARK: {"updated_at"},
                self.OBEYS_START_DATE: True,
            },
            "project_cards": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.BOOKMARK: {"updated_at"},
                self.OBEYS_START_DATE: True,
            },
            "project_columns": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.BOOKMARK: {"updated_at"},
                self.OBEYS_START_DATE: True,
            },
            "projects": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.BOOKMARK: {"updated_at"},
                self.OBEYS_START_DATE: True,
            },
            "pull_requests": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.BOOKMARK: {"updated_at"},
                self.OBEYS_START_DATE: True,
                self.PK_CHILD_FIELDS: {"number"},
            },
            "releases": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.FULL,
                self.OBEYS_START_DATE: False,
            },
            "review_comments": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.BOOKMARK: {"updated_at"},
                self.OBEYS_START_DATE: True,
            },
            "reviews": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.INCREMENTAL,
                self.BOOKMARK: {"submitted_at"},
                self.OBEYS_START_DATE: True,
            },
            "stargazers": {
                self.PRIMARY_KEYS: {"user_id"},
                self.REPLICATION_METHOD: self.FULL,
                self.OBEYS_START_DATE: False,
            },
            "team_members": {
                self.PRIMARY_KEYS: {"id", "team_slug"},
                self.REPLICATION_METHOD: self.FULL,
                self.OBEYS_START_DATE: False,
                self.PK_CHILD_FIELDS: {"login"},
            },
            "team_memberships": {
                self.PRIMARY_KEYS: {"url"},
                self.REPLICATION_METHOD: self.FULL,
                self.OBEYS_START_DATE: False,
            },
            "teams": {
                self.PRIMARY_KEYS: {"id"},
                self.REPLICATION_METHOD: self.FULL,
                self.OBEYS_START_DATE: False,
                self.PK_CHILD_FIELDS: {"slug"},
            },
        }

    def expected_replication_method(self):
        """
        Return a dictionary with key of table name
        and value of replication method
        """
        return {
            table: properties.get(self.REPLICATION_METHOD, None)
            for table, properties in self.expected_metadata().items()
        }

    def expected_incremental_streams(self):
        return set(
            stream
            for stream, rep_meth in self.expected_replication_method().items()
            if rep_meth == self.INCREMENTAL
        )

    def expected_full_table_streams(self):
        return set(
            stream
            for stream, rep_meth in self.expected_replication_method().items()
            if rep_meth == self.FULL
        )

    def expected_streams(self):
        """A set of expected stream names"""
        return set(self.expected_metadata().keys())

    def expected_primary_keys(self):
        """
        Return a dictionary with the key of the table name
        and value as a set of primary key fields
        """
        return {
            table: properties.get(self.PRIMARY_KEYS, set())
            for table, properties in self.expected_metadata().items()
        }

    def expected_bookmark_keys(self):
        """
        Return a dictionary with the key of the table name
        and value as a set of bookmark key fields
        """
        return {
            table: properties.get(self.BOOKMARK, set())
            for table, properties in self.expected_metadata().items()
        }

    def expected_foreign_keys(self):
        """
        Return dictionary with the key of table name and
        value is a set of foreign keys
        """
        return {}

    def expected_child_pk_keys(self):
        """
        Return a dictionary with key of table name
        and value as a set of child streams primary key  fields
        which are not automatic in parent streams
        """
        return {
            table: properties.get(self.PK_CHILD_FIELDS, set())
            for table, properties in self.expected_metadata().items()
        }

    def expected_automatic_keys(self):
        """
        Return a dictionary with the key of the table name
        and value as a set of automatic key fields
        """
        return {
            table: (
                (self.expected_primary_keys().get(table) or set())
                | (self.expected_bookmark_keys().get(table) or set())
                | (self.expected_child_pk_keys().get(table) or set())
            )
            for table in self.expected_metadata()
        }

    #########################
    #   Helper Methods      #
    #########################

    def run_and_verify_check_mode(self, conn_id):
        """
        Run the tap in check mode and verify it succeeds.
        This should be ran prior to field selection and initial sync.
        Return the connection id and found catalogs from menagerie.
        """
        # Run in check mode
        check_job_name = runner.run_check_mode(self, conn_id)

        # Verify check exit codes
        exit_status = menagerie.get_exit_status(conn_id, check_job_name)
        menagerie.verify_check_exit_status(self, exit_status, check_job_name)

        found_catalogs = menagerie.get_catalogs(conn_id)
        self.assertGreater(
            len(found_catalogs),
            0,
            msg="unable to locate schemas for connection {}".format(conn_id),
        )

        found_catalog_names = set(map(lambda c: c["stream_name"], found_catalogs))
        LOGGER.info(found_catalog_names)
        self.assertSetEqual(
            self.expected_streams(),
            found_catalog_names,
            msg="discovered schemas do not match",
        )
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
            self, conn_id, self.expected_streams(), self.expected_primary_keys()
        )
        self.assertGreater(
            sum(sync_record_count.values()),
            0,
            msg="failed to replicate any data: {}".format(sync_record_count),
        )
        LOGGER.info(
            "total replicated row count: {}".format(sum(sync_record_count.values()))
        )

        return sync_record_count

    def perform_and_verify_table_and_field_selection(
        self, conn_id, test_catalogs, select_all_fields=True
    ):
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
        expected_selected = [tc.get("stream_name") for tc in test_catalogs]
        for cat in catalogs:
            catalog_entry = menagerie.get_annotated_schema(conn_id, cat["stream_id"])

            # Verify all testable streams are selected
            selected = catalog_entry.get("annotated-schema").get("selected")
            LOGGER.info(
                "Validating selection on {}: {}".format(cat["stream_name"], selected)
            )
            if cat["stream_name"] not in expected_selected:
                self.assertFalse(selected, msg="Stream selected, but not testable.")
                continue  # Skip remaining assertions if we aren't selecting this stream
            self.assertTrue(selected, msg="Stream not selected.")

            if select_all_fields:
                # Verify all fields within each selected stream are selected
                for field, field_props in (
                    catalog_entry.get("annotated-schema").get("properties").items()
                ):
                    field_selected = field_props.get("selected")
                    LOGGER.info(
                        "\tValidating selection on {}.{}: {}".format(
                            cat["stream_name"], field, field_selected
                        )
                    )
                    self.assertTrue(field_selected, msg="Field not selected.")
            else:
                # Verify only automatic fields are selected
                expected_automatic_keys = self.expected_automatic_keys().get(
                    cat["stream_name"]
                )
                selected_fields = self.get_selected_fields_from_metadata(
                    catalog_entry["metadata"]
                )
                self.assertEqual(expected_automatic_keys, selected_fields)

    @staticmethod
    def get_selected_fields_from_metadata(metadata):
        selected_fields = set()
        for field in metadata:
            is_field_metadata = len(field["breadcrumb"]) > 1
            inclusion_automatic_or_selected = (
                field["metadata"]["selected"] is True
                or field["metadata"]["inclusion"] == "automatic"
            )
            if is_field_metadata and inclusion_automatic_or_selected:
                selected_fields.add(field["breadcrumb"][1])
        return selected_fields

    @staticmethod
    def select_all_streams_and_fields(
        conn_id, catalogs, select_all_fields: bool = True
    ):
        """Select all streams and all fields within streams"""
        for catalog in catalogs:
            schema = menagerie.get_annotated_schema(conn_id, catalog["stream_id"])

            non_selected_properties = []
            if not select_all_fields:
                # Get a list of all properties so that none are selected
                non_selected_properties = (
                    schema.get("annotated-schema", {}).get("properties", {}).keys()
                )

            connections.select_catalog_and_fields_via_metadata(
                conn_id, catalog, schema, [], non_selected_properties
            )

    def timedelta_formatted(self, dtime, days=0):
        date_stripped = dt.strptime(dtime, self.START_DATE_FORMAT)
        return_date = date_stripped + timedelta(days=days)

        return dt.strftime(return_date, self.START_DATE_FORMAT)

    ##########################################################################
    ### Tap Specific Methods
    ##########################################################################

    def is_incremental(self, stream):
        return (
            self.expected_metadata()[stream][self.REPLICATION_METHOD]
            == self.INCREMENTAL
        )

    def is_incremental_sub_stream(self, stream):
        return stream in self.INCREMENTAL_SUB_STREAMS

    def dt_to_ts(self, dtime, format):
        """Convert datetime with a format to timestamp"""
        date_stripped = int(time.mktime(dt.strptime(dtime, format).timetuple()))
        return date_stripped
