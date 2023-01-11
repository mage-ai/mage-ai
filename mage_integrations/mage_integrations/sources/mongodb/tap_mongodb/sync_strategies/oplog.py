#!/usr/bin/env python3
import time
import pymongo
import singer
from singer import metadata, utils

from bson import timestamp
import tap_mongodb.sync_strategies.common as common

LOGGER = singer.get_logger()

SDC_DELETED_AT = "_sdc_deleted_at"
MAX_UPDATE_BUFFER_LENGTH = 500

def get_latest_ts(client):
    row = client.local.oplog.rs.find_one(sort=[('$natural', pymongo.DESCENDING)])
    return row.get('ts')


def oplog_has_aged_out(client, state, tap_stream_id):
    earliest_ts_row = client.local.oplog.rs.find_one(sort=[('$natural', pymongo.ASCENDING)])

    earliest_ts = earliest_ts_row.get('ts')

    stream_state = state.get('bookmarks', {}).get(tap_stream_id)
    if not stream_state or not stream_state.get('oplog_ts_time'):
        return False

    bookmarked_ts = timestamp.Timestamp(stream_state['oplog_ts_time'],
                                        stream_state['oplog_ts_inc'])

    return bookmarked_ts < earliest_ts


# pylint: disable=invalid-name
def update_bookmarks(state, tap_stream_id, ts):
    state = singer.write_bookmark(state,
                                  tap_stream_id,
                                  'oplog_ts_time',
                                  ts.time)

    state = singer.write_bookmark(state,
                                  tap_stream_id,
                                  'oplog_ts_inc',
                                  ts.inc)

    return state

def write_schema(schema, row, stream):
    schema_build_start_time = time.time()
    if common.row_to_schema(schema, row):
        singer.write_message(singer.SchemaMessage(
            stream=common.calculate_destination_stream_name(stream),
            schema=schema,
            key_properties=['_id']))
        common.SCHEMA_COUNT[stream['tap_stream_id']] += 1
    common.SCHEMA_TIMES[stream['tap_stream_id']] += time.time() - schema_build_start_time


def transform_projection(projection):
    base_projection = {
        "ts": 1, "ns": 1, "op": 1, 'o2': 1
    }
    new_projection = {}


    # If no projection was provided, return base_projection with 'o' whitelisted
    if projection is None:
        new_projection = base_projection
        new_projection['o'] = 1
        return new_projection

    temp_projection = {k:v for k, v in projection.items() if k != '_id'}
    is_whitelist = sum([v for k, v in temp_projection.items()]) > 0

    # If only '_id' is included in projection
    if not temp_projection:
        # If only '_id' is whitelisted, return base projection with 'o._id' whitelisted
        new_projection = base_projection
        new_projection['o._id'] = 1
        return new_projection

    # If whitelist is provided, return base projection along
    # with whitelisted fields and whitelisted id
    if is_whitelist:
        new_projection = base_projection
        for field, value in temp_projection.items():
            new_projection['o.' + field] = value
        new_projection['o._id'] = 1
        return new_projection

    # If blacklist is provided, return blacklisted fields with _id whitelisted
    for field, value in temp_projection.items():
        new_projection['o.' + field] = value
    return new_projection


def flush_buffer(client, update_buffer, stream_projection, db_name, collection_name):
    query = {'_id': {'$in': list(update_buffer)}}
    with client[db_name][collection_name].find(query, stream_projection) as cursor:
        for row in cursor:
            yield row


# pylint: disable=too-many-locals, too-many-branches, too-many-statements
def sync_collection(client, stream, state, stream_projection, max_oplog_ts=None):
    tap_stream_id = stream['tap_stream_id']
    LOGGER.info('Starting oplog sync for %s', tap_stream_id)

    md_map = metadata.to_map(stream['metadata'])
    database_name = metadata.get(md_map, (), 'database-name')
    collection_name = stream.get("table_name")
    stream_state = state.get('bookmarks', {}).get(tap_stream_id)

    oplog_ts = timestamp.Timestamp(stream_state['oplog_ts_time'],
                                   stream_state['oplog_ts_inc'])

    # Write activate version message
    version = common.get_stream_version(tap_stream_id, state)
    activate_version_message = singer.ActivateVersionMessage(
        stream=common.calculate_destination_stream_name(stream),
        version=version
    )
    singer.write_message(activate_version_message)

    time_extracted = utils.now()
    rows_saved = 0
    start_time = time.time()

    oplog_query = {
        'ts': {'$gte': oplog_ts},
        'ns': {'$eq' : '{}.{}'.format(database_name, collection_name)}
    }

    projection = transform_projection(stream_projection)

    oplog_replay = stream_projection is None

    LOGGER.info('Querying %s with:\n\tFind Parameters: %s\n\tProjection: %s\n\toplog_replay: %s',
                tap_stream_id, oplog_query, projection, oplog_replay)

    update_buffer = set()
    schema = {"type": "object", "properties": {}}
    # consider adding oplog_replay, but this would require removing the projection
    # default behavior is a non_tailable cursor but we might want a tailable one
    # regardless of whether its long lived or not.
    with client.local.oplog.rs.find(
            oplog_query,
            projection,
            sort=[('$natural', pymongo.ASCENDING)],
            oplog_replay=oplog_replay
    ) as cursor:
        for row in cursor:
            # assertions that mongo is respecing the ts query and sort order
            if row.get('ts') and row.get('ts') < oplog_ts:
                raise common.MongoAssertionException("Mongo is not honoring the query param")
            if row.get('ts') and row.get('ts') < timestamp.Timestamp(stream_state['oplog_ts_time'],
                                                                     stream_state['oplog_ts_inc']):
                raise common.MongoAssertionException(
                    "Mongo is not honoring the sort ascending param")

            row_op = row['op']

            if row_op == 'i':
                write_schema(schema, row['o'], stream)
                record_message = common.row_to_singer_record(stream,
                                                             row['o'],
                                                             version,
                                                             time_extracted)
                singer.write_message(record_message)

                rows_saved += 1

            elif row_op == 'u':
                update_buffer.add(row['o2']['_id'])

            elif row_op == 'd':

                # remove update from buffer if that document has been deleted
                if row['o']['_id'] in update_buffer:
                    update_buffer.remove(row['o']['_id'])

                # Delete ops only contain the _id of the row deleted
                row['o'][SDC_DELETED_AT] = row['ts']

                write_schema(schema, row['o'], stream)
                record_message = common.row_to_singer_record(stream,
                                                             row['o'],
                                                             version,
                                                             time_extracted)
                singer.write_message(record_message)

                rows_saved += 1

            state = update_bookmarks(state,
                                     tap_stream_id,
                                     row['ts'])

            # flush buffer if it has filled up
            if len(update_buffer) >= MAX_UPDATE_BUFFER_LENGTH:
                for buffered_row in flush_buffer(client,
                                                 update_buffer,
                                                 stream_projection,
                                                 database_name,
                                                 collection_name):
                    write_schema(schema, buffered_row, stream)
                    record_message = common.row_to_singer_record(stream,
                                                                 buffered_row,
                                                                 version,
                                                                 time_extracted)
                    singer.write_message(record_message)

                    rows_saved += 1
                update_buffer = set()

            # write state every UPDATE_BOOKMARK_PERIOD messages
            if rows_saved % common.UPDATE_BOOKMARK_PERIOD == 0:
                # flush buffer before writing state
                for buffered_row in flush_buffer(client,
                                                 update_buffer,
                                                 stream_projection,
                                                 database_name,
                                                 collection_name):
                    write_schema(schema, buffered_row, stream)
                    record_message = common.row_to_singer_record(stream,
                                                                 buffered_row,
                                                                 version,
                                                                 time_extracted)
                    singer.write_message(record_message)

                    rows_saved += 1
                update_buffer = set()

                # write state
                singer.write_message(singer.StateMessage(value=state))

        # flush buffer if finished with oplog
        for buffered_row in flush_buffer(client,
                                         update_buffer,
                                         stream_projection,
                                         database_name,
                                         collection_name):
            write_schema(schema, buffered_row, stream)
            record_message = common.row_to_singer_record(stream,
                                                         buffered_row,
                                                         version,
                                                         time_extracted)

            singer.write_message(record_message)
            rows_saved += 1


    # Compare the current bookmark with the max_oplog_ts and write the max
    bookmarked_ts = timestamp.Timestamp(state.get('bookmarks', {}).get(tap_stream_id, {}).get('oplog_ts_time'),
                                        state.get('bookmarks', {}).get(tap_stream_id, {}).get('oplog_ts_inc'))

    actual_max_ts = max(bookmarked_ts, max_oplog_ts)

    state = update_bookmarks(state,
                             tap_stream_id,
                             actual_max_ts)
    singer.write_message(singer.StateMessage(value=state))

    common.COUNTS[tap_stream_id] += rows_saved
    common.TIMES[tap_stream_id] += time.time()-start_time
    LOGGER.info('Synced %s records for %s', rows_saved, tap_stream_id)
