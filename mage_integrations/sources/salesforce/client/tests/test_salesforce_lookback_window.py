from datetime import datetime, timedelta
from tap_tester import connections, runner, menagerie
from base import SalesforceBaseTest

class SalesforceLookbackWindow(SalesforceBaseTest):

    # subtract the desired amount of seconds form the date and return
    def get_simulated_date(self, dtime, format, seconds=0):
        date_stripped = datetime.strptime(dtime, format)
        return_date = date_stripped - timedelta(seconds=seconds)

        return datetime.strftime(return_date, format)

    @staticmethod
    def name():
        return 'tap_tester_salesforce_lookback_window'

    def get_properties(self):  # pylint: disable=arguments-differ
        return {
            'start_date' : '2021-11-10T00:00:00Z',
            'instance_url': 'https://singer2-dev-ed.my.salesforce.com',
            'select_fields_by_default': 'true',
            'api_type': self.salesforce_api,
            'is_sandbox': 'false',
            'lookback_window': 86400
        }

    def expected_sync_streams(self):
        return {
            'Account'
        }

    def run_test(self):
        # create connection
        conn_id = connections.ensure_connection(self)
        # create state file
        state = {
            'bookmarks':{
                'Account': {
                    'SystemModstamp': '2021-11-12T00:00:00.000000Z'
                }
            }
        }
        # set state file to run in sync mode
        menagerie.set_state(conn_id, state)

        # run in check mode
        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # select certain catalogs
        expected_streams = self.expected_sync_streams()
        catalog_entries = [catalog for catalog in found_catalogs
                            if catalog.get('tap_stream_id') in expected_streams]

        # stream and field selection
        self.select_all_streams_and_fields(conn_id, catalog_entries)

        # make 'Account' stream as INCREMENTAL to use lookback window
        self.set_replication_methods(conn_id, catalog_entries, {'Account': self.INCREMENTAL})

        # run sync
        self.run_and_verify_sync(conn_id)

        # get synced records
        sync_records = runner.get_records_from_target_output()

        # get replication keys
        expected_replication_keys = self.expected_replication_keys()

        # get bookmark ie. date from which the sync started
        bookmark = state.get('bookmarks').get('Account').get('SystemModstamp')
        # calculate the simulated bookmark by subtracting lookback window seconds
        bookmark_with_lookback_window = self.get_simulated_date(bookmark, format=self.BOOKMARK_COMPARISON_FORMAT, seconds=self.get_properties()['lookback_window'])

        for stream in expected_streams:
            with self.subTest(stream=stream):

                # get replication key for stream
                replication_key = list(expected_replication_keys[stream])[0]

                # get records
                records = [record.get('data') for record in sync_records.get(stream).get('messages')
                           if record.get('action') == 'upsert']

                # verify if we get records in ASCENDING order:
                #   every record's date should be lesser than the next record's date
                for i in range(len(records) - 1):
                    self.assertLessEqual(self.parse_date(records[i].get(replication_key)), self.parse_date(records[i+1].get(replication_key)))

                # Verify the sync records respect the (simulated) bookmark value
                for record in records:
                    self.assertGreaterEqual(self.parse_date(record.get(replication_key)), self.parse_date(bookmark_with_lookback_window),
                                            msg='The record does not respect the lookback window.')

                # check if the 1st record is between lookback date and bookmark:
                #   lookback_date <= record < bookmark (state file date when sync started)
                self.assertLessEqual(self.parse_date(bookmark_with_lookback_window), self.parse_date(records[0].get(replication_key)))
                self.assertLess(self.parse_date(records[0].get(replication_key)), self.parse_date(bookmark))

    def test_run(self):
        # run with REST API
        self.salesforce_api = 'REST'
        self.run_test()

        # run with BULK API
        self.salesforce_api = 'BULK'
        self.run_test()
