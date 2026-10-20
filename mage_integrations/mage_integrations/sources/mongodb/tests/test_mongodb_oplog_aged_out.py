import tap_tester.connections as connections
import tap_tester.menagerie   as menagerie
import tap_tester.runner      as runner
import os
import datetime
import unittest
import datetime
import pymongo
import string
import random
import time
import re
import pprint
import pdb
import bson
import singer
from functools import reduce
from singer import utils, metadata
from mongodb_common import drop_all_collections, get_test_connection, ensure_environment_variables_set
import decimal


RECORD_COUNT = {}


def random_string_generator(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for x in range(size))

def generate_simple_coll_docs(num_docs):
    docs = []
    for int_value in range(num_docs):
        docs.append({"int_field": int_value, "string_field": random_string_generator()})
    return docs

class MongoDBOplogAgedOut(unittest.TestCase):
    def setUp(self):
        ensure_environment_variables_set()

        with get_test_connection() as client:
            ############# Drop all dbs/collections #############
            drop_all_collections(client)

            ############# Add simple collections ############
            # simple_coll_1 has 50 documents
            client["simple_db"]["simple_coll_1"].insert_many(generate_simple_coll_docs(50))



    def expected_check_streams(self):
        return {
            'simple_db-simple_coll_1'
        }

    def expected_pks(self):
        return {
            'simple_coll_1': {'_id'}
        }

    def expected_row_counts(self):
        return {
            'simple_coll_1': 50
        }


    def expected_sync_streams(self):
        return {
            'simple_coll_1'
        }

    def name(self):
        return "tap_tester_mongodb_oplog_aged_out"

    def tap_name(self):
        return "tap-mongodb"

    def get_type(self):
        return "platform.mongodb"

    def get_credentials(self):
        return {'password': os.getenv('TAP_MONGODB_PASSWORD')}

    def get_properties(self):
        return {'host' : os.getenv('TAP_MONGODB_HOST'),
                'port' : os.getenv('TAP_MONGODB_PORT'),
                'user' : os.getenv('TAP_MONGODB_USER'),
                'database' : os.getenv('TAP_MONGODB_DBNAME')
        }


    def test_run(self):

        conn_id = connections.ensure_connection(self)

        #  -------------------------------
        # -----------  Discovery ----------
        #  -------------------------------

        # run in discovery mode
        check_job_name = runner.run_check_mode(self, conn_id)

        # verify check  exit codes
        exit_status = menagerie.get_exit_status(conn_id, check_job_name)
        menagerie.verify_check_exit_status(self, exit_status, check_job_name)

        # verify the tap discovered the right streams
        found_catalogs = menagerie.get_catalogs(conn_id)

        # assert we find the correct streams
        self.assertEqual(self.expected_check_streams(),
                         {c['tap_stream_id'] for c in found_catalogs})



        for tap_stream_id in self.expected_check_streams():
            found_stream = [c for c in found_catalogs if c['tap_stream_id'] == tap_stream_id][0]

            # assert that the pks are correct
            self.assertEqual(self.expected_pks()[found_stream['stream_name']],
                             set(found_stream.get('metadata', {}).get('table-key-properties')))

            # assert that the row counts are correct
            self.assertEqual(self.expected_row_counts()[found_stream['stream_name']],
                             found_stream.get('metadata', {}).get('row-count'))

        #  -----------------------------------
        # ----------- Full Table Sync ---------
        #  -----------------------------------
        # Select simple_coll_1 and simple_coll_2 streams and add replication method metadata
        for stream_catalog in found_catalogs:
            annotated_schema = menagerie.get_annotated_schema(conn_id, stream_catalog['stream_id'])
            additional_md = [{ "breadcrumb" : [], "metadata" : {'replication-method' : 'LOG_BASED'}}]
            selected_metadata = connections.select_catalog_and_fields_via_metadata(conn_id,
                                                                                    stream_catalog,
                                                                                    annotated_schema,
                                                                                    additional_md)
        # Synthesize interrupted state
        original_version = int(time.time() * 1000)
        interrupted_state = {
            'currently_syncing' : 'simple_db-simple_coll_1',
            'bookmarks' : {
                'simple_db-simple_coll_1': {
                    'version': original_version,
                    'initial_full_table_complete': True,
                    'oplog_ts_time': 1,
                    'oplog_ts_inc': 0
                }
            }
        }

        menagerie.set_state(conn_id, interrupted_state)

        # This should say the oplog has timed out and will execute a resync
        runner.run_sync_mode(self, conn_id)

        # verify the persisted schema was correct
        records_by_stream = runner.get_records_from_target_output()

        # assert that each of the streams that we synced are the ones that we expect to see
        record_count_by_stream = runner.examine_target_output_file(self,
                                                                   conn_id,
                                                                   self.expected_sync_streams(),
                                                                   self.expected_pks())

        # assert that we only have an ActivateVersionMessage as the last message and not the first
        for stream_name in self.expected_sync_streams():
            self.assertEqual('activate_version',records_by_stream[stream_name]['messages'][0]['action'])
            self.assertEqual('activate_version',records_by_stream[stream_name]['messages'][51]['action'])


        # assert that final state has no last_id_fetched and max_id_value bookmarks
        final_state = menagerie.get_state(conn_id)
        self.assertNotEqual(original_version, final_state.get('bookmarks', {}).get('simple_db-simple_coll_1', {}).get('version'))

        # assert that all rows in the collection were sync'd
        for stream_id, row_count in self.expected_row_counts().items():
            self.assertGreaterEqual(record_count_by_stream[stream_id], row_count)

        # assert that each stream has a initial_full_table_complete=True bookmark
        self.assertIsNotNone(final_state.get('bookmarks', {}).get('simple_db-simple_coll_1', {}).get('oplog_ts_time'))
        self.assertIsNotNone(final_state.get('bookmarks', {}).get('simple_db-simple_coll_1', {}).get('oplog_ts_inc'))
        self.assertTrue(final_state.get('bookmarks', {}).get('simple_db-simple_coll_1', {}).get('initial_full_table_complete'))
