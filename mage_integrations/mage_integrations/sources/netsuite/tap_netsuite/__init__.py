#!/usr/bin/env python3
import json
import sys
import singer
import singer.utils as singer_utils
from singer import metadata, metrics
import tap_netsuite.netsuite as netsuite
from tap_netsuite.netsuite import NetSuite
from tap_netsuite.netsuite.exceptions import TapNetSuiteException, TapNetSuiteQuotaExceededException
from tap_netsuite.sync import (sync_stream, get_stream_version)

LOGGER = singer.get_logger()

REQUIRED_CONFIG_KEYS = [
    'ns_account',
    'ns_consumer_key',
    'ns_consumer_secret',
    'ns_token_key',
    'ns_token_secret',
    'select_fields_by_default'
]

CONFIG = {
    'ns_account': None,
    'ns_consumer_key': None,
    'ns_consumer_secret': None,
    'ns_token_key': None,
    'ns_token_secret': None,
    'start_date': None
}

REPLICATION_KEY = ["lastModifiedDate", "LastModifiedDate", "LastModDate"]


def stream_is_selected(mdata):
    return mdata.get((), {}).get('selected', False)


# pylint: disable=undefined-variable
def create_property_schema(field, mdata):
    field_name = field['name']
    field_name_to_write = field['displayName']

    if field_name == "internalId":
        mdata = metadata.write(
            mdata, ('properties', field_name_to_write), 'inclusion', 'automatic')
    else:
        mdata = metadata.write(
            mdata, ('properties', field_name_to_write), 'inclusion', 'available')

    property_schema = netsuite.field_to_property_schema(field)

    return property_schema, mdata


def build_client(config):
    return NetSuite(
        ns_account=config.get('ns_account'),
        ns_consumer_key=config.get('ns_consumer_key'),
        ns_consumer_secret=config.get('ns_consumer_secret'),
        ns_token_key=config.get('ns_token_key'),
        ns_token_secret=config.get('ns_token_secret'),
        fetch_child=config.get('fetch_child', True),
        is_sandbox=config.get('is_sandbox'),
        default_start_date=config.get('start_date'),
        select_fields_by_default=config.get('select_fields_by_default'),
    )


def build_state(raw_state, catalog):
    state = {}

    for catalog_entry in catalog['streams']:
        tap_stream_id = catalog_entry['tap_stream_id']
        catalog_metadata = metadata.to_map(catalog_entry['metadata'])
        replication_method = catalog_metadata.get((), {}).get('replication-method')

        version = singer.get_bookmark(raw_state,
                                      tap_stream_id,
                                      'version')

        # Preserve state that deals with resuming an incomplete bulk job
        if singer.get_bookmark(raw_state, tap_stream_id, 'JobID'):
            job_id = singer.get_bookmark(raw_state, tap_stream_id, 'JobID')
            batches = singer.get_bookmark(raw_state, tap_stream_id, 'BatchIDs')
            current_bookmark = singer.get_bookmark(raw_state, tap_stream_id, 'JobHighestBookmarkSeen')
            state = singer.write_bookmark(state, tap_stream_id, 'JobID', job_id)
            state = singer.write_bookmark(state, tap_stream_id, 'BatchIDs', batches)
            state = singer.write_bookmark(state, tap_stream_id, 'JobHighestBookmarkSeen', current_bookmark)

        if replication_method == 'INCREMENTAL':
            replication_key = catalog_metadata.get((), {}).get('replication-key')
            replication_key_value = singer.get_bookmark(raw_state,
                                                        tap_stream_id,
                                                        replication_key)
            if version is not None:
                state = singer.write_bookmark(
                    state, tap_stream_id, 'version', version)
            if replication_key_value is not None:
                state = singer.write_bookmark(
                    state, tap_stream_id, replication_key, replication_key_value)
        elif replication_method == 'FULL_TABLE' and version is None:
            state = singer.write_bookmark(state, tap_stream_id, 'version', version)

    return state


def do_sync(ns, catalog, state, logger=LOGGER):
    starting_stream = state.get("current_stream")

    if starting_stream:
        logger.info("Resuming sync from %s", starting_stream)
    else:
        logger.info("Starting sync")

    for catalog_entry in catalog["streams"]:
        stream_version = get_stream_version(catalog_entry, state)
        stream = catalog_entry['stream']
        stream_alias = catalog_entry.get('stream_alias')
        stream_name = catalog_entry["tap_stream_id"]
        activate_version_message = singer.ActivateVersionMessage(
            stream=(stream_alias or stream), version=stream_version)

        catalog_metadata = metadata.to_map(catalog_entry['metadata'])
        replication_key = catalog_metadata.get((), {}).get('replication-key')

        mdata = metadata.to_map(catalog_entry['metadata'])

        if not stream_is_selected(mdata):
            logger.info("%s: Skipping - not selected", stream_name)
            continue

        if starting_stream:
            if starting_stream == stream_name:
                logger.info("%s: Resuming", stream_name)
                starting_stream = None
            else:
                logger.info("%s: Skipping - already synced", stream_name)
                continue
        else:
            logger.info("%s: Starting", stream_name)

        state["current_stream"] = stream_name
        singer.write_state(state)
        key_properties = metadata.to_map(catalog_entry['metadata']).get((), {}).get('table-key-properties')
        singer.write_schema(
            stream,
            catalog_entry['schema'],
            key_properties,
            replication_key,
            stream_alias)

        job_id = singer.get_bookmark(state, catalog_entry['tap_stream_id'], 'JobID')
        if job_id:
            with metrics.record_counter(stream) as counter:
                # Remove Job info from state once we complete this resumed query. One of a few cases could have occurred:
                # 1. The job succeeded, in which case make JobHighestBookmarkSeen the new bookmark
                # 2. The job partially completed, in which case make JobHighestBookmarkSeen the new bookmark, or
                #    existing bookmark if no bookmark exists for the Job.
                # 3. The job completely failed, in which case maintain the existing bookmark, or None if no bookmark
                state.get('bookmarks', {}).get(catalog_entry['tap_stream_id'], {}).pop('JobID', None)
                state.get('bookmarks', {}).get(catalog_entry['tap_stream_id'], {}).pop('BatchIDs', None)
                bookmark = state.get('bookmarks', {}).get(catalog_entry['tap_stream_id'], {}) \
                    .pop('JobHighestBookmarkSeen', None)
                existing_bookmark = state.get('bookmarks', {}).get(catalog_entry['tap_stream_id'], {}) \
                    .pop(replication_key, None)
                state = singer.write_bookmark(
                    state,
                    catalog_entry['tap_stream_id'],
                    replication_key,
                    bookmark or existing_bookmark)  # If job is removed, reset to existing bookmark or None
                singer.write_state(state)
        else:
            # Tables with a replication_key or an empty bookmark will emit an
            # activate_version at the beginning of their sync
            bookmark_is_empty = state.get('bookmarks', {}).get(
                catalog_entry['tap_stream_id']) is None

            if replication_key or bookmark_is_empty:
                singer.write_message(activate_version_message)
                state = singer.write_bookmark(state,
                                              catalog_entry['tap_stream_id'],
                                              'version',
                                              stream_version)
            counter = sync_stream(ns, catalog_entry, state)
            logger.info("%s: Completed sync (%s rows)", stream_name, counter.value)

    state["current_stream"] = None
    singer.write_state(state)
    logger.info("Finished sync")


# pylint: disable=too-many-branches,too-many-statements
def do_discover(ns, return_streams=True):
    """Describes NetSuite instance's objects and generates a JSON schema for each field."""
    objects_to_discover = ns.describe()
    key_properties = ['Id']

    # For each Object describe it, loop its fields and build a schema
    entries = []

    for sobject_name in objects_to_discover:

        fields = ns.describe(sobject_name)

        replication_key = REPLICATION_KEY
        if sobject_name == 'Account':
            replication_key = None

        properties = {}
        mdata = metadata.new()

        # Loop over the object's fields
        for f in fields:
            field_name = f['displayName']

            property_schema, mdata = create_property_schema(
                f, mdata)

            if ns.select_fields_by_default:
                mdata = metadata.write(
                    mdata, ('properties', field_name), 'selected-by-default', True)

            properties[field_name] = property_schema

        replication_key = [f["displayName"] for f in fields if f["displayName"] in replication_key]
        if replication_key:
            replication_key = replication_key[0]
            mdata = metadata.write(
                mdata, ('properties', replication_key), 'inclusion', 'automatic')

        if replication_key:
            mdata = metadata.write(
                mdata, (), 'valid-replication-keys', [replication_key])
            mdata = metadata.write(mdata, (), 'replication-key', replication_key)
            mdata = metadata.write(mdata, (), 'replication-method', 'INCREMENTAL')
        else:
            mdata = metadata.write(
                mdata,
                (),
                'forced-replication-method',
                {
                    'replication-method': 'FULL_TABLE',
                    'reason': 'No replication keys found from the NetSuite API'})

        mdata = metadata.write(mdata, (), 'table-key-properties', key_properties)

        schema = {
            'type': 'object',
            'additionalProperties': False,
            'properties': properties
        }

        entry = {
            'stream': sobject_name,
            'tap_stream_id': sobject_name,
            'schema': schema,
            'metadata': metadata.to_list(mdata)
        }

        entries.append(entry)

    result = {'streams': entries}
    if return_streams:
        return result
    json.dump(result, sys.stdout, indent=4)


def main_impl():
    args = singer_utils.parse_args(REQUIRED_CONFIG_KEYS)

    CONFIG.update(args.config)
    LOGGER.debug(f"NetSuite CONFIG IS {json.dumps(CONFIG)}")

    ns = None
    try:
        ns = build_client(CONFIG)

        ns.connect_tba()

        if args.discover:
            do_discover(ns)
        elif args.properties:
            catalog = args.properties
            state = build_state(args.state, catalog)
            do_sync(ns, catalog, state)
    finally:
        if ns:
            ns = None


def main():
    try:
        main_impl()
    except TapNetSuiteQuotaExceededException as e:
        LOGGER.critical(e)
        sys.exit(2)
    except TapNetSuiteException as e:
        LOGGER.critical(e)
        sys.exit(1)
    except Exception as e:
        LOGGER.critical(e)
        raise e


if __name__ == '__main__':
    main()
