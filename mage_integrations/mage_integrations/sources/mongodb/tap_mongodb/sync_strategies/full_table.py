#!/usr/bin/env python3
import copy
import time

import pymongo
import singer
from singer import metadata, utils

import mage_integrations.sources.mongodb.tap_mongodb.sync_strategies.common as common

LOGGER = singer.get_logger()


def get_max_id_value(collection):
    row = collection.find_one(sort=[("_id", pymongo.DESCENDING)])
    if row:
        return row['_id']

    LOGGER.info("No max id found for collection: collection is likely empty")
    return None


# pylint: disable=too-many-locals,invalid-name,too-many-statements
def sync_collection(client, stream, state, projection, logger=None):
    if logger is None:
        logger = LOGGER

    tap_stream_id = stream['tap_stream_id']
    logger.info(f'Starting full table sync for {tap_stream_id}')

    md_map = metadata.to_map(stream['metadata'])
    database_name = metadata.get(md_map, (), 'database-name')

    db = client[database_name]
    collection = db[stream['stream']]

    # before writing the table version to state, check if we had one to begin with
    first_run = singer.get_bookmark(state, stream['tap_stream_id'], 'version') is None

    # last run was interrupted if there is a last_id_fetched bookmark
    was_interrupted = singer.get_bookmark(state,
                                          stream['tap_stream_id'],
                                          'last_id_fetched') is not None

    # pick a new table version if last run wasn't interrupted
    if was_interrupted:
        stream_version = singer.get_bookmark(state, stream['tap_stream_id'], 'version')
    else:
        stream_version = int(time.time() * 1000)

    state = singer.write_bookmark(state,
                                  stream['tap_stream_id'],
                                  'version',
                                  stream_version)
    singer.write_message(singer.StateMessage(value=copy.deepcopy(state)))

    activate_version_message = singer.ActivateVersionMessage(
        stream=common.calculate_destination_stream_name(stream),
        version=stream_version
    )

    # For the initial replication, emit an ACTIVATE_VERSION message
    # at the beginning so the records show up right away.
    if first_run:
        singer.write_message(activate_version_message)

    if singer.get_bookmark(state, stream['tap_stream_id'], 'max_id_value'):
        # There is a bookmark
        max_id_value = singer.get_bookmark(state, stream['tap_stream_id'], 'max_id_value')
        max_id_type = singer.get_bookmark(state, stream['tap_stream_id'], 'max_id_type')
        max_id_value = common.string_to_class(max_id_value, max_id_type)
    else:
        max_id_value = get_max_id_value(collection)

    last_id_fetched = singer.get_bookmark(state,
                                          stream['tap_stream_id'],
                                          'last_id_fetched')

    if max_id_value:
        # Write the bookmark if max_id_value is defined
        state = singer.write_bookmark(state,
                                      stream['tap_stream_id'],
                                      'max_id_value',
                                      common.class_to_string(max_id_value,
                                                             max_id_value.__class__.__name__))
        state = singer.write_bookmark(state,
                                      stream['tap_stream_id'],
                                      'max_id_type',
                                      max_id_value.__class__.__name__)

    find_filter = {'$lte': max_id_value}
    if last_id_fetched:
        last_id_fetched_type = singer.get_bookmark(state,
                                                   stream['tap_stream_id'],
                                                   'last_id_fetched_type')
        find_filter['$gte'] = common.string_to_class(last_id_fetched, last_id_fetched_type)

    query_message = 'Querying {} with:\n\tFind Parameters: {}'.format(
        stream['tap_stream_id'],
        find_filter)
    if projection:
        query_message += '\n\tProjection: {}'.format(projection)
    # pylint: disable=logging-format-interpolation
    logger.info(query_message)

    with collection.find({'_id': find_filter},
                         projection,
                         sort=[("_id", pymongo.ASCENDING)]) as cursor:
        rows_saved = 0
        time_extracted = utils.now()
        start_time = time.time()

        schema = {"type": "object", "properties": {}}
        for row in cursor:
            rows_saved += 1

            schema_build_start_time = time.time()
            if common.row_to_schema(schema, row):
                singer.write_message(singer.SchemaMessage(
                    stream=common.calculate_destination_stream_name(stream),
                    schema=schema,
                    key_properties=['_id']))
                common.SCHEMA_COUNT[stream['tap_stream_id']] += 1
            common.SCHEMA_TIMES[stream['tap_stream_id']] += time.time() - schema_build_start_time

            record_message = common.row_to_singer_record(stream,
                                                         row,
                                                         stream_version,
                                                         time_extracted)

            singer.write_message(record_message)

            state = singer.write_bookmark(state,
                                          stream['tap_stream_id'],
                                          'last_id_fetched',
                                          common.class_to_string(row['_id'],
                                                                 row['_id'].__class__.__name__))
            state = singer.write_bookmark(state,
                                          stream['tap_stream_id'],
                                          'last_id_fetched_type',
                                          row['_id'].__class__.__name__)

            if rows_saved % common.UPDATE_BOOKMARK_PERIOD == 0:
                singer.write_message(singer.StateMessage(value=copy.deepcopy(state)))

        common.COUNTS[tap_stream_id] += rows_saved
        common.TIMES[tap_stream_id] += time.time() - start_time

    # clear max pk value and last pk fetched upon successful sync
    singer.clear_bookmark(state, stream['tap_stream_id'], 'max_id_value')
    singer.clear_bookmark(state, stream['tap_stream_id'], 'max_id_type')
    singer.clear_bookmark(state, stream['tap_stream_id'], 'last_id_fetched')
    singer.clear_bookmark(state, stream['tap_stream_id'], 'last_id_fetched_type')

    state = singer.write_bookmark(state,
                                  stream['tap_stream_id'],
                                  'initial_full_table_complete',
                                  True)

    singer.write_message(activate_version_message)

    logger.info(f'Synced {rows_saved} records for {tap_stream_id}')
