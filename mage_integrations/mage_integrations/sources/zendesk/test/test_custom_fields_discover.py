from tap_tester import menagerie, connections, runner

from base import ZendeskTest

class ZendeskCustomFieldsDiscover(ZendeskTest):
    def name(self):
        return "tap_tester_zendesk_custom_fields_discover"

    def test_run(self):
        # Default test setup
        # Create the connection for Zendesk
        conn_id = connections.ensure_connection(self)

        # Run a check job using orchestrator
        check_job_name = runner.run_check_mode(self, conn_id)
        exit_status = menagerie.get_exit_status(conn_id, check_job_name)
        menagerie.verify_check_exit_status(self, exit_status, check_job_name)

        # Verify schemas discovered were discovered
        self.found_catalogs = menagerie.get_catalogs(conn_id)
        self.assertEqual(len(self.found_catalogs), len(self.expected_check_streams()))

        # Verify the schemas discovered were exactly what we expect
        found_catalog_names = {catalog['tap_stream_id']
                               for catalog in self.found_catalogs
                               if catalog['tap_stream_id'] in self.expected_check_streams()}
        self.assertSetEqual(self.expected_check_streams(), found_catalog_names)

        # Get the Streams for Organizations and Users
        streams = [c for c in self.found_catalogs if c['stream_name'] in ['organizations', 'users']]

        # Create an array of arrays where the first element is the word minus the last letter ie: "organization"
        # and the second element is the annotated schema
        schemas = [(s['stream_name'][:-1], menagerie.get_annotated_schema(conn_id, s['stream_id'])) for s in streams]

        # Loop over them
        for schema in schemas:
            properties = schema[1]['annotated-schema']['properties']
            # Ensure that "organization_fields" or "user_fields" are objects in the annotated schema
            # with their own set of properties
            self.assertIsNotNone(properties.get('{}_fields'.format(schema[0]), {}).get('properties'),
                                 msg='{}_fields not present in schema!'.format(schema[0]))

