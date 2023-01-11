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
import uuid
import re
import pprint
import pdb
import bson
import singer
import subprocess
from functools import reduce
from singer import utils, metadata
from mongodb_common import drop_all_collections, get_test_connection, ensure_environment_variables_set
import decimal


RECORD_COUNT = {}


def run_mongodb_javascript(database, js):
    """
    Runs arbitrary javascript against the test Mongo instance. This is
    useful for setting up situations that Python can't handle (e.g.,
    datetime with year 0) for testing.
    """
    print("Running '{}' against database '{}'".format(js, database))
    cmd = ["mongo", "-u", os.getenv('TAP_MONGODB_USER'), "-p", os.getenv('TAP_MONGODB_PASSWORD'), "--authenticationDatabase", os.getenv('TAP_MONGODB_DBNAME'), database, "--eval", "eval('{}')".format(js)]
    subprocess.run(cmd)


class MongoDBDatatype(unittest.TestCase):
    def setUp(self):
        ensure_environment_variables_set()

        with get_test_connection() as client:
            ############# Drop all dbs/collections #############
            drop_all_collections(client)

            ############# Add datatype collections #############
            pattern = re.compile('.*')
            regex = bson.Regex.from_native(pattern)
            regex.flags ^= re.UNICODE

            datatype_doc = {
                "double_field": 4.3,
                "string_field": "a sample string",
                "object_field" : {
                    "obj_field_1_key": "obj_field_1_val",
                    "obj_field_2_key": "obj_field_2_val"
                },
                "array_field" : [
                    "array_item_1",
                    "array_item_2",
                    "array_item_3"
                ],
                "binary_data_field" : bson.Binary(b"a binary string"),
                "object_id_field": bson.objectid.ObjectId(b'123456789123'),
                "boolean_field" : True,
                "date_field" : datetime.datetime(2019, 8, 15, 19, 29, 14, 578000),
                "null_field": None,
                "regex_field" : regex,
                "32_bit_integer_field" : 32,
                "timestamp_field" : bson.timestamp.Timestamp(1565897157, 1),
                "64_bit_integer_field" : 34359738368,
                "decimal_field" : bson.Decimal128(decimal.Decimal('1.34')),
                "javaScript_field" : bson.code.Code("var x, y, z;"),
                "javaScript_with_scope_field" : bson.code.Code("function incrementX() { x++; }", scope={"x": 1}),
                "min_key_field" : bson.min_key.MinKey,
                "max_key_field" : bson.max_key.MaxKey,
                "uuid_field": uuid.UUID('3e139ff5-d622-45c6-bf9e-1dfec72820c4'),
                "dbref_field": bson.dbref.DBRef("some_collection", bson.objectid.ObjectId(b'123456789123'), database='some_database')
            }

            client["datatype_db"]["datatype_coll_1"].insert_one(datatype_doc)

            # NB: Insert an invalid datetime to confirm that works correctly
            run_mongodb_javascript("datatype_db", "db.invalid_datatype_coll.insert({ \"date_field\": new ISODate(\"0000-01-01T00:00:00.000Z\") });")

    def expected_check_streams(self):
        return {
            'datatype_db-datatype_coll_1',
            'datatype_db-invalid_datatype_coll'
        }

    def expected_pks(self):
        return {
            'datatype_coll_1': {'_id'},
            'invalid_datatype_coll': {'_id'}
        }

    def expected_row_counts(self):
        return {
            'datatype_coll_1': 1,
            'invalid_datatype_coll': 1
        }


    def expected_sync_streams(self):
        return {
            'datatype_coll_1',
            'invalid_datatype_coll'
        }

    def name(self):
        return "tap_tester_mongodb_datatype"

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
            additional_md = [{ "breadcrumb" : [], "metadata" : {'replication-method' : 'FULL_TABLE'}}]
            selected_metadata = connections.select_catalog_and_fields_via_metadata(conn_id,
                                                                                    stream_catalog,
                                                                                    annotated_schema,
                                                                                    additional_md)

        # run full table sync
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

        # assert that we get the correct number of records for each stream
        self.assertEqual(self.expected_row_counts(),record_count_by_stream)

        # assert that an activate_version_message is first and last message sent for each stream
        for stream_name in self.expected_sync_streams():
            self.assertEqual('activate_version',records_by_stream[stream_name]['messages'][0]['action'])
            self.assertEqual('activate_version',records_by_stream[stream_name]['messages'][-1]['action'])

        state = menagerie.get_state(conn_id)

        first_versions = {}

        for tap_stream_id in self.expected_check_streams():
            # assert that the state has an initial_full_table_complete == True
            self.assertTrue(state['bookmarks'][tap_stream_id]['initial_full_table_complete'])
            # assert that there is a version bookmark in state
            first_versions[tap_stream_id] = state['bookmarks'][tap_stream_id]['version']
            self.assertIsNotNone(first_versions[tap_stream_id])

        record_id = None
        with get_test_connection() as client:
            record_id = str([x for x in client['datatype_db']['datatype_coll_1'].find()][0]['_id'])


        expected_record = {
            "javaScript_field": "var x, y, z;",
            "timestamp_field": "2019-08-15T19:25:57.000000Z",
            "_id": record_id,
            "date_field": "2019-08-15T19:29:14.578000Z",
            "string_field": "a sample string",
            "object_field": {"obj_field_2_key": "obj_field_2_val",
                             "obj_field_1_key": "obj_field_1_val"},
            "null_field": None,
            "regex_field": {"flags": 0, "pattern": ".*"},
            "object_id_field": "313233343536373839313233",
            "64_bit_integer_field": 34359738368,
            "32_bit_integer_field": 32,
            "array_field": ["array_item_1",
                            "array_item_2",
                            "array_item_3"],
            "binary_data_field": "YSBiaW5hcnkgc3RyaW5n",
            "javaScript_with_scope_field": {"scope": "{'x': 1}",
                                            "value": "function incrementX() { x++; }"},
            "double_field": decimal.Decimal('4.3'),
            "boolean_field": True,
            "decimal_field": decimal.Decimal('1.34'),
            'uuid_field': "3e139ff5-d622-45c6-bf9e-1dfec72820c4",
            "dbref_field": {"id": "313233343536373839313233",
                            "database": "some_database",
                            "collection": "some_collection"}
        }

        self.assertEquals(expected_record, records_by_stream['datatype_coll_1']['messages'][1]['data'])
