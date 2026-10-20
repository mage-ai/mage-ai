import os
import uuid
import time
from datetime import timedelta

import tap_tester.connections as connections
import tap_tester.menagerie   as menagerie
import tap_tester.runner      as runner
from base import ZendeskTest
import unittest
from functools import reduce
from zenpy import Zenpy
from zenpy.lib.api_objects import Group, Organization, User

class ZendeskBookmarks(ZendeskTest):
    def name(self):
        return "tap_tester_zendesk_bookmarks"

    def expected_sync_streams(self):
        return {
            'groups',
            'organizations',
            'satisfaction_ratings',
            'users'
        }

    def expected_pks(self):
        return {
            'groups': {"id"},
            'organizations': {"id"},
            'satisfaction_ratings': {"id"},
            'users': {"id"}
        }

    def tearDown(self):
        # delete all the things you created.
        if not hasattr(self, "client"):
            return
        if hasattr(self, "created_group"):
            self.client.groups.delete(self.created_group)
        if hasattr(self, "created_org"):
            self.client.organizations.delete(self.created_org)
        if hasattr(self, "created_user"):
            self.client.users.delete(self.created_user)


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

        # Select our catalogs
        our_catalogs = [c for c in self.found_catalogs if c.get('tap_stream_id') in self.expected_sync_streams()]
        for catalog in our_catalogs:
            schema = menagerie.get_annotated_schema(conn_id, catalog['stream_id'])
            connections.select_catalog_and_fields_via_metadata(conn_id, catalog, schema, [], [])

        # Clear state before our run
        menagerie.set_state(conn_id, {})

        # Run a sync job using orchestrator
        # Verify exit status is 0 and verify rows were synced
        _ = self.run_and_verify_sync(conn_id)

        # Ensure all records have a value for PK(s)
        records = runner.get_records_from_target_output()
        for stream in self.expected_sync_streams():
            messages = records.get(stream, {}).get('messages', [])
            for m in messages:
                pk_set = self.expected_pks()[stream]
                for pk in pk_set:
                    self.assertIsNotNone(m.get('data', {}).get(pk), msg="oh no! {}".format(m))

        satisfaction_ratings_bookmark = "2020-03-05T14:14:42Z"

        state = menagerie.get_state(conn_id)
        state['bookmarks']['satisfaction_ratings']['updated_at'] = satisfaction_ratings_bookmark
        menagerie.set_state(conn_id, state)

        # Create a new record
        creds = {
            "email": "dev@stitchdata.com",
            "subdomain": self.get_properties()['subdomain'],
            "token": os.getenv('TAP_ZENDESK_API_TOKEN')
        }

        self.client = Zenpy(**creds)

        # Create some new objects
        group_name = str(uuid.uuid4())
        group = Group(name=group_name)
        self.created_group = self.client.groups.create(group)

        org_name = str(uuid.uuid4())
        org = Organization(name=org_name)
        self.created_org = self.client.organizations.create(org)

        user = User(name="John Doe", email="{}@mailinator.com".format(uuid.uuid4()))
        self.created_user = self.client.users.create(user)

        # Sleeping 1 minute to validate lookback behavior needed in tap
        # We've observed a delay between when users are created and when
        # they're available through the API
        print("sleeping for 60 seconds")
        time.sleep(60)

        # Run another Sync and verify it exits succesfully
        _ = self.run_and_verify_sync(conn_id)

        # Check both sets of records and make sure we have our new rows
        records = runner.get_records_from_target_output()
        messages = records.get('groups', {}).get('messages', [])
        new_record = [r for r in messages
                      if r['data']['id'] == self.created_group.id]
        self.assertTrue(any(new_record))
        self.assertEqual(len(messages), 2, msg="Sync'd incorrect count of messages: {}".format(len(messages)))

        messages = records.get('organizations', {}).get('messages', [])

        new_record = [r for r in messages
                      if r['data']['id'] == self.created_org.id]
        self.assertTrue(any(new_record))
        self.assertEqual(len(messages), 2, msg="Sync'd incorrect count of messages: {}".format(len(messages)))

        messages = records.get('users', {}).get('messages', [])
        new_record = [r for r in messages
                      if r['data']['id'] == self.created_user.id]
        self.assertTrue(any(new_record))
        # NB: GreaterEqual because we suspect Zendesk updates users in the backend
        # >= 1 because we're no longer inclusive of the last replicated user record. The lookback will control this going forward.
        # If we get the user we wanted and then some, this assertion should succeed
        self.assertGreaterEqual(len(messages), 1, msg="Sync'd incorrect count of messages: {}".format(len(messages)))


        messages = records.get('satisfaction_ratings', {}).get('messages', [])
        new_record = [r for r in messages
                      if r['data']['id'] in [364471784994, 364465631433, 364465212373]]
        self.assertTrue(any(new_record))
        self.assertGreaterEqual(len(messages), 3, msg="Sync'd incorrect count of messages: {}".format(len(messages)))
        for message in messages:
            self.assertGreaterEqual(message.get('data', {}).get('updated_at', ''),
                                    satisfaction_ratings_bookmark)

        # TODO NEW TEST: Ticket Audits/Comments, etc... -- make sure to test Audits+Comments selection permutations
        #       -- e.g., if Comments is selected, but not audits, ensure no audits data is emitted
