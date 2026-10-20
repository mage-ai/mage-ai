import tap_tester.connections as connections
import tap_tester.menagerie   as menagerie
import tap_tester.runner      as runner
import os
import unittest
import pymongo
import string
import random
import time
import datetime
from mongodb_common import drop_all_collections, get_test_connection, ensure_environment_variables_set
import copy
import decimal
import bson
from bson.decimal128 import Decimal128

RECORD_COUNT = {}

replication_method = ["INCREMENTAL", "FULL_TABLE", "LOG_BASED"]


def random_string_generator(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for x in range(size))


def generate_docs_no_id(num_docs):
    docs = []
    for int_value in range(num_docs):
        docs.append({"int_field": int_value, "string_field": random_string_generator()})
    return docs


def generate_docs_int_id(num_docs):
    docs = []
    for int_value in range(num_docs):
        docs.append({"_id": int_value, "string_field": random_string_generator()})
    return docs


def generate_docs_double_id():
    docs = []
    docs.append({"_id": 546.43, "string_field": random_string_generator()})
    docs.append({"_id": 555.56, "string_field": random_string_generator()})
    return docs


def generate_docs_string_id():
    docs = []
    docs.append({"_id": 'primary_key', "string_field": random_string_generator()})
    docs.append({"_id": 'secondary_key', "string_field": random_string_generator()})
    return docs


def generate_docs_binary_id():
    docs = []
    docs.append({"_id": 0b10101011, "string_field": random_string_generator()})
    docs.append({"_id": 0b10101000, "string_field": random_string_generator()})
    return docs


def generate_docs_boolean_id():
    docs = []
    docs.append({"_id": True, "string_field": random_string_generator()})
    docs.append({"_id": False, "string_field": random_string_generator()})
    return docs


def generate_docs_date_id():
    docs = []
    d1 = datetime.datetime.utcnow() - datetime.timedelta(days=1)
    d2 = datetime.datetime.utcnow()
    docs.append({"_id": d1, "string_field": random_string_generator()})
    docs.append({"_id": d2, "string_field": random_string_generator()})
    return docs


def generate_docs_32_bit_int_id():
    docs = []
    docs.append({'_id': 2147483640, 'string_field': random_string_generator()})
    docs.append({'_id': 2147483620, 'string_field': random_string_generator()})
    return docs


def generate_docs_64_bit_int_id():
    docs = []
    docs.append({'_id': 9223372036854775800, 'string_field': random_string_generator()})
    docs.append({'_id': 9223372036854775799, 'string_field': random_string_generator()})
    return docs


def generate_docs_128_decimal_id():
    docs = []
    docs.append({'_id': bson.Decimal128(decimal.Decimal('1.34')), 'string_field': random_string_generator()})
    docs.append({'_id': bson.Decimal128(decimal.Decimal('2.34')), 'string_field': random_string_generator()})
    return docs


class MongoDbPrimaryKeyIdVariation(unittest.TestCase):

    def setUp(self):
        ensure_environment_variables_set()

        with get_test_connection() as client:
            # drop all dbs/collections
            drop_all_collections(client)

            # create collections for all the different variants for _id
            client["simple_db"]["coll_with_no_id"].insert_many(generate_docs_no_id(5))
            client["simple_db"]["coll_with_int_id"].insert_many(generate_docs_int_id(5))
            client["simple_db"]["coll_with_double_id"].insert_many(generate_docs_double_id())
            client["simple_db"]["coll_with_string_id"].insert_many(generate_docs_string_id())
            client["simple_db"]["coll_with_binary_id"].insert_many(generate_docs_binary_id())
            client["simple_db"]["coll_with_date_id"].insert_many(generate_docs_date_id())
            client["simple_db"]["coll_with_32_bit_int_id"].insert_many(generate_docs_32_bit_int_id())
            client["simple_db"]["coll_with_64_bit_int_id"].insert_many(generate_docs_64_bit_int_id())

    def expected_check_streams(self):
        return {
            'simple_db-coll_with_no_id',
            'simple_db-coll_with_int_id',
            'simple_db-coll_with_double_id',
            'simple_db-coll_with_string_id',
            'simple_db-coll_with_binary_id',
            'simple_db-coll_with_date_id',
            'simple_db-coll_with_32_bit_int_id',
            'simple_db-coll_with_64_bit_int_id'
            }

    def expected_pks(self):
        return {
            'coll_with_no_id': {'_id'},
            'coll_with_int_id': {'_id'},
            'coll_with_double_id': {'_id'},
            'coll_with_string_id': {'_id'},
            'coll_with_binary_id': {'_id'},
            'coll_with_date_id': {'_id'},
            'coll_with_32_bit_int_id': {'_id'},
            'coll_with_64_bit_int_id': {'_id'}
            }

    def expected_sync_streams(self):
        return {
            'coll_with_no_id',
            'coll_with_int_id',
            'coll_with_double_id',
            'coll_with_string_id',
            'coll_with_binary_id',
            'coll_with_date_id',
            'coll_with_32_bit_int_id',
            'coll_with_64_bit_int_id'
            }

    def expected_record_count(self):
        return {'coll_with_double_id': 2,
                'coll_with_32_bit_int_id': 2,
                'coll_with_64_bit_int_id': 2,
                'coll_with_no_id': 5,
                'coll_with_binary_id': 2,
                'coll_with_string_id': 2,
                'coll_with_date_id': 2,
                'coll_with_int_id': 5
                }

    def expected_pk_values(self):
        return {
            'coll_with_string_id': ['primary_key', 'secondary_key'],
            'coll_with_binary_id': [171, 168],
            'coll_with_no_id': [],
            'coll_with_64_bit_int_id': [9223372036854775800, 9223372036854775799],
            'coll_with_int_id': [0, 1, 2, 3, 4],
            'coll_with_32_bit_int_id': [2147483640, 2147483620],
            'coll_with_date_id': [datetime.datetime.utcnow() - datetime.timedelta(days=1), datetime.datetime.utcnow()],
            'coll_with_double_id': [decimal.Decimal('546.43'), decimal.Decimal('555.56')]
            }

    def expected_pk_datatype(self):
        return {
            'coll_with_string_id': str,
            'coll_with_binary_id': int,
            'coll_with_no_id': [],
            'coll_with_64_bit_int_id': int,
            'coll_with_int_id': int,
            'coll_with_32_bit_int_id': int,
            'coll_with_date_id': [datetime.datetime.utcnow() - datetime.timedelta(days=1), datetime.datetime.utcnow()],
            'coll_with_double_id': decimal.Decimal
            }

    def name(self):
        return "tap_tester_mongodb_id_pk_variations"

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
        '''
        Running the test with all the available replication methods
        '''

        for replication in replication_method:
            if replication != 'INCREMENTAL':
                additional_metadata = [{"breadcrumb": [], "metadata": {'replication-method': replication}}]
            else:
                additional_metadata = [{"breadcrumb": [], "metadata": {'replication-method': replication, 'replication-key': '_id'}}]
            self.run_test(additional_metadata)

    def run_test(self, additional_metadata):

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

        #  -----------------------------------
        # -----------Initial Full Table Sync ---------
        #  -----------------------------------
        # Select simple_coll_1 and simple_coll_2 streams and add replication method metadata
        for stream_catalog in found_catalogs:
            annotated_schema = menagerie.get_annotated_schema(conn_id, stream_catalog['stream_id'])
            additional_md = additional_metadata
            selected_metadata = connections.select_catalog_and_fields_via_metadata(conn_id,
                                                                                   stream_catalog,
                                                                                   annotated_schema,
                                                                                   additional_md)
            # verify _id is marked in metadata as table-key-property
            self.assertEqual(stream_catalog['metadata']['table-key-properties'][0], '_id')

        runner.run_sync_mode(self, conn_id)

        # streams that we synced are the ones that we expect to see
        record_count_by_stream = runner.examine_target_output_file(self,
                                                                   conn_id,
                                                                   self.expected_sync_streams(),
                                                                   self.expected_pks())

        records_by_stream = runner.get_records_from_target_output()

        # verify if we are capturing all the data for all the streams
        self.assertEqual(record_count_by_stream, self.expected_record_count())

        # verify the values of primary key and the datatype in the replicated records
        for stream in records_by_stream.keys():
            if stream not in ['coll_with_date_id', 'coll_with_no_id']:
                for records in [rec['data'] for rec in records_by_stream[stream]['messages'] if rec.get('action') == 'upsert']:
                    self.assertIn(records['_id'], self.expected_pk_values()[stream])
                    self.assertIsInstance(records['_id'], self.expected_pk_datatype()[stream])
