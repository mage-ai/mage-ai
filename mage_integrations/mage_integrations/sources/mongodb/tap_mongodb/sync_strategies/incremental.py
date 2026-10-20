#!/usr/bin/env python3
import copy
import time

import pymongo
import singer
from singer import metadata, utils

import mage_integrations.sources.mongodb.tap_mongodb.sync_strategies.common as common
from mage_integrations.sources.mongodb.tap_mongodb.sync_strategies.utils import (
    build_find_filter,
    get_replication_key_name,
)

LOGGER = singer.get_logger()


def update_bookmark(row, state, tap_stream_id, replication_key_name):
    replication_key_value = row.get(replication_key_name)
    if replication_key_value:
        replication_key_type = replication_key_value.__class__.__name__

        replication_key_value_bookmark = common.class_to_string(replication_key_value,
                                                                replication_key_type)
        state = singer.write_bookmark(state,
                                      tap_stream_id,
                                      'replication_key_value',
                                      replication_key_value_bookmark)
        state = singer.write_bookmark(state,
                                      tap_stream_id,
                                      'replication_key_type',
                                      replication_key_type)


# pylint: disable=too-many-locals, too-many-statements
def sync_collection(client, stream, state, projection, logger=None):
    if logger is None:
        logger = LOGGER

    tap_stream_id = stream['tap_stream_id']
    logger.info(f'Starting incremental sync for {tap_stream_id}')

    stream_metadata = metadata.to_map(stream['metadata']).get(())
    collection = client[stream_metadata['database-name']][stream['stream']]

    # before writing the table version to state, check if we had one to begin with
    first_run = singer.get_bookmark(state, stream['tap_stream_id'], 'version') is None

    # pick a new table version if last run wasn't interrupted
    if first_run:
        stream_version = int(time.time() * 1000)
    else:
        stream_version = singer.get_bookmark(state, stream['tap_stream_id'], 'version')

    state = singer.write_bookmark(state,
                                  stream['tap_stream_id'],
                                  'version',
                                  stream_version)

    activate_version_message = singer.ActivateVersionMessage(
        stream=common.calculate_destination_stream_name(stream),
        version=stream_version
    )

    # For the initial replication, emit an ACTIVATE_VERSION message
    # at the beginning so the records show up right away.
    if first_run:
        singer.write_message(activate_version_message)

    replication_key_name = get_replication_key_name(stream)

    # write state message
    singer.write_message(singer.StateMessage(value=copy.deepcopy(state)))

    # create query
    find_filter = build_find_filter(stream, state)

    # log query
    query_message = 'Querying {} with:\n\tFind Parameters: {}'.format(tap_stream_id, find_filter)
    if projection:
        query_message += '\n\tProjection: {}'.format(projection)
    logger.info(query_message)

    # query collection
    schema = {"type": "object", "properties": {}}
    with collection.find(find_filter,
                         projection,
                         sort=[(replication_key_name, pymongo.ASCENDING)]) as cursor:
        rows_saved = 0
        time_extracted = utils.now()
        start_time = time.time()

        for row in cursor:
            schema_build_start_time = time.time()
            if common.row_to_schema(schema, row):
                singer.write_message(singer.SchemaMessage(
                    stream=common.calculate_destination_stream_name(stream),
                    schema=schema,
                    key_properties=['_id']))
                common.SCHEMA_COUNT[tap_stream_id] += 1
            common.SCHEMA_TIMES[tap_stream_id] += time.time() - schema_build_start_time

            record_message = common.row_to_singer_record(stream,
                                                         row,
                                                         stream_version,
                                                         time_extracted)

            # gen_schema = common.row_to_schema_message(schema, record_message.record, row)
            # if DeepDiff(schema, gen_schema, ignore_order=True) != {}:
            #   emit gen_schema
            #   schema = gen_schema
            singer.write_message(record_message)
            rows_saved += 1

            update_bookmark(row, state, tap_stream_id, replication_key_name)

            if rows_saved % common.UPDATE_BOOKMARK_PERIOD == 0:
                singer.write_message(singer.StateMessage(value=copy.deepcopy(state)))

        common.COUNTS[tap_stream_id] += rows_saved
        common.TIMES[tap_stream_id] += time.time() - start_time

    singer.write_message(activate_version_message)

    logger.info(f'Synced {rows_saved} records for {tap_stream_id}')
