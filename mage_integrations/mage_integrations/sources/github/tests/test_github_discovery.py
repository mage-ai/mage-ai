"""Test tap discovery mode and metadata."""
import re

from tap_tester import menagerie, connections

from base import TestGithubBase

class TestGithubDiscovery(TestGithubBase):

    def name(self):
        return "tap_tester_github_discovery"

    def test_run(self):
        """
        Testing that discovery creates the appropriate catalog with valid metadata.

        • Verify number of actual streams discovered match expected
        • Verify the stream names discovered were what we expect
        • Verify stream names follow naming convention
          streams should only have lowercase alphas and underscores
        • verify there is only 1 top level breadcrumb
        • verify primary key(s)
        • verify that primary keys are given the inclusion of automatic.
        • verify that all other fields have inclusion of available metadata.
        """
        expected_streams = self.expected_streams()

        conn_id = connections.ensure_connection(self)

        found_catalogs = self.run_and_verify_check_mode(conn_id)
        # Verify stream names follow naming convention
        # streams should only have lowercase alphas and underscores
        found_catalog_names = {c['tap_stream_id'] for c in found_catalogs}
        self.assertTrue(all([re.fullmatch(r"[a-z_]+",  name) for name in found_catalog_names]),
                        msg="One or more streams don't follow standard naming")

        for stream in expected_streams:
            with self.subTest(stream=stream):

                # Verify ensure the catalog is found for a given stream
                catalog = next(iter([catalog for catalog in found_catalogs
                                     if catalog["stream_name"] == stream]))
                self.assertIsNotNone(catalog)

                # Collecting expected values
                expected_primary_keys = self.expected_primary_keys()[stream]
                expected_automatic_keys = self.expected_automatic_keys().get(stream)

                # Collecting actual values...
                schema_and_metadata = menagerie.get_annotated_schema(conn_id, catalog['stream_id'])
                metadata = schema_and_metadata["metadata"]
                stream_properties = [item for item in metadata if item.get("breadcrumb") == []]
                actual_fields = [md_entry.get("breadcrumb")[1] for md_entry in metadata if md_entry.get("breadcrumb") != []]
                actual_primary_keys = set(
                    stream_properties[0].get(
                        "metadata", {self.PRIMARY_KEYS: []}).get(self.PRIMARY_KEYS, [])
                )

                actual_automatic_fields = set(
                    item.get("breadcrumb", ["properties", None])[1] for item in metadata
                    if item.get("metadata").get("inclusion") == "automatic"
                )

                actual_replication_method = stream_properties[0].get(
                    "metadata", {self.REPLICATION_METHOD: None}).get(self.REPLICATION_METHOD)

                ##########################################################################
                ### metadata assertions
                ##########################################################################

                # Verify there is only 1 top level breadcrumb in metadata
                self.assertTrue(len(stream_properties) == 1,
                                msg="There is NOT only one top level breadcrumb for {}".format(stream) + \
                                "\nstream_properties | {}".format(stream_properties))

                # Verify there are no duplicate metadata entries
                self.assertEqual(len(actual_fields), 
                                len(set(actual_fields)), 
                                msg = "duplication in the retrieved fields")
                
                # Verify primary key(s) match expectations
                self.assertSetEqual(
                    expected_primary_keys, actual_primary_keys,
                )

                # Verify that primary keys and replication keys are given the inclusion of automatic in metadata.
                self.assertSetEqual(expected_automatic_keys, actual_automatic_fields)

                # Verify the actual replication matches our expected replication method
                self.assertEqual(
                    self.expected_replication_method().get(stream, None),
                    actual_replication_method,
                    msg="The actual replication method {} doesn't match the expected {}".format(
                        actual_replication_method,
                        self.expected_replication_method().get(stream, None)))
                
                # Verify that all other fields have inclusion of available
                # This assumes there are no unsupported fields for SaaS sources
                self.assertTrue(
                    all({item.get("metadata").get("inclusion") == "available"
                         for item in metadata
                         if item.get("breadcrumb", []) != []
                         and item.get("breadcrumb", ["properties", None])[1]
                         not in actual_automatic_fields}),
                    msg="Not all non key properties are set to available in metadata")
