import os
import datetime
import unittest
import datetime
import pymongo
import string
import random
import time
import re
import bson
import decimal

from tap_tester import connections, menagerie, runner
from mongodb_common import drop_all_collections, get_test_connection, ensure_environment_variables_set


def random_string_generator(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for x in range(size))

def generate_simple_coll_docs(num_docs):
    docs = []
    for int_value in range(num_docs):
        docs.append({"int_field": int_value, "string_field": random_string_generator()})
    return docs

class MongoDBDiscovery(unittest.TestCase):
    AUTOMATIC = "automatic"
    UNSUPPORTED = "unsupported"
    VALID_REPLICATION_KEYS = "valid-replication-keys"
    PRIMARY_KEYS = "table-key-properties"
    FORCED_REPLICATION_METHOD = "forced-replication-method"
    INCREMENTAL = "INCREMENTAL"
    FULL_TABLE = "FULL_TABLE"
    LOG_BASED = "LOG_BASED"

    def setUp(self):

        ensure_environment_variables_set()

        with get_test_connection() as client:
            # drop all dbs/collections
            drop_all_collections(client)

            # simple_coll_1 has 50 documents
            client["simple_db"]["simple_coll_1"].insert_many(generate_simple_coll_docs(50))

            # simple_coll_2 has 100 documents
            client["simple_db"]["simple_coll_2"].insert_many(generate_simple_coll_docs(100))

            # admin_coll_1 has 50 documents
            client["admin"]["admin_coll_1"].insert_many(generate_simple_coll_docs(50))

            # create view on simple_coll_1
            client["simple_db"].command(bson.son.SON([("create", "simple_view_1"), ("viewOn", "simple_coll_1"), ("pipeline", [])]))

            # collections with same names as others in different dbs
            client["simple_db_2"]["simple_coll_1"].insert_many(generate_simple_coll_docs(50))
            client["simple_db_2"]["SIMPLE_COLL_1"].insert_many(generate_simple_coll_docs(50))

            # collections with special characters in names
            client["special_db"]["hebrew_ישראל"].insert_many(generate_simple_coll_docs(50))
            client['special_db']['hello!world?'].insert_many(generate_simple_coll_docs(50))

            # Add datatype collections
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
                "binary_data_field" : b"a binary string",
                "object_id_field": bson.objectid.ObjectId(b'123456789123'),
                "boolean_field" : True,
                "date_field" : datetime.datetime.now(),
                "null_field": None,
                "regex_field" : regex,
                "32_bit_integer_field" : 32,
                "timestamp_field" : bson.timestamp.Timestamp(int(time.time()), 1),
                "64_bit_integer_field" : 34359738368,
                "decimal_field" : bson.Decimal128(decimal.Decimal('1.34')),
                "javaScript_field" : bson.code.Code("var x, y, z;"),
                "javaScript_with_scope_field" : bson.code.Code("function incrementX() { x++; }", scope={"x": 1}),
                "min_key_field" : bson.min_key.MinKey,
                "max_key_field" : bson.max_key.MaxKey
            }
            client["datatype_db"]["datatype_coll_1"].insert_one(datatype_doc)

            client["datatype_db"]["datatype_coll_2"].insert_one(datatype_doc)
            client["datatype_db"]["datatype_coll_2"].create_index([("date_field", pymongo.ASCENDING)])
            client["datatype_db"]["datatype_coll_2"].create_index([("timestamp_field", pymongo.ASCENDING)])
            client["datatype_db"]["datatype_coll_2"].create_index([("32_bit_integer_field", pymongo.ASCENDING)])
            client["datatype_db"]["datatype_coll_2"].create_index([("64_bit_integer_field", pymongo.ASCENDING)])

    def expected_check_streams(self):
        return {
            'simple_db-simple_coll_1',
            'simple_db-simple_coll_2',
            'simple_db_2-simple_coll_1',
            'simple_db_2-SIMPLE_COLL_1',
            'admin-admin_coll_1',
            #'simple_db-simple_view_1',
            'datatype_db-datatype_coll_1',
            'datatype_db-datatype_coll_2',
            'special_db-hebrew_ישראל',
            'special_db-hello!world?'
        }

    def expected_primary_keys(self):
        """Defaults to '_id' in discovery, standard ObjectId(), any value can be provided (TODO where?)"""
        return {
            stream: {'_id'}
            for stream in self.expected_check_streams()
        }
    def expected_replication_keys(self):
        return {
            'simple_db-simple_coll_1': {'_id'},
            'simple_db-simple_coll_2': {'_id'},
            'simple_db_2-simple_coll_1': {'_id'},
            'simple_db_2-SIMPLE_COLL_1': {'_id'},
            'admin-admin_coll_1': {'_id'},
            #'simple_db-simple_view_1': {'_id'},
            'datatype_db-datatype_coll_1': {
                '_id',
            },
            'datatype_db-datatype_coll_2': {
                '_id',
                'date_field',
                'timestamp_field',
                '32_bit_integer_field',
                '64_bit_integer_field',
            },
            'special_db-hebrew_ישראל': {'_id'},
            'special_db-hello!world?': {'_id'},
        }

    def expected_row_counts(self):
        return {
            'simple_db-simple_coll_1': 50,
            'simple_db-simple_coll_2': 100,
            'simple_db_2-simple_coll_1': 50,
            'simple_db_2-SIMPLE_COLL_1': 50,
            'admin-admin_coll_1': 50,
            #'simple_db-simple_view_1': 50,
            'datatype_db-datatype_coll_1': 1,
            'datatype_db-datatype_coll_2': 1,
            'special_db-hebrew_ישראל': 50,
            'special_db-hello!world?': 50
        }

    def expected_table_names(self):
        return {
            'simple_coll_1',
            'simple_coll_2',
            'SIMPLE_COLL_1',
            'admin_coll_1',
            'datatype_coll_1',
            'datatype_coll_2',
            'hebrew_ישראל',
            'hello!world?'
        }

    def name(self):
        return "mongodb_discovery"

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

        # run in check mode
        check_job_name = runner.run_check_mode(self, conn_id)

        # check exit codes
        exit_status = menagerie.get_exit_status(conn_id, check_job_name)
        menagerie.verify_check_exit_status(self, exit_status, check_job_name)

        # Verify a catalog was produced by discovery
        catalog = menagerie.get_catalog(conn_id)
        self.assertGreater(len(catalog), 0)

        # Verify stream_name entries match the expected table names
        stream_catalogs = catalog['streams']
        stream_names = {catalog['stream_name'] for catalog in stream_catalogs}
        self.assertSetEqual(self.expected_table_names(), stream_names)

        # Verify tap_stream_id entries follow naming convention <db_name>-<table_name>
        stream_ids = {catalog['tap_stream_id'] for catalog in stream_catalogs}
        self.assertSetEqual(self.expected_check_streams(), stream_ids)

        # Stream level assertions
        for stream in self.expected_check_streams():
            with self.subTest(stream=stream):

                # gathering expectations
                expected_primary_keys = self.expected_primary_keys()[stream]
                expected_replication_keys = self.expected_replication_keys()[stream]
                expected_row_count = self.expected_row_counts()[stream]

                # collecting actual values...
                stream_catalog = [catalog for catalog in stream_catalogs
                                  if catalog["tap_stream_id"] == stream][0]
                schema_and_metadata = menagerie.get_annotated_schema(conn_id, stream_catalog['stream_id'])
                stream_metadata = schema_and_metadata["metadata"]
                empty_breadcrumb_metadata = [item for item in stream_metadata if item.get("breadcrumb") == []]
                stream_properties = empty_breadcrumb_metadata[0]['metadata']
                actual_primary_keys = set(stream_properties.get(self.PRIMARY_KEYS, []))
                actual_replication_keys = set(stream_properties.get(self.VALID_REPLICATION_KEYS, []))
                actual_replication_method = stream_properties.get(self.FORCED_REPLICATION_METHOD)
                actual_stream_inclusion = stream_properties.get('inclusion')
                actual_field_inclusions = set(
                    item.get("metadata").get("inclusion")
                    for item in stream_metadata
                    if item.get("breadcrumb", []) != []
                )
                actual_fields_to_datatypes = {
                    item['breadcrumb'][1]: item['metadata'].get('sql-datatype')
                    for item in stream_metadata if item.get('breadcrumb') != []
                }

                # Verify there is only 1 top level breadcrumb in metadata
                self.assertEqual(1, len(empty_breadcrumb_metadata))

                # Verify replication key(s) match expectations
                self.assertSetEqual(expected_replication_keys, actual_replication_keys)

                # Verify primary key(s) match expectations
                self.assertSetEqual(expected_primary_keys, actual_primary_keys)

                # Verify no field-level inclusion exists
                self.assertSetEqual(set(), actual_field_inclusions)

                # Verify row-count metadata matches expectations
                self.assertEqual(expected_row_count, stream_properties['row-count'])

                # Verify selected metadata is None for all streams
                self.assertIsNone(stream_properties.get('selected'))

                # Verify is-view metadata is False
                self.assertFalse(stream_properties['is-view'])

                # Verify no forced-replication-method is present in metadata
                self.assertNotIn(self.FORCED_REPLICATION_METHOD, stream_properties.keys())

                # Verify database-name is consistent with the tap_stream_id
                tap_stream_id_db_prefix = stream_catalog['tap_stream_id'].split('-')[0]
                self.assertEqual(tap_stream_id_db_prefix, stream_properties['database-name'])

                # Verify schema types match expectations
                self.assertDictEqual({'type': 'object'}, stream_catalog['schema'])
