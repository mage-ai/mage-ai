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
from bson import ObjectId
from functools import reduce
from pymongo import ASCENDING
from mongodb_common import drop_all_collections, get_test_connection, ensure_environment_variables_set
import decimal


RECORD_COUNT = {}


def random_string_generator(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for x in range(size))

def generate_simple_coll_docs(num_docs):
    docs = []
    populated_string_fields = {f"string_field_{i}": random_string_generator() for i in range(1, 64)}
    for int_value in range(num_docs):
        docs.append({"int_field": int_value, **populated_string_fields})
    return docs

class MongoDBOplog(unittest.TestCase):
    def setUp(self):

        ensure_environment_variables_set()

        with get_test_connection() as client:
            ############# Drop all dbs/collections #############
            drop_all_collections(client)

            ############# Add simple collections #############
            # simple_coll_1 has 50 documents
            client["simple_db"]["simple_coll_1"].insert_many(generate_simple_coll_docs(50))

            # simple_coll_2 has 100 documents
            client["simple_db"]["simple_coll_2"].insert_many(generate_simple_coll_docs(100))

            for index in self.expected_string_fields():
                client["simple_db"]["simple_coll_1"].create_index(index)

            # # max 32 fields in a compound index (NO PLANS TO SUPPORT THIS IN THE TAP)
            # client["simple_db"]["simple_coll_1"].create_index([
            #     ('string_field', pymongo.ASCENDING), ('string_field_02', pymongo.ASCENDING),
            #     ('string_field_03', pymongo.ASCENDING), ('string_field_04', pymongo.ASCENDING),
            #     ('string_field_05', pymongo.ASCENDING), ('string_field_06', pymongo.ASCENDING),
            #     ('string_field_07', pymongo.ASCENDING), ('string_field_08', pymongo.ASCENDING),
            #     ('string_field_09', pymongo.ASCENDING), ('string_field_10', pymongo.ASCENDING),
            #     ('string_field_11', pymongo.ASCENDING), ('string_field_12', pymongo.ASCENDING),
            #     ('string_field_13', pymongo.ASCENDING), ('string_field_14', pymongo.ASCENDING),
            #     ('string_field_15', pymongo.ASCENDING), ('string_field_16', pymongo.ASCENDING),
            #     ('string_field_17', pymongo.ASCENDING), ('string_field_18', pymongo.ASCENDING),
            #     ('string_field_19', pymongo.ASCENDING), ('string_field_20', pymongo.ASCENDING),
            #     ('string_field_21', pymongo.ASCENDING), ('string_field_22', pymongo.ASCENDING),
            #     ('string_field_23', pymongo.ASCENDING), ('string_field_24', pymongo.ASCENDING),
            #     ('string_field_25', pymongo.ASCENDING), ('string_field_26', pymongo.ASCENDING),
            #     ('string_field_27', pymongo.ASCENDING), ('string_field_28', pymongo.ASCENDING),
            #     ('string_field_29', pymongo.ASCENDING), ('string_field_30', pymongo.ASCENDING),
            #     ('string_field_31', pymongo.ASCENDING), ('string_field_32', pymongo.ASCENDING)])

            self.index_info = client["simple_db"]["simple_coll_1"].index_information()

    def expected_check_streams(self):
        return {
            'simple_db-simple_coll_1',
            'simple_db-simple_coll_2',
        }

    def expected_pks(self):
        return {
            'simple_coll_1': {'_id'},
            'simple_coll_2': {'_id'},
        }

    def expected_row_counts(self):
        return {
            'simple_coll_1': 50,
            'simple_coll_2': 100,
        }

    def expected_sync_streams(self):
        return {
            'simple_coll_1',
            'simple_coll_2'
        }

    def name(self):
        return "tap_tester_mongodb_index"

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

    def expected_string_fields(self):
        # Max index count = 64.  63 strings + '_id'
        return {f"string_field_{i}" for i in range(1, 64)}


    def test_run(self):

        conn_id = connections.ensure_connection(self)

        #  -----------------------------------
        #  -----------  Discovery ------------
        #  -----------------------------------

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

        # no plans for tap to support compound index, may not appear in valid-replication-keys list
        discovered_replication_keys = found_catalogs[0]['metadata']['valid-replication-keys']
        for field in self.expected_string_fields():
            self.assertIn(field, discovered_replication_keys)
        self.assertIn('_id', discovered_replication_keys)
        self.assertEqual(64, len(discovered_replication_keys))
