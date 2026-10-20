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


def generate_simple_coll_questions(num_docs):
    docs = []
    for int_value in range(num_docs):
        docs.append({"question_id": int_value, "question": random_string_generator()})
    return docs


def generate_simple_coll_answers(num_docs):
    docs = []
    for int_value in range(num_docs):
        docs.append({"answer_id": int_value, "answer": random_string_generator()})
    return docs


class MongoDBViewDiscovery(unittest.TestCase):

    def setUp(self):

        ensure_environment_variables_set()

        with get_test_connection() as client:
            # drop all dbs/collections
            drop_all_collections(client)

            # questions has 20 documents
            client["simple_db"]["questions"].insert_many(generate_simple_coll_questions(20))

            # answers has 30 documents
            client["simple_db"]["answers"].insert_many(generate_simple_coll_answers(30))

            # create view on questions
            client["simple_db"].command(bson.son.SON([("create", "question_view"), ("viewOn", "questions"), ("pipeline", [])]))

            # create a view by combining two collections
            client["simple_db"].create_collection(
                'combined_view',
                viewOn='questions',
                pipeline=[{
                    '$lookup': {
                        'from': 'answers',
                        'localField': 'question_id',
                        'foreignField': 'answer_id',
                        'as': 'combined_view_final'
                        }
                    }]
                )

    def name(self):
        return "tap_tester_mongodb_views"

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
                'database': os.getenv('TAP_MONGODB_DBNAME'),
                'include_schemas_in_destination_stream_name': 'true'
                }

    def expected_check_streams(self):
        return {'simple_db-questions',
                'simple_db-answers'}

    def expected_pks(self):
        return {
            'simple_db_questions': {'_id'},
            'simple_db_answers': {'_id'}
        }

    def expected_row_counts(self):
        return {
            'simple_db_questions': 20,
            'simple_db_answers': 30
        }

    def expected_sync_streams(self):
        return {
            'simple_db_questions',
            'simple_db_answers'
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

        # validate that the views are not discovered by the tap
        discovered_streams = set([catalog['tap_stream_id'] for catalog in found_catalogs])
        self.assertEqual(discovered_streams, self.expected_check_streams())

        # validate the discovered streams are not views
        for stream_catalog in found_catalogs:
            self.assertEqual(stream_catalog['metadata']['is-view'], False)

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

        # streams that we synced are the ones that we expect to see
        records_by_stream = runner.get_records_from_target_output()
        record_count_by_stream = runner.examine_target_output_file(self,
                                                                   conn_id,
                                                                   self.expected_sync_streams(),
                                                                   self.expected_pks())

        # assert that we get the correct number of records for each stream
        self.assertEqual(self.expected_row_counts(), record_count_by_stream)
