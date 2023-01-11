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
from mongodb_common import drop_all_collections, get_test_connection, ensure_environment_variables_set
import decimal


RECORD_COUNT = {}


def random_string_generator(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for x in range(size))

def generate_simple_coll_docs(num_docs):
    docs = []
    for int_value in range(num_docs):
        # TDL-20088. Version 4.2 does not support leading "." or leading "$" in
        # field names. Also unsupported: use of field names with "." in find() queries
        docs.append({"int.field": int_value, "string$field": random_string_generator()})
    return docs

class MongoDBFieldNameRestrictions(unittest.TestCase):
    ''' Test edge case field name restrictions per the documentation (use of '.' and '$')
        Reference https://jira.talendforge.org/browse/TDL-18990 for details  '''

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
        return "tap_tester_mongodb_fname_restrict"

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

        #  ---------------------------------
        #  -----------  Discovery ----------
        #  ---------------------------------

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

        #  ----------------------------------------
        #  ----------- Initial Full Table ---------
        #  ----------------------------------------

        # Select simple_coll_1 and simple_coll_2 streams and add replication method metadata
        for stream_catalog in found_catalogs:
            annotated_schema = menagerie.get_annotated_schema(conn_id, stream_catalog['stream_id'])
            additional_md = [{ "breadcrumb" : [], "metadata" : {'replication-method' : 'LOG_BASED'}}]
            selected_metadata = connections.select_catalog_and_fields_via_metadata(conn_id,
                                                                                    stream_catalog,
                                                                                    annotated_schema,
                                                                                    additional_md)

        # Run sync
        sync_job_name = runner.run_sync_mode(self, conn_id)

        exit_status = menagerie.get_exit_status(conn_id, sync_job_name)
        menagerie.verify_sync_exit_status(self, exit_status, sync_job_name)

        # verify the persisted schema was correct
        records_by_stream = runner.get_records_from_target_output()

        # assert that each of the streams that we synced are the ones that we expect to see
        record_count_by_stream = runner.examine_target_output_file(self,
                                                                   conn_id,
                                                                   self.expected_sync_streams(),
                                                                   self.expected_pks())

        # Verify that the full table was synced
        for tap_stream_id in self.expected_sync_streams():
            self.assertGreaterEqual(record_count_by_stream[tap_stream_id],self.expected_row_counts()[tap_stream_id])

        # Verify that we have 'initial_full_table_complete' bookmark
        state = menagerie.get_state(conn_id)
        first_versions = {}

        for tap_stream_id in self.expected_check_streams():
            # assert that the state has an initial_full_table_complete == True
            self.assertTrue(state['bookmarks'][tap_stream_id]['initial_full_table_complete'])
            # assert that there is a version bookmark in state
            first_versions[tap_stream_id] = state['bookmarks'][tap_stream_id]['version']
            self.assertIsNotNone(first_versions[tap_stream_id])
            # Verify that we have a oplog_ts_time and oplog_ts_inc bookmark
            self.assertIsNotNone(state['bookmarks'][tap_stream_id]['oplog_ts_time'])
            self.assertIsNotNone(state['bookmarks'][tap_stream_id]['oplog_ts_inc'])

        changed_ids = set()
        with get_test_connection() as client:
            # Delete two documents for each collection
            object_id = client['simple_db']['simple_coll_1'].find()[0]['_id']
            changed_ids.add(object_id)
            client["simple_db"]["simple_coll_1"].delete_one({'_id': object_id})

            object_id = client['simple_db']['simple_coll_1'].find()[1]['_id']
            changed_ids.add(object_id)
            client["simple_db"]["simple_coll_1"].delete_one({'_id': object_id})

            object_id = client['simple_db']['simple_coll_2'].find()[0]['_id']
            changed_ids.add(object_id)
            client["simple_db"]["simple_coll_2"].delete_one({'_id': object_id})

            object_id = client['simple_db']['simple_coll_2'].find()[1]['_id']
            changed_ids.add(object_id)
            client["simple_db"]["simple_coll_2"].delete_one({'_id': object_id})

            # Update two documents for each collection

            # curor objects do not support negative indicies so set indicies for last two records
            num_records = client['simple_db']['simple_coll_1'].find().count()
            last_index = num_records - 1
            sec_last_index = num_records -2

            # Not supported in mongodb 4.2 TDL-20088
            # object_id = client['simple_db']['simple_coll_1'].find()[sec_last_index]['_id'] # int.field 48
            # changed_ids.add(object_id)
            # client["simple_db"]["simple_coll_1"].update_one({'_id': object_id},{'$set': {'int.field': -1}})

            object_id = client['simple_db']['simple_coll_1'].find()[last_index]['_id'] # int.field 49
            changed_ids.add(object_id)
            client["simple_db"]["simple_coll_1"].update_one({'_id': object_id},{'$set': {'string$field': "Updated_1"}})

            num_records = client['simple_db']['simple_coll_2'].find().count()
            last_index = num_records - 1
            sec_last_index = num_records - 2

            # Not supported in mongodb 4.2 TDL-20088
            # object_id = client['simple_db']['simple_coll_2'].find()[sec_last_index]['_id'] # int.field 98
            # changed_ids.add(object_id)
            # client["simple_db"]["simple_coll_2"].update_one({'_id': object_id},{'$set': {'int.field': -1}})

            object_id = client['simple_db']['simple_coll_2'].find()[last_index]['_id'] # int.field 99
            changed_ids.add(object_id)
            client["simple_db"]["simple_coll_2"].update_one({'_id': object_id},{'$set': {'string$field': "Updated_2"}})

            # Insert two documents for each collection
            last_index = client['simple_db']['simple_coll_1'].find().count()
            client["simple_db"]["simple_coll_1"].insert_one({"int.field": 50, "string$field": random_string_generator()})
            object_id = client["simple_db"]["simple_coll_1"].find()[last_index]['_id']
            changed_ids.add(object_id)

            last_index += 1 # inserting a new item
            client["simple_db"]["simple_coll_1"].insert_one({"int.field": 51, "string$field": random_string_generator()})
            object_id = client["simple_db"]["simple_coll_1"].find()[last_index]['_id']
            changed_ids.add(object_id)

            last_index = client['simple_db']['simple_coll_2'].find().count()
            client["simple_db"]["simple_coll_2"].insert_one({"int.field": 100, "string$field": random_string_generator()})
            object_id = client["simple_db"]["simple_coll_2"].find()[last_index]['_id']
            changed_ids.add(object_id)

            last_index += 1
            client["simple_db"]["simple_coll_2"].insert_one({"int.field": 101, "string$field": random_string_generator()})
            object_id = client["simple_db"]["simple_coll_2"].find()[last_index]['_id']
            changed_ids.add(object_id)

        #  -------------------------------------------
        #  ----------- Subsequent Oplog Sync ---------
        #  -------------------------------------------

        # Run sync
        sync_job_name = runner.run_sync_mode(self, conn_id)

        exit_status = menagerie.get_exit_status(conn_id, sync_job_name)
        menagerie.verify_sync_exit_status(self, exit_status, sync_job_name)

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

        # Verify that we got at least 6 records due to changes
        # (could be more due to overlap in gte oplog clause)
        for k,v in record_count_by_stream.items():
            self.assertGreaterEqual(v, 5)

        # Verify that we got 2 records with _SDC_DELETED_AT
        self.assertEqual(2, len([x['data'] for x in records_by_stream['simple_coll_1'] if x['data'].get('_sdc_deleted_at')]))
        self.assertEqual(2, len([x['data'] for x in records_by_stream['simple_coll_2'] if x['data'].get('_sdc_deleted_at')]))
        # Verify that the _id of the records sent are the same set as the
        # _ids of the documents changed
        actual = set([ObjectId(x['data']['_id']) for x in records_by_stream['simple_coll_1']]).union(
            set([ObjectId(x['data']['_id']) for x in records_by_stream['simple_coll_2']]))
        self.assertEqual(changed_ids, actual)

        # Verify the updated record values in the db match the tap output file
        found_id_db = client['simple_db']['simple_coll_1'].find({'string$field': "Updated_1"})[0]['_id']
        found_id_tap = [ x['data']['_id'] for x in records_by_stream['simple_coll_1']
                                 if x['data'].get('string$field') == 'Updated_1' ]
        self.assertEqual(str(found_id_db), found_id_tap[0])

        found_id_db = client['simple_db']['simple_coll_2'].find({'string$field': "Updated_2"})[0]['_id']
        found_id_tap = [ x['data']['_id'] for x in records_by_stream['simple_coll_2']
                                 if x['data'].get('string$field') == 'Updated_2' ]
        self.assertEqual(str(found_id_db), found_id_tap[0])

        # Not supported in mongodb 4.2 TDL-20088. Verify updated record values in db match tap output file
        # found_int = -1 # one document in each colleciton was updated to have an int value of -1
        # found_ints_1 = [x['data']['int.field'] for x in records_by_stream['simple_coll_1'] if x['data'].get('int.field')]
        # found_ints_2 = [x['data']['int.field'] for x in records_by_stream['simple_coll_2'] if x['data'].get('int.field')]
        # self.assertIn(found_int, found_ints_1)
        # self.assertIn(found_int, found_ints_2)
