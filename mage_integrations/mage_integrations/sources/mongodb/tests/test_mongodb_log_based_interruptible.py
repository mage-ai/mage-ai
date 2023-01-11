import tap_tester.connections as connections
import tap_tester.menagerie   as menagerie
import tap_tester.runner      as runner
import os
import unittest
import pymongo
import string
import random
import time
from mongodb_common import drop_all_collections, get_test_connection, ensure_environment_variables_set
import copy

RECORD_COUNT = {}


def random_string_generator(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for x in range(size))


def generate_simple_coll_docs(num_docs):
    docs = []
    for int_value in range(num_docs):
        docs.append({"int_field": int_value, "string_field": random_string_generator()})
    return docs


table_interrupted = "simple_coll_2"


class MongoDBLogBasedInterruptible(unittest.TestCase):
    def setUp(self):
        ensure_environment_variables_set()

        with get_test_connection() as client:
            # drop all dbs/collections
            drop_all_collections(client)

            # simple_coll_1 has 10 documents
            client["simple_db"]["simple_coll_1"].insert_many(generate_simple_coll_docs(10))

            # simple_coll_2 has 20 documents
            for i in range(20):
                client["simple_db"]["simple_coll_2"].insert_many(generate_simple_coll_docs(1))


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

    def expected_row_count_1(self):
        return {
            'simple_coll_1': 10,
            'simple_coll_2': 20,
        }

    def expected_row_count_2(self):
        return {
            'simple_coll_1': 3
        }

    def expected_row_count_3(self):
        return {
            'simple_coll_1': 0,
            'simple_coll_2': 0
        }

    def expected_sync_streams(self):
        return {
            'simple_coll_1',
            'simple_coll_2'
        }

    def name(self):
        return "tap_tester_mongodb_log_based_interruptible"

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

    # Spike to investigate 'oplog_ts_inc' - https://jira.talendforge.org/browse/TDL-20333
    @unittest.skip("Test is unstable")
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

        #  -----------------------------------
        # -----------Initial Full Table Sync ---------
        #  -----------------------------------
        # Select simple_coll_1 and simple_coll_2 streams and add replication method metadata
        for stream_catalog in found_catalogs:
            annotated_schema = menagerie.get_annotated_schema(conn_id, stream_catalog['stream_id'])
            additional_md = [{"breadcrumb": [], "metadata": {'replication-method': 'LOG_BASED'}}]
            selected_metadata = connections.select_catalog_and_fields_via_metadata(conn_id,
                                                                                   stream_catalog,
                                                                                   annotated_schema,
                                                                                   additional_md)

        runner.run_sync_mode(self, conn_id)

        # streams that we synced are the ones that we expect to see
        record_count_by_stream = runner.examine_target_output_file(self,
                                                                   conn_id,
                                                                   self.expected_sync_streams(),
                                                                   self.expected_pks())

        records_by_stream = runner.get_records_from_target_output()

        for tap_stream_id in self.expected_sync_streams():
            self.assertGreaterEqual(record_count_by_stream[tap_stream_id], self.expected_row_count_1()[tap_stream_id])

        initial_state = menagerie.get_state(conn_id)
        bookmarks = initial_state['bookmarks']

        self.assertIsNone(initial_state['currently_syncing'])

        # verify each bookmark matches our expectation prior to setting the interrupted state
        for table_name in self.expected_sync_streams():

            table_bookmark = bookmarks['simple_db-'+table_name]
            bookmark_keys = set(table_bookmark.keys())

            self.assertIn('version', bookmark_keys)
            self.assertIn('last_replication_method', bookmark_keys)
            self.assertIn('initial_full_table_complete', bookmark_keys)

            self.assertIn('oplog_ts_time', bookmark_keys)
            self.assertIn('oplog_ts_inc', bookmark_keys)
            self.assertNotIn('replication_key', bookmark_keys)

            self.assertEqual('LOG_BASED', table_bookmark['last_replication_method'])
            self.assertTrue(table_bookmark['initial_full_table_complete'])
            self.assertIsInstance(table_bookmark['version'], int)

        # Synthesize interrupted state
        interrupted_state = copy.deepcopy(initial_state)

        versions = {}
        with get_test_connection() as client:
            # From the sampled timestamp in oplog, fetch one timestamp which is closer to the max
            docs = list(client.local.oplog.rs.find(sort=[('$natural', pymongo.DESCENDING)]).limit(20))
            ts_to_update = docs[3]['ts']

            # converting the bson.timestamp to int, which is needed to update the oplog_ts_time
            updated_ts = str(ts_to_update)
            result = updated_ts[updated_ts.find('(')+1:updated_ts.find(')')]
            final_result = result.split(',')
            final_result = list(map(int, final_result))
            version = int(time.time() * 1000)
            # # add the ts bookmarks
            interrupted_state['bookmarks']['simple_db-'+table_interrupted].update({'oplog_ts_time': final_result[0]})
            interrupted_state['bookmarks']['simple_db-'+table_interrupted].update({'oplog_ts_inc': final_result[1]})
            interrupted_state['currently_syncing'] = 'simple_db-'+table_interrupted
            versions[tap_stream_id] = version

            # Insert Update Delete few records in the collection 1
            doc_to_update_1 = client["simple_db"]["simple_coll_1"].find_one()
            client["simple_db"]["simple_coll_1"].find_one_and_update({"_id": doc_to_update_1["_id"]}, {"$set": {"int_field": 999}})

            doc_to_delete_1 = client["simple_db"]["simple_coll_1"].find_one({"int_field": 2})
            client["simple_db"]["simple_coll_1"].delete_one({"_id": doc_to_delete_1["_id"]})

            last_inserted_coll_1 = client["simple_db"]["simple_coll_1"].insert_many(generate_simple_coll_docs(1))
            # get the last inserted id in coll 1
            last_inserted_id_coll_1 = str(last_inserted_coll_1.inserted_ids[0])

            # Create a new collection which is still not replicated
            last_inserted_coll_3 = client["simple_db"]["simple_coll_3"].insert_many(generate_simple_coll_docs(1))
            last_inserted_id_coll_3 = str(last_inserted_coll_3.inserted_ids[0])

        menagerie.set_state(conn_id, interrupted_state)

        ## update the expectations ##

        expected_sync_streams = self.expected_sync_streams()
        expected_row_count_2 = self.expected_row_count_2()
        expected_sync_streams.add('simple_coll_3')
        expected_pks = self.expected_pks()
        expected_pks['simple_coll_3'] = {'_id'}
        expected_row_count_2['simple_coll_2'] = 4
        expected_row_count_2['simple_coll_3'] = 1

        check_job_name_2 = runner.run_check_mode(self, conn_id)

        # verify check exit codes
        exit_status_2 = menagerie.get_exit_status(conn_id, check_job_name_2)
        menagerie.verify_check_exit_status(self, exit_status_2, check_job_name_2)

        # verify the tap discovered the right streams
        found_catalogs_2 = menagerie.get_catalogs(conn_id)

        for stream_catalog in found_catalogs_2:
            annotated_schema = menagerie.get_annotated_schema(conn_id, stream_catalog['stream_id'])
            additional_md = [{"breadcrumb": [], "metadata": {'replication-method': 'LOG_BASED'}}]
            selected_metadata = connections.select_catalog_and_fields_via_metadata(conn_id,
                                                                                   stream_catalog,
                                                                                   annotated_schema,
                                                                                   additional_md)

        ### Run 2nd sync ###

        second_sync = runner.run_sync_mode(self, conn_id)
        second_sync_exit_status = menagerie.get_exit_status(conn_id, second_sync)
        menagerie.verify_sync_exit_status(self, second_sync_exit_status, second_sync)

        records_by_stream_2 = runner.get_records_from_target_output()

        record_count_by_stream_2 = runner.examine_target_output_file(self,
                                                                     conn_id,
                                                                     expected_sync_streams,
                                                                     expected_pks)

        # Verify the record count for the 2nd sync
         # for tap_stream_id in expected_sync_streams:
         #    self.assertGreaterEqual(record_count_by_stream_2[tap_stream_id], expected_row_count_2[tap_stream_id])

        # validate that the second sync for interrupted collection replicates less documents than initial sync
        self.assertGreater(record_count_by_stream[table_interrupted], record_count_by_stream_2[table_interrupted])

        second_state = menagerie.get_state(conn_id)

        # verify the second sync bookmarks matches our expectatinos
        for tap_stream_id in initial_state['bookmarks'].keys():

            # verify the bookmark keys have not changed in a resumed sync
            self.assertSetEqual(
                set(initial_state['bookmarks'][tap_stream_id].keys()), set(second_state['bookmarks'][tap_stream_id].keys())
            )

            # check the table versions is the same
            self.assertEqual(second_state['bookmarks'][tap_stream_id]['version'], initial_state['bookmarks'][tap_stream_id]['version'])

            # verify the method has not changed
            self.assertEqual(initial_state['bookmarks'][tap_stream_id]['last_replication_method'],
                             second_state['bookmarks'][tap_stream_id]['last_replication_method'])

            # verify the resumed sync has completed
            self.assertTrue(second_state['bookmarks'][tap_stream_id]['initial_full_table_complete'])

            # for the previously synced tables verify the oplog_ts_time moved forward
            self.assertGreater(second_state['bookmarks'][tap_stream_id]['oplog_ts_time'],
                               initial_state['bookmarks'][tap_stream_id]['oplog_ts_time'])

        # verify the currently syncing state is none
        self.assertIsNone(second_state['currently_syncing'])

        #### Run 3rd Sync #####

        third_sync = runner.run_sync_mode(self, conn_id)
        third_sync_exit_status = menagerie.get_exit_status(conn_id, third_sync)
        menagerie.verify_sync_exit_status(self, third_sync_exit_status, third_sync)

        records_by_stream_3 = runner.get_records_from_target_output()

        record_count_by_stream_3 = runner.examine_target_output_file(self,
                                                                     conn_id,
                                                                     expected_sync_streams,
                                                                     expected_pks)

        expected_row_count_3 = self.expected_row_count_3()
        expected_row_count_3['simple_coll_3'] = 1

        # Verify the record count for the 3rd sync
        for tap_stream_id in expected_sync_streams:
            self.assertEqual(record_count_by_stream_3[tap_stream_id], expected_row_count_3[tap_stream_id])

        # verify the only record replicated is the last inserted record in the collection 2
        self.assertEqual(len(records_by_stream_3['simple_coll_3']['messages']), 2)
        self.assertEqual(records_by_stream_3['simple_coll_3']['messages'][0]['action'], 'activate_version')
        self.assertEqual(records_by_stream_3['simple_coll_3']['messages'][1]['action'], 'upsert')
        self.assertEqual(records_by_stream_3['simple_coll_3']['messages'][1]['data']['_id'], last_inserted_id_coll_3)

        third_state = menagerie.get_state(conn_id)

        # verify the third sync bookmarks matches our expectatinos
        for tap_stream_id in third_state['bookmarks'].keys():

            # verify the bookmark keys have not changed in a resumed sync
            self.assertSetEqual(
                set(third_state['bookmarks'][tap_stream_id].keys()), set(second_state['bookmarks'][tap_stream_id].keys())
            )

            # check the table versions is the same
            self.assertEqual(second_state['bookmarks'][tap_stream_id]['version'], third_state['bookmarks'][tap_stream_id]['version'])

            # verify the method has not changed
            self.assertEqual(third_state['bookmarks'][tap_stream_id]['last_replication_method'],
                             second_state['bookmarks'][tap_stream_id]['last_replication_method'])

        # verify the currently syncing state is none
        self.assertIsNone(second_state['currently_syncing'])
