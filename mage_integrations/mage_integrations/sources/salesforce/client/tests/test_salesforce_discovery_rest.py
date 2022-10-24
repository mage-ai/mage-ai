"""Test tap discovery mode and metadata/annotated-schema."""
import unittest
from tap_tester import menagerie, connections, LOGGER

from base import SalesforceBaseTest


class DiscoveryTest(SalesforceBaseTest):
    """Test tap discovery mode and metadata/annotated-schema conforms to standards."""

    def discovery_test(self):
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
        # BUG | https://jira.talendforge.org/browse/TDL-15748
        #      The following streams stopped being discovered 10/10/2021
        #      When bug is addressed fix the marked lines
        missing_streams = {'DataAssetUsageTrackingInfo', 'DataAssetSemanticGraphEdge'}

        streams_to_test = self.expected_streams() - missing_streams # BUG_TDL-15748
        # streams_to_test_prime = self.expected_streams().difference(self.get_unsupported_by_bulk_api())
        # self.assertEqual(len(streams_to_test), len(streams_to_test_prime), msg="Expectations are invalid.") # BUG_TDL-15748

        conn_id = connections.ensure_connection(self)

        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # verify the tap only discovers the expected streams
        found_catalog_names = {catalog['tap_stream_id'] for catalog in found_catalogs}
        self.assertSetEqual(streams_to_test, found_catalog_names)
        LOGGER.info("discovered schemas are OK")

        # NOTE: The following assertion is not backwards compatible with older taps, but it
        #       SHOULD BE IMPLEMENTED in future taps, leaving here as a comment for reference

        # Verify stream names follow naming convention
        # streams should only have lowercase alphas and underscores
        # found_catalog_names = {c['tap_stream_id'] for c in found_catalogs}
        # self.assertTrue(all([re.fullmatch(r"[a-z_]+",  name) for name in found_catalog_names]),
        #                 msg="One or more streams don't follow standard naming")

        for stream in streams_to_test:
            with self.subTest(stream=stream):
                catalog = next(iter([catalog for catalog in found_catalogs
                                     if catalog["stream_name"] == stream]))
                assert catalog  # based on previous tests this should always be found
                # gather expectations
                expected_replication_keys = self.expected_replication_keys()[stream]
                expected_primary_keys = self.expected_primary_keys()[stream]
                expected_replication_method = self.expected_replication_method()[stream]
                expected_automatic_fields = expected_primary_keys | expected_replication_keys

                # gather results
                schema_and_metadata = menagerie.get_annotated_schema(conn_id, catalog['stream_id'])
                metadata = schema_and_metadata["metadata"]
                schema = schema_and_metadata["annotated-schema"]
                stream_properties = [item for item in metadata if item.get("breadcrumb") == []]
                actual_replication_keys = set(stream_properties[0].get(
                    "metadata", {self.REPLICATION_KEYS: []}).get(self.REPLICATION_KEYS, [])
                )
                actual_primary_keys = set(stream_properties[0].get(
                    "metadata", {self.PRIMARY_KEYS: []}).get(self.PRIMARY_KEYS, [])
                )
                actual_replication_method = stream_properties[0].get(
                    "metadata", {self.REPLICATION_METHOD: None}).get(self.REPLICATION_METHOD)


                # verify there is only 1 top level breadcrumb
                self.assertTrue(len(stream_properties) == 1,
                                msg="There is NOT only one top level breadcrumb for {}".format(stream) + \
                                "\nstream_properties | {}".format(stream_properties))

                # verify replication key(s)
                self.assertSetEqual(expected_replication_keys, actual_replication_keys)

                # verify primary key(s)
                self.assertSetEqual(expected_primary_keys, actual_primary_keys)

                # BUG_TDL-9711 | https://jira.talendforge.org/browse/TDL-9711
                #                [tap-salesforce] discovered streams have unexpected replication methods
                #                all values are set to None
                LOGGER.warning("Skipping 'expected replication method' asssertions for %s", stream)
                # verify the actual replication matches our expected replication method
                # self.assertEqual(expected_replication_method, actual_replication_method) # BUG_TDL-9711

                # # verify that if there is a replication key we are doing INCREMENTAL otherwise FULL
                # if actual_replication_keys
                #     self.assertEqual(self.INCREMENTAL, actual_replication_method) # BUG_TDL-9711
                # else:
                #     self.assertEqual(self.FULL_TABLE, actual_replication_method) # BUG_TDL-9711

                # verify that primary, replication and foreign keys
                # are given the inclusion of automatic in annotated schema.
                actual_automatic_fields = {key for key, value in schema["properties"].items()
                                           if value.get("inclusion") == "automatic"}
                self.assertEqual(expected_automatic_fields, actual_automatic_fields)

                # verify that primary, replication and foreign keys
                # are given the inclusion of automatic in metadata.
                actual_automatic_fields = {item.get("breadcrumb", ["properties", None])[1]
                                           for item in metadata
                                           if item.get("metadata").get("inclusion") == "automatic"}
                self.assertEqual(expected_automatic_fields,
                                 actual_automatic_fields,
                                 msg="expected {} automatic fields but got {}".format(
                                     expected_automatic_fields,
                                     actual_automatic_fields))

                # TODO |https://jira.talendforge.org/browse/TDL-17122
                #      Add test case for unsupported json object fields
                skip_available_streams = {
                    'PermissionSetEventStore', # rest
                    'CartDeliveryGroup', # bulk
                    'WebCart', # bulk
                }

                # BUG_TDL-9816 | https://jira.talendforge.org/browse/TDL-9816
                #                [tap-salesforce] discovered streams missing `inlcusion` values
                failing_available_streams = {
                    'StaticResource', 'Contract', 'ContentVersion', 'Scontrol',
                    'MobileApplicationDetail', 'EntityDefinition', 'User', 'Contact',
                    'Attachment', 'ContactPointAddress', 'MailmergeTemplate', 'Lead', 'Order',
                    'AlternativePaymentMethod', 'CardPaymentMethod', 'ServiceContract',
                    'ServiceTerritoryMember', 'ReportEvent', 'EmailCapture', 'ListViewEvent',
                    'WorkOrderLineItem', 'LeadCleanInfo', 'ServiceTerritory', 'DigitalWallet',
                    'ApiEvent', 'WorkOrder', 'ContactCleanInfo', 'ResourceAbsence', 'ReturnOrder',
                    'LegalEntity', 'PaymentMethod', 'EventLogFile', 'ServiceAppointment',
                    'DandBCompany', 'AccountCleanInfo', 'Organization', 'Document', 'Account',
                }

                # verify that all other fields have inclusion of available
                # This assumes there are no unsupported fields for SaaS sources
                if stream in failing_available_streams.union(skip_available_streams):
                    LOGGER.warning("Skipping 'metadata inclusion available' asssertion for %s", stream)
                else:   # BUG_TDL-9816 comment to reproduce
                    self.assertTrue(
                        all({item.get("metadata").get("inclusion") == "available"
                             for item in metadata
                             if item.get("breadcrumb", []) != []
                             and item.get("breadcrumb", ["properties", None])[1]
                             not in actual_automatic_fields}),
                        msg="Not all non key properties are set to available in metadata")


class DiscoveryTestRest(DiscoveryTest):
    """Test tap discovery mode with the REST API selected"""

    @staticmethod
    def name():
        return "tt_salesforce_disco_rest"

    def test_discovery(self):
        self.salesforce_api = 'REST'
        self.discovery_test()
