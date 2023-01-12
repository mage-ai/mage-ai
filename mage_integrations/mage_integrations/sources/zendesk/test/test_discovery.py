import re

import tap_tester.connections as connections
from base import ZendeskTest
from tap_tester import menagerie

class ZendeskDiscover(ZendeskTest):
    """
        Testing that discovery creates the appropriate catalog with valid metadata.
        • Verify number of actual streams discovered match expected
        • Verify the stream names discovered were what we expect
        • Verify stream names follow naming convention
          streams should only have lowercase alphas and underscores
        • verify there is only 1 top level breadcrumb
        • verify replication key(s)
        • verify primary key(s)
        • verify that if there is a replication key we are doing INCREMENTAL otherwise FULL
        • verify the actual replication matches our expected replication method
        • verify that primary, replication keys are given the inclusion of automatic.
        • verify that all other fields have inclusion of available metadata.
    """
    
    def name(self):
        return "zendesk_discover_test"

    def test_run(self):
        streams_to_test = self.expected_check_streams()
        
        conn_id = connections.ensure_connection(self, payload_hook=None)

        # Verify that there are catalogs found
        found_catalogs = self.run_and_verify_check_mode(
            conn_id)

        # Verify stream names follow naming convention
        # streams should only have lowercase alphas and underscores
        found_catalog_names = {c['tap_stream_id'] for c in found_catalogs}
        self.assertTrue(all([re.fullmatch(r"[a-z_]+",  name) for name in found_catalog_names]),
                        msg="One or more streams don't follow standard naming")
        
        for stream in streams_to_test:
            with self.subTest(stream=stream):

                # Verify ensure the caatalog is found for a given stream
                catalog = next(iter([catalog for catalog in found_catalogs
                                     if catalog["stream_name"] == stream]))
                self.assertIsNotNone(catalog)

                # collecting expected values
                expected_primary_keys = self.expected_primary_keys()[stream]
                expected_replication_keys = self.expected_replication_keys()[
                    stream]
                expected_automatic_fields = self.expected_automatic_fields().get(stream)
                expected_replication_method = self.expected_replication_method()[
                    stream]

                # collecting actual values...
                schema_and_metadata = menagerie.get_annotated_schema(
                    conn_id, catalog['stream_id'])
                metadata = schema_and_metadata["metadata"]
                stream_properties = [
                    item for item in metadata if item.get("breadcrumb") == []]
                actual_primary_keys = set(
                    stream_properties[0].get(
                        "metadata", {self.PRIMARY_KEYS: []}).get(self.PRIMARY_KEYS, [])
                )
                actual_replication_keys = set(
                    stream_properties[0].get(
                        "metadata", {self.REPLICATION_KEYS: []}).get(self.REPLICATION_KEYS, [])
                )
                actual_replication_method = stream_properties[0].get(
                    "metadata", {self.REPLICATION_METHOD: None}).get(self.REPLICATION_METHOD)
                actual_automatic_fields = set(
                    item.get("breadcrumb", ["properties", None])[1] for item in metadata
                    if item.get("metadata").get("inclusion") == "automatic"
                )
                
                ##########################################################################
                # metadata assertions
                ##########################################################################

                # verify there is only 1 top level breadcrumb in metadata
                self.assertTrue(len(stream_properties) == 1,
                                msg="There is NOT only one top level breadcrumb for {}".format(stream) +
                                "\nstream_properties | {}".format(stream_properties))

                # verify primary key(s) match expectations
                self.assertSetEqual(
                    expected_primary_keys, actual_primary_keys,
                )

                # verify that primary keys and replication keys
                # are given the inclusion of automatic in metadata.
                self.assertSetEqual(expected_automatic_fields,
                                    actual_automatic_fields)

                # verify that all other fields have inclusion of available
                # This assumes there are no unsupported fields for SaaS sources
                self.assertTrue(
                    all({item.get("metadata").get("inclusion") == "available"
                         for item in metadata
                         if item.get("breadcrumb", []) != []
                         and item.get("breadcrumb", ["properties", None])[1]
                         not in actual_automatic_fields}),
                    msg="Not all non key properties are set to available in metadata")

                # verify that if there is a replication key we are doing INCREMENTAL otherwise FULL
                # Given below streams are child stremas of parent stream `tickets` and tickets is incremental streams
                # so, child streams also behave as incremental streams but does not save it's own state. So, skipping it.
                if not stream in ["ticket_comments", "ticket_audits", "ticket_metrics"]:
                
                    if actual_replication_keys:
                        self.assertTrue(actual_replication_method == self.INCREMENTAL,
                                        msg="Expected INCREMENTAL replication "
                                            "since there is a replication key")
                    else:
                        self.assertTrue(actual_replication_method == self.FULL_TABLE,
                                        msg="Expected FULL replication "
                                        "since there is no replication key")
                    
                    # verify the actual replication matches our expected replication method
                    self.assertEqual(expected_replication_method, actual_replication_method,
                                        msg="The actual replication method {} doesn't match the expected {}".format(
                                            actual_replication_method, expected_replication_method))

                # verify replication key(s)
                self.assertEqual(expected_replication_keys, actual_replication_keys,
                                 msg="expected replication key {} but actual is {}".format(
                                     expected_replication_keys, actual_replication_keys))
