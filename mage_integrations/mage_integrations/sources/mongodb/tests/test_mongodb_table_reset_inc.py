import os
import uuid
import decimal
import string
import bson
from datetime import datetime, timedelta
from unittest import TestCase

import pymongo

from tap_tester import connections, menagerie, runner
from mongodb_common import drop_all_collections, get_test_connection, ensure_environment_variables_set

RECORD_COUNT = {}
VALID_REPLICATION_TYPES = {'datetime', 'Int64', 'float', 'int', 'str', 'Timestamp', 'UUID'}

def z_string_generator(size=6):
    return 'z' * size

def generate_simple_coll_docs(num_docs):
    docs = []
    start_datetime = datetime(2018, 1, 1, 19, 29, 14, 578000)

    for int_value in range(num_docs):
        start_datetime = start_datetime + timedelta(days=5)
        docs.append({"int_field": int_value,
                     "string_field": z_string_generator(int_value),
                     "date_field": start_datetime,
                     "double_field": int_value+1.00001,
                     "timestamp_field": bson.timestamp.Timestamp(int_value+1565897157, 1),
                     "uuid_field": uuid.UUID('3e139ff5-d622-45c6-bf9e-1dfec7282{:03d}'.format(int_value)),
                     "64_bit_int_field": 34359738368 + int_value
                     })
    return docs

class MongoDBTableResetInc(TestCase):
    def key_names(self):
        return ['int_field',
                'string_field',
                'date_field',
                'timestamp_field',
                'uuid_field',
                '64_bit_int_field',
                'double_field']

    def setUp(self):
        ensure_environment_variables_set()

        with get_test_connection() as client:

            ############# Drop all dbs/collections #############
            drop_all_collections(client)

            ############# Add simple collections #############
            # simple_coll_1 has 50 documents]
            client["simple_db"]["simple_coll_1"].insert_many(generate_simple_coll_docs(50))

            # simple_coll_2 has 100 documents
            client["simple_db"]["simple_coll_2"].insert_many(generate_simple_coll_docs(100))

            ############# Add Index on date_field ############
            client["simple_db"]["simple_coll_1"].create_index([("date_field", pymongo.ASCENDING)])
            client["simple_db"]["simple_coll_2"].create_index([("date_field", pymongo.ASCENDING)])

            # Add simple_coll per key type
            for key_name in self.key_names():
                client["simple_db"]["simple_coll_{}".format(key_name)].insert_many(generate_simple_coll_docs(50))

                # add index on field
                client["simple_db"]["simple_coll_{}".format(key_name)].create_index([(key_name, pymongo.ASCENDING)])

    def expected_check_streams(self):
        return {
            'simple_db-simple_coll_1',
            'simple_db-simple_coll_2',
            *['simple_db-simple_coll_{}'.format(k) for k in self.key_names()]
        }

    def expected_pks(self):
        return {
            'simple_coll_1': {'_id'},
            'simple_coll_2': {'_id'},
            **{"simple_coll_{}".format(k): {'_id'} for k in self.key_names()}
        }

    def expected_valid_replication_keys(self):
        return {
            'simple_coll_1': {'_id', 'date_field'},
            'simple_coll_2': {'_id', 'date_field'},
            **{"simple_coll_{}".format(k): {'_id', k} for k in self.key_names()}
        }

    def expected_row_counts(self):
        return {
            'simple_coll_1': 50,
            'simple_coll_2': 100,
            **{"simple_coll_{}".format(k): 50 for k in self.key_names()}
        }

    def expected_sync_streams(self):
        return {
            'simple_coll_1',
            'simple_coll_2',
            *['simple_coll_{}'.format(k) for k in self.key_names()]
        }

    def name(self):
        return "tap_tester_mongodb_table_reset_inc"

    def tap_name(self):
        return "tap-mongodb"

    def get_type(self):
        return "platform.mongodb"

    def get_credentials(self):
        return {'password': os.getenv('TAP_MONGODB_PASSWORD')}

    def get_properties(self):
        return {'host': os.getenv('TAP_MONGODB_HOST'),
                'port': os.getenv('TAP_MONGODB_PORT'),
                'user': os.getenv('TAP_MONGODB_USER'),
                'database': os.getenv('TAP_MONGODB_DBNAME')
                }

    def test_run(self):

        conn_id = connections.ensure_connection(self)

        #  ---------------------------------
        #  -----------  Discovery ----------
        #  ---------------------------------

        # run in discovery mode
        check_job_name = runner.run_check_mode(self, conn_id)

        # verify check  exit codes
        exit_status = menagerie.get_exit_status(conn_id, check_job_name)
        menagerie.verify_check_exit_status(self, exit_status, check_job_name)

        # verify the tap discovered the right streams
        catalog = menagerie.get_catalog(conn_id)
        found_catalogs = menagerie.get_catalogs(conn_id)
        found_streams = {entry['tap_stream_id'] for entry in catalog['streams']}
        self.assertSetEqual(self.expected_check_streams(), found_streams)

        # verify the tap discovered stream metadata is consistent with the source database
        for tap_stream_id in self.expected_check_streams():
            with self.subTest(stream=tap_stream_id):

                # gather expectations
                stream = tap_stream_id.split('-')[1]
                expected_primary_key = self.expected_pks()[stream]
                expected_row_count = self.expected_row_counts()[stream]
                expected_replication_keys = self.expected_valid_replication_keys()[stream]

                # gather results
                found_stream = [entry for entry in catalog['streams'] if entry['tap_stream_id'] == tap_stream_id][0]
                stream_metadata = [entry['metadata'] for entry in found_stream['metadata'] if entry['breadcrumb']==[]][0]
                primary_key = set(stream_metadata.get('table-key-properties'))
                row_count = stream_metadata.get('row-count')
                replication_key = set(stream_metadata.get('valid-replication-keys'))

                # assert that the pks are correct
                self.assertSetEqual(expected_primary_key, primary_key)

                # assert that the row counts are correct
                self.assertEqual(expected_row_count, row_count)

                # assert that valid replication keys are correct
                self.assertSetEqual(replication_key, expected_replication_keys)

        #  -----------------------------------
        #  ----------- Initial Sync ----------
        #  -----------------------------------

        # Select simple_coll_1 and simple_coll_2 streams and add replication method metadata
        for stream_catalog in found_catalogs:
            annotated_schema = menagerie.get_annotated_schema(conn_id, stream_catalog['stream_id'])
            rep_key = 'date_field'
            for key in self.key_names():
                if key in stream_catalog['stream_name']:
                    rep_key = key
            additional_md = [{ "breadcrumb" : [], "metadata" : {'replication-method' : 'INCREMENTAL',
                                                                'replication-key': rep_key}}]
            selected_metadata = connections.select_catalog_and_fields_via_metadata(conn_id,
                                                                                   stream_catalog,
                                                                                   annotated_schema,
                                                                                   additional_md)

        # Run sync
        sync_job_name = runner.run_sync_mode(self, conn_id)

        exit_status = menagerie.get_exit_status(conn_id, sync_job_name)
        menagerie.verify_sync_exit_status(self, exit_status, sync_job_name)

        # verify the persisted schema was correct
        messages_by_stream = runner.get_records_from_target_output()

        # gather expectations
        expected_schema = {'type': 'object'}

        for tap_stream_id in self.expected_sync_streams():
            with self.subTest(stream=tap_stream_id):

                # gather results
                persisted_schema = messages_by_stream[tap_stream_id]['schema']

                # assert the schema is an object
                self.assertDictEqual(expected_schema, persisted_schema)

        # verify that each of the streams that we synced are the ones that we expect to see
        record_count_by_stream = runner.examine_target_output_file(self,
                                                                   conn_id,
                                                                   self.expected_sync_streams(),
                                                                   self.expected_pks())

        # verify that the entire collection was synced by comparing row counts against the source
        for tap_stream_id in self.expected_sync_streams():
            with self.subTest(stream=tap_stream_id):

                expected_row_count = self.expected_row_counts()[tap_stream_id]
                row_count = record_count_by_stream[tap_stream_id]

                self.assertEqual(expected_row_count, row_count)


        # -----------------------------------
        # ------------ Second Sync ----------
        # -----------------------------------

        # Perform state manipulation for one stream to simulate a talbe reset
        state = menagerie.get_state(conn_id)
        reset_stream = 'simple_db-simple_coll_int_field'
        state['bookmarks'].pop(reset_stream)
        menagerie.set_state(conn_id, state)

        # Run sync 2
        sync_job_name = runner.run_sync_mode(self, conn_id)
        exit_status = menagerie.get_exit_status(conn_id, sync_job_name)
        menagerie.verify_sync_exit_status(self, exit_status, sync_job_name)

        # verify state is saved in the proper format for all streams
        state = menagerie.get_state(conn_id)
        expected_state_keys = {
            'last_replication_method',
            'replication_key_name',
            'replication_key_type',
            'replication_key_value',
            'version',
        }
        for tap_stream_id in self.expected_check_streams():
            with self.subTest(stream=tap_stream_id):
                bookmark = state['bookmarks'][tap_stream_id]

                # gather expectations
                stream = tap_stream_id.split('-')[1]
                expected_replication_keys = self.expected_valid_replication_keys()[stream]

                # gather results
                replication_key = bookmark['replication_key_name']
                replication_key_type = bookmark['replication_key_type']

                # assert that all expected bookmark keys are present
                self.assertSetEqual(expected_state_keys, set(bookmark.keys()))

                # assert all bookmark keys have values
                for key in expected_state_keys:
                    self.assertIsNotNone(bookmark[key])

                # assert incremental sync was performed
                self.assertEqual('INCREMENTAL', bookmark['last_replication_method'])

                # assert the replication key was used to save state
                self.assertIn(replication_key, expected_replication_keys)

                # assert the replication key type is a valid datatype
                self.assertIn(replication_key_type, VALID_REPLICATION_TYPES)

                self.assertIsNone(state['currently_syncing'])

        # verify the persisted schema was correct
        messages_by_stream = runner.get_records_from_target_output()
        records_by_stream = {}
        for stream_name in self.expected_sync_streams():
            records_by_stream[stream_name] = [x for x in messages_by_stream[stream_name]['messages'] if x.get('action') == 'upsert']

        # assert that each of the streams that we synced are the ones that we expect to see
        record_count_by_stream = runner.examine_target_output_file(self,
                                                                   conn_id,
                                                                   self.expected_sync_streams(),
                                                                   self.expected_pks())

        # Verify we got 1 record for non reset streams and all records for the reset stream
        # 1 record because of the >= [for key based incremental there will always be overlap on the bookmark value]
        for k, v in record_count_by_stream.items():
            if k != 'simple_coll_int_field':
                self.assertEqual(1, v) # non reset streams
            if k == 'simple_coll_int_field':
                self.assertEqual(50, v) # reset stream
