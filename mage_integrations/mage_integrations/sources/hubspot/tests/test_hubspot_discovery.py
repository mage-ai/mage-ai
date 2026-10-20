"""Test tap discovery mode and metadata/annotated-schema."""
import re

from tap_tester import menagerie

from base import HubspotBaseTest


class DiscoveryTest(HubspotBaseTest):
    """Test tap discovery mode and metadata/annotated-schema conforms to standards."""

    @staticmethod
    def name():
        return "tt_hubspot_discovery"

    def test_run(self):
        """
        Verify that discover creates the appropriate catalog, schema, metadata, etc.

        • Verify number of actual streams discovered match expected
        • Verify the stream names discovered were what we expect
        • Verify stream names follow naming convention
          streams should only have lowercase alphas and underscores
        • verify there is only 1 top level breadcrumb
        • verify replication key(s)
        • verify primary key(s)
        • verify that if there is a replication key we are doing INCREMENTAL otherwise FULL
        • verify the actual replication matches our expected replication method
        • verify that primary, replication and foreign keys
          are given the inclusion of automatic (metadata and annotated schema).
        • verify that all other fields have inclusion of available (metadata and schema)
        """
        streams_to_test = self.expected_streams()

        conn_id = self.create_connection_and_run_check()

        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # Verify stream names follow naming convention
        # streams should only have lowercase alphas and underscores
        found_catalog_names = {c['tap_stream_id'] for c in found_catalogs}
        self.assertTrue(all([re.fullmatch(r"[a-z_]+", name) for name in found_catalog_names]),
                        msg="One or more streams don't follow standard naming")

        for stream in streams_to_test:
            with self.subTest(stream=stream):
                catalog = next(iter([catalog for catalog in found_catalogs
                                     if catalog["stream_name"] == stream]))
                assert catalog  # based on previous tests this should always be found
                schema_and_metadata = menagerie.get_annotated_schema(conn_id, catalog['stream_id'])
                metadata = schema_and_metadata["metadata"]

                # verify there is only 1 top level breadcrumb
                stream_properties = [item for item in metadata if item.get("breadcrumb") == []]
                self.assertTrue(len(stream_properties) == 1,
                                msg=f"There is NOT only one top level breadcrumb for {stream}" + \
                                "\nstream_properties | {stream_properties}")

                # verify replication key(s)
                actual_rep_keys = set(stream_properties[0].get(
                            "metadata", {self.REPLICATION_KEYS: None}).get(
                                self.REPLICATION_KEYS, []))
                self.assertEqual(
                    set(stream_properties[0].get(
                        "metadata", {self.REPLICATION_KEYS: []}).get(self.REPLICATION_KEYS, [])),
                    self.expected_replication_keys()[stream],
                    msg=f"expected replication key {self.expected_replication_keys()[stream]} but actual is {actual_rep_keys}"
                        )


                # verify primary key(s)
                actual_primary_keys = set(stream_properties[0].get( "metadata", {self.PRIMARY_KEYS: []}).get(self.PRIMARY_KEYS, []))
                self.assertSetEqual(self.expected_primary_keys()[stream], actual_primary_keys,
                                    msg=f"expected primary key {self.expected_primary_keys()[stream]} but actual is {actual_primary_keys}"
                                    #set(stream_properties[0].get('metadata', {self.PRIMARY_KEYS: None}).get(self.PRIMARY_KEYS, [])))}"

                        )
                actual_replication_method = stream_properties[0]['metadata'].get('forced-replication-method')
                # BUG https://jira.talendforge.org/browse/TDL-9939 all streams are set to full-table in the metadata
                # verify the actual replication matches our expected replication method
                if stream == "contacts":
                    self.assertEqual(
                        self.expected_replication_method().get(stream, None),
                        actual_replication_method,
                        msg="The actual replication method {} doesn't match the expected {}".format(
                            actual_replication_method,
                            self.expected_replication_method().get(stream, None)))

                # verify that if there is a replication key we are doing INCREMENTAL otherwise FULL
                actual_replication_method = stream_properties[0].get(
                    "metadata", {self.REPLICATION_METHOD: None}).get(self.REPLICATION_METHOD)
                if stream_properties[0].get(
                        "metadata", {self.REPLICATION_KEYS: []}).get(self.REPLICATION_KEYS, []):
              
                    if stream in ["contacts", "companies", "deals"]:                        
                        self.assertTrue(actual_replication_method == self.INCREMENTAL,
                                    msg="Expected INCREMENTAL replication "
                                    "since there is a replication key")
                    else:
                        # BUG_TDL-9939 https://jira.talendforge.org/browse/TDL-9939 all streams are set to full table
                        pass  # BUG TDL-9939 REMOVE ME WHEN BUG IS ADDRESSED

                else:
                    self.assertTrue(actual_replication_method == self.FULL,
                                    msg="Expected FULL replication "
                                        "since there is no replication key")

                expected_primary_keys = self.expected_primary_keys()[stream]
                expected_replication_keys = self.expected_replication_keys()[stream]
                expected_automatic_fields = expected_primary_keys | expected_replication_keys

                # verify that primary, replication and foreign keys are given the inclusion of automatic in metadata.
                # BUG_2 https://jira.talendforge.org/browse/TDL-9772 'inclusion' is not present for replication keys
                actual_automatic_fields = {item.get("breadcrumb", ["properties", None])[1]
                                           for item in metadata
                                           if item.get("metadata").get("inclusion") == "automatic"}
                if stream in ["contacts", "companies", "deals"]:
                    self.assertEqual(expected_automatic_fields,
                                    actual_automatic_fields,
                                    msg=f"expected {expected_automatic_fields} automatic fields but got {actual_automatic_fields}"
                                    )

                # verify that all other fields have inclusion of available
                # This assumes there are no unsupported fields for SaaS sources
                self.assertTrue(
                    all({item.get("metadata").get("inclusion") == "available"
                         for item in metadata
                         if item.get("breadcrumb", []) != []
                         and item.get("breadcrumb", ["properties", None])[1]
                         not in actual_automatic_fields}),
                    msg="Not all non key properties are set to available in metadata")
