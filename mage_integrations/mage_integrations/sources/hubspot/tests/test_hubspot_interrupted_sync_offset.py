from datetime import datetime, timedelta
from time import sleep
import copy

import tap_tester.connections as connections
import tap_tester.menagerie   as menagerie
import tap_tester.runner      as runner

from base import HubspotBaseTest
from client import TestClient


class TestHubspotInterruptedSyncOffsetContactLists(HubspotBaseTest):
    """Testing interrupted syncs for streams that implement unique bookmarking logic."""
    @staticmethod
    def name():
        return "tt_hubspot_interrupt_contact_lists"

    def streams_to_test(self):
        """expected streams minus the streams not under test"""
        untested = {
            # Streams tested elsewhere
            'companies', # covered in TestHubspotInterruptedSync1
            'engagements', # covered in TestHubspotInterruptedSync1
            # Feature Request | TDL-16095: [tap-hubspot] All incremental
            #                   streams should implement the interruptible sync feature
            'forms', # TDL-16095
            'owners', # TDL-16095
            'workflows', # TDL-16095
            # Streams that do not apply
            'deal_pipelines', # interruptible does not apply, child of deals
            'campaigns', # unable to manually find a partial state with our test data
            'email_events', # unable to manually find a partial state with our test data
            'contacts_by_company', # interruptible does not apply, child of 'companies'
            'subscription_changes', # BUG_TDL-14938
        }

        return self.expected_streams() - untested

    def stream_to_interrupt(self):
        return 'contact_lists'

    def state_to_inject(self):
        return {'offset': {'offset': 250}}

    def get_properties(self):
        return {
            'start_date' : datetime.strftime(
                datetime.today()-timedelta(days=3), self.START_DATE_FORMAT
            ),
        }

    def setUp(self):
        self.maxDiff = None  # see all output in failure

    def test_run(self):

        # BUG TDL-16094 [tap-hubspot] `contacts` streams fails to recover from sync interruption
        if self.stream_to_interrupt() == 'contacts':
            self.skipTest("Skipping contacts TEST! See BUG[TDL-16094]")


        expected_streams = self.streams_to_test()

        conn_id = connections.ensure_connection(self)

        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # Select only the expected streams tables
        catalog_entries = [ce for ce in found_catalogs if ce['tap_stream_id'] in expected_streams]
        for catalog_entry in catalog_entries:
            stream_schema = menagerie.get_annotated_schema(conn_id, catalog_entry['stream_id'])
            connections.select_catalog_and_fields_via_metadata(
                conn_id,
                catalog_entry,
                stream_schema
            )

        # Run sync 1
        first_record_count_by_stream = self.run_and_verify_sync(conn_id)
        synced_records = runner.get_records_from_target_output()
        state_1 = menagerie.get_state(conn_id)

        # Update state to simulate a bookmark
        stream = self.stream_to_interrupt()
        new_state = copy.deepcopy(state_1)
        new_state['bookmarks'][stream] = self.state_to_inject()
        new_state['currently_syncing'] = stream
        menagerie.set_state(conn_id, new_state)

        # run second sync
        second_record_count_by_stream = self.run_and_verify_sync(conn_id)
        synced_records_2 = runner.get_records_from_target_output()
        state_2 = menagerie.get_state(conn_id)

        # verify the uninterrupted sync and the simulated resuming sync end with the same bookmark values
        with self.subTest(stream=stream):
            self.assertEqual(state_1, state_2)


class TestHubspotInterruptedSyncOffsetContacts(TestHubspotInterruptedSyncOffsetContactLists):
    """Testing interrupted syncs for streams that implement unique bookmarking logic."""
    @staticmethod
    def name():
        return "tt_hubspot_interrupt_contacts"

    def get_properties(self):
        return {
            'start_date' : '2021-10-01T00:00:00Z'
        }


    def stream_to_interrupt(self):
        return 'contacts'

    def state_to_inject(self):
        return {'offset': {'vidOffset': 3502}}

class TestHubspotInterruptedSyncOffsetDeals(TestHubspotInterruptedSyncOffsetContactLists):
    """Testing interrupted syncs for streams that implement unique bookmarking logic."""
    @staticmethod
    def name():
        return "tt_hubspot_interrupt_deals"

    def get_properties(self):
        return {
            'start_date' : '2021-10-10T00:00:00Z'
        }

    def stream_to_interrupt(self):
        return 'deals'

    def state_to_inject(self):
        return  {'property_hs_lastmodifieddate': '2021-10-13T08:32:08.383000Z',
                 'offset': {'offset': 3442973342}}
