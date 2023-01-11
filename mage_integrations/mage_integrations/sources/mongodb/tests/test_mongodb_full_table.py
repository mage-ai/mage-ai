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

class MongoDBFullTable(unittest.TestCase):
    def setUp(self):
        ensure_environment_variables_set()

        with get_test_connection() as client:
            # drop all dbs/collections
            drop_all_collections(client)

            # simple_coll_1 has 50 documents
            client["simple_db"]["simple_coll_1"].insert_many(generate_simple_coll_docs(50))

            # create view on simple_coll_1
            client["simple_db"].command(bson.son.SON([("create", "simple_view_1"), ("viewOn", "simple_coll_1"), ("pipeline", [])]))

            # simple_coll_2 has 100 documents
            client["simple_db"]["simple_coll_2"].insert_many(generate_simple_coll_docs(100))

            # admin_coll_1 has 50 documents
            client["admin"]["admin_coll_1"].insert_many(generate_simple_coll_docs(50))

            # simple_coll_3 is an empty collection
            client["simple_db"].create_collection("simple_coll_3")

            # simple_coll_4 has documents with special chars and a lot of nesting
            client["simple_db"]["simple_coll_4"].insert_one({"hebrew_ישרא": "hebrew_ישרא"})
            client["simple_db"]["simple_coll_4"].insert_one({"hebrew_ישרא": 2})
            client["simple_db"]["simple_coll_4"].insert_one({"another_hebrew_ישראל": "another_hebrew_ישרא"})
            nested_doc = {"field0": {}}
            current_doc = nested_doc
            for i in range(1, 101):
                current_doc["field{}".format(i-1)]["field{}".format(i)] = {}
                current_doc = current_doc["field{}".format(i-1)]
            current_doc["field100"] = "some_value"
            client["simple_db"]["simple_coll_4"].insert_one(nested_doc)

            max_col_doc = {}
            for x in range(1600):
                max_col_doc['col_{}'.format(x)] = x
            client["simple_db"]["simple_coll_4"].insert_one(max_col_doc)




    def tap_stream_id_to_stream(self):
        return {
            'simple_db-simple_coll_1': 'simple_db_simple_coll_1',
            'simple_db-simple_coll_2': 'simple_db_simple_coll_2',
            'simple_db-simple_coll_3': 'simple_db_simple_coll_3',
            'simple_db-simple_coll_4': 'simple_db_simple_coll_4',
            'admin-admin_coll_1': 'admin_admin_coll_1'
        }

    def expected_check_streams(self):
        return {
            'simple_db-simple_coll_1',
            'simple_db-simple_coll_2',
            'simple_db-simple_coll_3',
            'simple_db-simple_coll_4',
            'admin-admin_coll_1'
        }

    def expected_pks(self):
        return {
            'simple_db_simple_coll_1': {'_id'},
            'simple_db_simple_coll_2': {'_id'},
            'simple_db_simple_coll_3': {'_id'},
            'simple_db_simple_coll_4': {'_id'},
            'admin_admin_coll_1': {'_id'}
        }

    def expected_row_counts(self):
        return {
            'simple_db_simple_coll_1': 50,
            'simple_db_simple_coll_2': 100,
            'simple_db_simple_coll_3': 0,
            'simple_db_simple_coll_4': 5,
            'admin_admin_coll_1': 50
        }

    def expected_sync_streams(self):
        return {
            'simple_db_simple_coll_1',
            'simple_db_simple_coll_2',
            'simple_db_simple_coll_3',
            'simple_db_simple_coll_4',
            'admin_admin_coll_1'
        }

    def name(self):
        return "tap_tester_mongodb_full_table"

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
                'database' : os.getenv('TAP_MONGODB_DBNAME'),
                'include_schemas_in_destination_stream_name': 'true'
        }

    def test_run(self):

        conn_id = connections.ensure_connection(self)

        #  -------------------------------
        # -----------  Discovery ----------
        #  -------------------------------

        # run in discovery mode
        check_job_name = runner.run_check_mode(self, conn_id)

        # verify check exit codes
        exit_status = menagerie.get_exit_status(conn_id, check_job_name)
        menagerie.verify_check_exit_status(self, exit_status, check_job_name)

        # verify the tap discovered the right streams
        found_catalogs = menagerie.get_catalogs(conn_id)

        # assert we find the correct streams
        self.assertEqual(self.expected_check_streams(),
                         {c['tap_stream_id'] for c in found_catalogs})

        #  -------------------------------------------
        #  ----------- First full Table Sync ---------
        #  -------------------------------------------
        # Select simple_coll_1 and simple_coll_2 streams and add replication method metadata
        for stream_catalog in found_catalogs:
            annotated_schema = menagerie.get_annotated_schema(conn_id, stream_catalog['stream_id'])
            additional_md = [{ "breadcrumb" : [], "metadata" : {'replication-method' : 'FULL_TABLE'}}]
            selected_metadata = connections.select_catalog_and_fields_via_metadata(conn_id,
                                                                                    stream_catalog,
                                                                                    annotated_schema,
                                                                                    additional_md)

        # run full table sync
        sync_job_name = runner.run_sync_mode(self, conn_id)

        # check exit status
        exit_status = menagerie.get_exit_status(conn_id, sync_job_name)
        menagerie.verify_sync_exit_status(self, exit_status, sync_job_name)

        # streams that we synced are the ones that we expect to see
        records_by_stream = runner.get_records_from_target_output()
        record_count_by_stream = runner.examine_target_output_file(self,
                                                                   conn_id,
                                                                   self.expected_sync_streams(),
                                                                   self.expected_pks())

        # assert that we get the correct number of records for each stream
        self.assertEqual(self.expected_row_counts(),record_count_by_stream)

        # assert that an activate_version_message is first and last message sent for each stream
        for stream_name in self.expected_sync_streams():
            self.assertEqual('activate_version',records_by_stream[stream_name]['messages'][0]['action'])
            self.assertEqual('activate_version',records_by_stream[stream_name]['messages'][-1]['action'])

        state = menagerie.get_state(conn_id)

        first_versions = {}

        for tap_stream_id in self.expected_check_streams():

            # state has an initial_full_table_complete == True
            self.assertTrue(state['bookmarks'][tap_stream_id]['initial_full_table_complete'])

            # there is a version bookmark in state
            first_versions[tap_stream_id] = state['bookmarks'][tap_stream_id]['version']
            self.assertIsNotNone(first_versions[tap_stream_id])

        #  -------------------------------------------
        #  ----------- Second full Table Sync ---------
        #  -------------------------------------------
        with get_test_connection() as client:
            # update existing documents in the collection to make sure we get the updates as well in the next sync
            doc_to_update = client["simple_db"]["simple_coll_1"].find_one()
            client["simple_db"]["simple_coll_1"].find_one_and_update({"_id": doc_to_update["_id"]}, {"$set": {"int_field": 999}})

            doc_to_update = client["simple_db"]["simple_coll_2"].find_one()
            client["simple_db"]["simple_coll_2"].find_one_and_update({"_id": doc_to_update["_id"]}, {"$set": {"int_field": 888}})

            doc_to_update = client["admin"]["admin_coll_1"].find_one()
            client["admin"]["admin_coll_1"].find_one_and_update({"_id": doc_to_update["_id"]}, {"$set": {"int_field": 777}})

            # add 2 rows and run full table again, make sure we get initial number + 2
            client["simple_db"]["simple_coll_1"].insert_many(generate_simple_coll_docs(2))

            client["simple_db"]["simple_coll_2"].insert_many(generate_simple_coll_docs(2))

            client["admin"]["admin_coll_1"].insert_many(generate_simple_coll_docs(2))

        sync_job_name = runner.run_sync_mode(self, conn_id)

        # check exit status
        exit_status = menagerie.get_exit_status(conn_id, sync_job_name)
        menagerie.verify_sync_exit_status(self, exit_status, sync_job_name)

        # verify the persisted schema was correct
        records_by_stream = runner.get_records_from_target_output()

        # assert that each of the streams that we synced are the ones that we expect to see
        record_count_by_stream = runner.examine_target_output_file(self,
                                                                   conn_id,
                                                                   self.expected_sync_streams(),
                                                                   self.expected_pks())

        state = menagerie.get_state(conn_id)

        # Verify  that menagerie state does not include a key for currently syncing
        self.assertIsNone(state['currently_syncing'])

        # Verify that menagerie state does not include a key for oplog based syncing
        self.assertNotIn('oplog', state)

        # assert that we have correct number of records (including the two new records and the update which is to be resynced)
        new_expected_row_counts = {k: v+2 for k, v in self.expected_row_counts().items() if k not in ['simple_db_simple_coll_3',
                                                                                                    'simple_db_simple_coll_4']}
        new_expected_row_counts['simple_db_simple_coll_3']=0
        new_expected_row_counts['simple_db_simple_coll_4']=5
        self.assertEqual(new_expected_row_counts, record_count_by_stream)

        # assert that we only have an ActivateVersionMessage as the last message and not the first
        for stream_name in self.expected_sync_streams():
            if len(records_by_stream[stream_name]['messages']) > 1:
                self.assertNotEqual('activate_version', records_by_stream[stream_name]['messages'][0]['action'], stream_name + "failed")
                self.assertEqual('upsert', records_by_stream[stream_name]['messages'][0]['action'], stream_name + "failed")
            self.assertEqual('activate_version', records_by_stream[stream_name]['messages'][-1]['action'], stream_name + "failed")

        second_versions = {}
        for tap_stream_id in self.expected_check_streams():
            found_stream = [c for c in found_catalogs if c['tap_stream_id'] == tap_stream_id][0]

            # state has an initial_full_table_complete == True
            self.assertTrue(state['bookmarks'][tap_stream_id]['initial_full_table_complete'])

            # version bookmark
            second_versions[tap_stream_id] = state['bookmarks'][tap_stream_id]['version']
            self.assertIsNotNone(second_versions[tap_stream_id])

            # version in this state is different than that of the previous state
            self.assertNotEqual(first_versions[tap_stream_id], second_versions[tap_stream_id])

            # version which is larger than the previous target version
            self.assertGreater(second_versions[tap_stream_id], first_versions[tap_stream_id])

            # verify that menagerie state does include the version which matches the target version
            self.assertEqual(records_by_stream[self.tap_stream_id_to_stream()[tap_stream_id]]['table_version'], second_versions[tap_stream_id])
