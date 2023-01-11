import tap_tester.connections as connections
import tap_tester.menagerie   as menagerie
import tap_tester.runner      as runner
import os
import unittest
import string
import random
import ssl
from mongodb_common import drop_all_collections, get_test_connection, ensure_environment_variables_set


RECORD_COUNT = {}


def random_string_generator(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for x in range(size))


def generate_simple_coll_docs(num_docs):
    docs = []
    for int_value in range(num_docs):
        docs.append({"int_field": int_value, "string_field": random_string_generator()})
    return docs


class MongoDBConfigurableProperty(unittest.TestCase):

    def setUp(self):
        ensure_environment_variables_set()

        with get_test_connection() as client:
            # drop all dbs/collections
            drop_all_collections(client)

            # simple_coll_1 has 25 documents
            client["simple_db"]["simple_coll_1"].insert_many(generate_simple_coll_docs(25))

             # simple_coll_2 has 50 documents
            client["simple_db"]["simple_coll_2"].insert_many(generate_simple_coll_docs(50))

    def name(self):
        return "tap_tester_mongodb_configurable_property"

    def tap_name(self):
        return "tap-mongodb"

    def get_type(self):
        return "platform.mongodb"

    def get_credentials(self):
        return {'password': os.getenv('TAP_MONGODB_PASSWORD')}

    def expected_check_streams(self):
        return {
            'simple_db-simple_coll_1',
            'simple_db-simple_coll_2'
        }

    def expected_pks_log_based(self):
        return {
            'simple_coll_1': {'_id'},
            'simple_coll_2': {'_id'}
         }

    def expected_pks_include_schemas(self):
        return {
            'simple_db_simple_coll_1': {'_id'},
            'simple_db_simple_coll_2': {'_id'}
         }

    def expected_row_counts_log_based(self):
        return {
            'simple_coll_1': 25,
            'simple_coll_2': 50
        }

    def expected_row_counts_include_schemas(self):
        return {
            'simple_db_simple_coll_1': 25,
            'simple_db_simple_coll_2': 50
        }

    def expected_sync_streams_include_schemas(self):
        return {
            'simple_db_simple_coll_1',
            'simple_db_simple_coll_2'
        }

    def expected_sync_streams_log_based(self):
        return {
            'simple_coll_1',
            'simple_coll_2'
        }

    def run_test(self):

        conn_id = connections.ensure_connection(self)

        #original_properties=False)

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
            additional_md = [{"breadcrumb": [], "metadata": {'replication-method': 'FULL_TABLE'}}]
            selected_metadata = connections.select_catalog_and_fields_via_metadata(conn_id,
                                                                                    stream_catalog,
                                                                                    annotated_schema,
                                                                                    additional_md)

        # run full table sync
        sync_job_name = runner.run_sync_mode(self, conn_id)

        # check exit status
        exit_status = menagerie.get_exit_status(conn_id, sync_job_name)
        menagerie.verify_sync_exit_status(self, exit_status, sync_job_name)

        return conn_id


class MongoDBUseLogBasedReplication(MongoDBConfigurableProperty):

    def name(self):
        return "tt_mongodb_config_prop_log_based"

    def get_credentials(self):
        return {'password': os.getenv('TAP_MONGODB_PASSWORD')}

    def get_properties(self):
        return {'host': os.getenv('TAP_MONGODB_HOST'),
                'port': os.getenv('TAP_MONGODB_PORT'),
                'user': os.getenv('TAP_MONGODB_USER'),
                'database': os.getenv('TAP_MONGODB_DBNAME'),
                'use_log_based_replication': 'true'
                }

    def test_run(self):
        conn_id = self.run_test()

        # streams that we synced are the ones that we expect to see
        records_by_stream = runner.get_records_from_target_output()
        record_count_by_stream = runner.examine_target_output_file(self,
                                                                   conn_id,
                                                                   self.expected_sync_streams_log_based(),
                                                                   self.expected_pks_log_based())

        # assert that we get the correct number of records for each stream
        self.assertEqual(self.expected_row_counts_log_based(), record_count_by_stream)


class MongoDBIncludeSchema(MongoDBConfigurableProperty):

    def name(self):
        return "tt_mongodb_config_prop_inc_schema"

    def get_properties(self):
        return {'host': os.getenv('TAP_MONGODB_HOST'),
                'port': os.getenv('TAP_MONGODB_PORT'),
                'user': os.getenv('TAP_MONGODB_USER'),
                'database': os.getenv('TAP_MONGODB_DBNAME'),
                'include_schemas_in_destination_stream_name': 'true'
                }

    def test_run(self):
        conn_id = self.run_test()

        # streams that we synced are the ones that we expect to see
        records_by_stream = runner.get_records_from_target_output()
        record_count_by_stream = runner.examine_target_output_file(self,
                                                                   conn_id,
                                                                   self.expected_sync_streams_include_schemas(),
                                                                   self.expected_pks_include_schemas())

        # assert that we get the correct number of records for each stream
        self.assertEqual(self.expected_row_counts_include_schemas(), record_count_by_stream)
