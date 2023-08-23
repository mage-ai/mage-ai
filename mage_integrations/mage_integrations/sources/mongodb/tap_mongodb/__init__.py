#!/usr/bin/env python3
import copy
import json
import ssl
import sys

import pymongo
import singer
from singer import metadata, metrics, utils

import mage_integrations.sources.mongodb.tap_mongodb.sync_strategies.common as common
import mage_integrations.sources.mongodb.tap_mongodb.sync_strategies.full_table as full_table
import mage_integrations.sources.mongodb.tap_mongodb.sync_strategies.incremental as incremental
import mage_integrations.sources.mongodb.tap_mongodb.sync_strategies.oplog as oplog
from mage_integrations.sources.messages import write_schema

LOGGER = singer.get_logger()

REQUIRED_CONFIG_KEYS = [
    'host',
    'port',
    'user',
    'password',
    'database'
]

IGNORE_DBS = ['system', 'local', 'config']
ROLES_WITHOUT_FIND_PRIVILEGES = {
    'dbAdmin',
    'userAdmin',
    'clusterAdmin',
    'clusterManager',
    'clusterMonitor',
    'hostManager',
    'restore'
}
ROLES_WITH_FIND_PRIVILEGES = {
    'read',
    'readWrite',
    'readAnyDatabase',
    'readWriteAnyDatabase',
    'dbOwner',
    'backup',
    'root'
}
ROLES_WITH_ALL_DB_FIND_PRIVILEGES = {
    'readAnyDatabase',
    'readWriteAnyDatabase',
    'root'
}


def get_roles(client, config):
    # usersInfo Command returns object in shape:
    # {
    #     <some_other_keys>
    #     'users': [
    #         {
    #             '_id': <auth_db>.<user>,
    #             'db': <auth_db>,
    #             'mechanisms': ['SCRAM-SHA-1', 'SCRAM-SHA-256'],
    #             'roles': [{'db': 'admin', 'role': 'readWriteAnyDatabase'},
    #                       {'db': 'local', 'role': 'read'}],
    #             'user': <user>,
    #             'userId': <userId>
    #         }
    #     ]
    # }
    user_info = client[config['database']].command({'usersInfo': config['user']})

    users = [u for u in user_info.get('users') if u.get('user') == config['user']]
    if len(users) != 1:
        LOGGER.warning('Could not find any users for %s', config['user'])
        return []

    roles = []
    for role in users[0].get('roles', []):
        if role.get('role') is None:
            continue

        role_name = role['role']
        # roles without find privileges
        if role_name in ROLES_WITHOUT_FIND_PRIVILEGES:
            continue

        # roles with find privileges
        if role_name in ROLES_WITH_FIND_PRIVILEGES:
            if role.get('db'):
                roles.append(role)

        # for custom roles, get the "sub-roles"
        else:
            role_info_list = client[config['database']].command(
                {'rolesInfo': {'role': role_name, 'db': config['database']}})
            role_info = [r for r in role_info_list.get('roles', []) if r['role'] == role_name]
            if len(role_info) != 1:
                continue
            for sub_role in role_info[0].get('roles', []):
                if sub_role.get('role') in ROLES_WITH_FIND_PRIVILEGES:
                    if sub_role.get('db'):
                        roles.append(sub_role)
    return roles


def get_databases(client, config):
    roles = get_roles(client, config)
    LOGGER.info('Roles: %s', roles)

    can_read_all = len([r for r in roles if r['role'] in ROLES_WITH_ALL_DB_FIND_PRIVILEGES]) > 0

    if can_read_all:
        db_names = [d for d in client.list_database_names() if d not in IGNORE_DBS]
    else:
        db_names = [r['db'] for r in roles if r['db'] not in IGNORE_DBS]
    db_names = list(set(db_names))  # Make sure each db is only in the list once
    LOGGER.info('Datbases: %s', db_names)
    return db_names


def produce_collection_schema(collection):
    collection_name = collection.name
    collection_db_name = collection.database.name

    is_view = collection.options().get('viewOn') is not None

    mdata = {}
    mdata = metadata.write(mdata, (), 'table-key-properties', ['_id'])
    mdata = metadata.write(mdata, (), 'database-name', collection_db_name)
    mdata = metadata.write(mdata, (), 'row-count', collection.estimated_document_count())
    mdata = metadata.write(mdata, (), 'is-view', is_view)

    # write valid-replication-key metadata by finding fields that have indexes on them.
    # cannot get indexes for views -- NB: This means no key-based incremental for views?
    if not is_view:
        valid_replication_keys = []
        coll_indexes = collection.index_information()
        # index_information() returns a map of index_name -> index_information
        for _, index_info in coll_indexes.items():
            # we don't support compound indexes
            if len(index_info.get('key')) == 1:
                index_field_info = index_info.get('key')[0]
                # index_field_info is a tuple of (field_name, sort_direction)
                if index_field_info:
                    valid_replication_keys.append(index_field_info[0])

        if valid_replication_keys:
            mdata = metadata.write(mdata, (), 'valid-replication-keys', valid_replication_keys)

    return {
        'table_name': collection_name,
        'stream': collection_name,
        'metadata': metadata.to_list(mdata),
        'tap_stream_id': "{}-{}".format(collection_db_name, collection_name),
        'schema': {
            'type': 'object'
        }
    }


def do_discover(client, config, databases=None, return_streams: bool = False):
    if databases is None:
        databases = []
    streams = []

    for db_name in databases or get_databases(client, config):
        # pylint: disable=invalid-name
        db = client[db_name]

        collection_names = db.list_collection_names()
        for collection_name in [c for c in collection_names
                                if not c.startswith("system.")]:

            collection = db[collection_name]
            is_view = collection.options().get('viewOn') is not None
            # TODO: Add support for views
            if is_view:
                continue

            LOGGER.info("Getting collection info for db: %s, collection: %s",
                        db_name, collection_name)
            streams.append(produce_collection_schema(collection))

    if return_streams:
        return streams

    json.dump({'streams': streams}, sys.stdout, indent=2)


def is_stream_selected(stream):
    mdata = metadata.to_map(stream['metadata'])
    is_selected = metadata.get(mdata, (), 'selected')

    # pylint: disable=singleton-comparison
    return is_selected is True


def get_streams_to_sync(streams, state):

    # get selected streams
    selected_streams = [s for s in streams if is_stream_selected(s)]
    # prioritize streams that have not been processed
    streams_with_state = []
    streams_without_state = []
    for stream in selected_streams:
        bookmarks = state.get('bookmarks', {})
        if bookmarks and bookmarks.get(stream['tap_stream_id']):
            streams_with_state.append(stream)
        else:
            streams_without_state.append(stream)

    ordered_streams = streams_without_state + streams_with_state

    # If the state says we were in the middle of processing a stream, skip
    # to that stream. Then process streams without prior state and finally
    # move onto streams with state (i.e. have been synced in the past)
    currently_syncing = singer.get_currently_syncing(state)
    if currently_syncing:
        currently_syncing_stream = list(filter(
            lambda s: s['tap_stream_id'] == currently_syncing,
            ordered_streams))
        non_currently_syncing_streams = list(filter(lambda s: s['tap_stream_id']
                                                    != currently_syncing,
                                                    ordered_streams))

        streams_to_sync = currently_syncing_stream + non_currently_syncing_streams
    else:
        streams_to_sync = ordered_streams

    return streams_to_sync


def write_schema_message(stream):
    write_schema(
        bookmark_properties=stream.get('bookmark_properties'),
        disable_column_type_check=stream.get('disable_column_type_check'),
        key_properties=stream.get('key_properties', ['_id']),
        partition_keys=stream.get('partition_keys'),
        replication_method=stream.get('replication_method'),
        schema=stream['schema'],
        stream_alias=stream.get('stream_alias'),
        stream_name=common.calculate_destination_stream_name(stream),
        unique_conflict_method=stream.get('unique_conflict_method'),
        unique_constraints=stream.get('unique_constraints'),
    )


def load_stream_projection(stream):
    md_map = metadata.to_map(stream['metadata'])
    stream_projection = metadata.get(md_map, (), 'tap-mongodb.projection')
    if stream_projection == '' or stream_projection == '""' or not stream_projection:
        return None

    try:
        stream_projection = json.loads(stream_projection)
    except Exception as ex:
        err_msg = "The projection: {} for stream {} is not valid json"
        raise common.InvalidProjectionException(err_msg.format(stream_projection,
                                                               stream['tap_stream_id'])) from ex

    if stream_projection and stream_projection.get('_id') == 0:
        raise common.InvalidProjectionException(
            "Projection blacklists key property id for collection {}"
            .format(stream['tap_stream_id']))

    return stream_projection


def clear_state_on_replication_change(stream, state):
    md_map = metadata.to_map(stream['metadata'])
    tap_stream_id = stream['tap_stream_id']

    # replication method changed
    current_replication_method = metadata.get(md_map, (), 'replication-method')
    last_replication_method = singer.get_bookmark(state, tap_stream_id, 'last_replication_method')
    if last_replication_method is not None and \
            (current_replication_method != last_replication_method):
        log_msg = 'Replication method changed from %s to %s, will re-replicate entire collection %s'
        LOGGER.info(log_msg, last_replication_method, current_replication_method, tap_stream_id)
        state = singer.reset_stream(state, tap_stream_id)

    # replication key changed
    if current_replication_method == 'INCREMENTAL':
        last_replication_key = singer.get_bookmark(state, tap_stream_id, 'replication_key_name')
        current_replication_key = metadata.get(md_map, (), 'replication-key')
        if last_replication_key is not None and (current_replication_key != last_replication_key):
            log_msg = 'Replication Key changed from %s to %s,will re-replicate entire collection %s'
            LOGGER.info(log_msg, last_replication_key, current_replication_key, tap_stream_id)
            state = singer.reset_stream(state, tap_stream_id)
        state = singer.write_bookmark(state,
                                      tap_stream_id,
                                      'replication_key_name',
                                      current_replication_key)

    state = singer.write_bookmark(state,
                                  tap_stream_id,
                                  'last_replication_method',
                                  current_replication_method)

    return state


def sync_stream(client, stream, state, logger=None):
    if logger is None:
        logger = LOGGER

    tap_stream_id = stream['tap_stream_id']

    common.COUNTS[tap_stream_id] = 0
    common.TIMES[tap_stream_id] = 0
    common.SCHEMA_COUNT[tap_stream_id] = 0
    common.SCHEMA_TIMES[tap_stream_id] = 0

    md_map = metadata.to_map(stream['metadata'])
    replication_method = metadata.get(md_map, (), 'replication-method')
    database_name = metadata.get(md_map, (), 'database-name')

    stream_projection = load_stream_projection(stream)

    # Emit a state message to indicate that we've started this stream
    state = clear_state_on_replication_change(stream, state)
    state = singer.set_currently_syncing(state, stream['tap_stream_id'])
    singer.write_message(singer.StateMessage(value=copy.deepcopy(state)))

    write_schema_message(stream)
    common.SCHEMA_COUNT[tap_stream_id] += 1

    with metrics.job_timer('sync_table') as timer:
        timer.tags['database'] = database_name
        timer.tags['table'] = stream['table_name']

        if replication_method == 'LOG_BASED':
            if oplog.oplog_has_aged_out(client, state, tap_stream_id):
                # remove all state for stream
                # then it will do a full sync and start oplog again.
                logger.info('Clearing state because Oplog has aged out')
                state.get('bookmarks', {}).pop(tap_stream_id)

            collection_oplog_ts = oplog.get_latest_ts(client)

            # make sure initial full table sync has been completed
            if not singer.get_bookmark(state, tap_stream_id, 'initial_full_table_complete'):
                logger.info('Must complete full table sync before starting oplog '
                            f'replication for {tap_stream_id}')

                # only mark current ts in oplog on first sync so tap has a
                # starting point after the full table sync
                if singer.get_bookmark(state, tap_stream_id, 'version') is None:
                    oplog.update_bookmarks(state, tap_stream_id, collection_oplog_ts)

                full_table.sync_collection(
                    client,
                    stream,
                    state,
                    stream_projection,
                    logger=logger,
                )

            oplog.sync_collection(
                client,
                stream,
                state,
                stream_projection,
                logger=logger,
                max_oplog_ts=collection_oplog_ts,
            )

        elif replication_method == 'FULL_TABLE':
            full_table.sync_collection(
                client,
                stream,
                state,
                stream_projection,
                logger=logger,
            )

        elif replication_method == 'INCREMENTAL':
            incremental.sync_collection(
                client,
                stream,
                state,
                stream_projection,
                logger=logger,
            )
        else:
            raise Exception(
                "only FULL_TABLE, LOG_BASED, and INCREMENTAL replication \
                methods are supported (you passed {})".format(replication_method))

    state = singer.set_currently_syncing(state, None)

    singer.write_message(singer.StateMessage(value=copy.deepcopy(state)))


def do_sync(client, catalog, state, logger=None):
    if logger is None:
        logger = LOGGER

    all_streams = catalog['streams']
    streams_to_sync = get_streams_to_sync(all_streams, state)

    for stream in streams_to_sync:
        sync_stream(client, stream, state, logger=logger)

    logger.info(common.get_sync_summary(catalog))


def build_client(config, logger=None):
    if logger is None:
        logger = LOGGER
    # Default SSL verify mode to true, give option to disable
    verify_mode = config.get('verify_mode', 'true') == 'true'
    use_ssl = config.get('ssl') == 'true'

    connection_params = {
        'host': config['host'],
        'port': int(config['port']),
        'username': config.get('user', None),
        'password': config.get('password', None),
        'ssl': use_ssl,
        'replicaset': config.get('replica_set', None),
        'readPreference': 'secondaryPreferred',
    }
    if config.get('authSource'):
        connection_params['authSource'] = config.get('authSource')
    if config.get('authMechanism'):
        connection_params['authMechanism'] = config.get('authMechanism')

    # NB: "ssl_cert_reqs" must ONLY be supplied if `SSL` is true.
    if not verify_mode and use_ssl:
        connection_params["ssl_cert_reqs"] = ssl.CERT_NONE

    client = pymongo.MongoClient(**connection_params)

    logger.info(f"Connected to MongoDB host: {config['host']}, "
                f"version: {client.server_info().get('version', 'unknown')}")

    common.INCLUDE_SCHEMAS_IN_DESTINATION_STREAM_NAME = \
        (config.get('include_schemas_in_destination_stream_name') == 'true')

    return client


def main_impl():
    args = utils.parse_args(REQUIRED_CONFIG_KEYS)
    config = args.config

    client = build_client(config)

    if args.discover:
        do_discover(client, config)
    elif args.catalog:
        state = args.state or {}
        do_sync(client, args.catalog.to_dict(), state)


def main():
    try:
        main_impl()
    except Exception as exc:
        LOGGER.critical(exc)
        raise exc
