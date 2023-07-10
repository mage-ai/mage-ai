#!/usr/bin/env python3
import sys
from typing import List

import singer
import singer.utils as singer_utils
from singer import metadata, metrics

from mage_integrations.sources.messages import write_schema
from mage_integrations.sources.salesforce.client.tap_salesforce import salesforce
from mage_integrations.sources.salesforce.client.tap_salesforce.salesforce import (
    Salesforce,
)
from mage_integrations.sources.salesforce.client.tap_salesforce.salesforce.bulk import (
    Bulk,
)
from mage_integrations.sources.salesforce.client.tap_salesforce.salesforce.exceptions import (
    TapSalesforceBulkAPIDisabledException,
    TapSalesforceException,
    TapSalesforceQuotaExceededException,
)
from mage_integrations.sources.salesforce.client.tap_salesforce.sync import (
    get_stream_version,
    resume_syncing_bulk_query,
    sync_stream,
)

LOGGER = singer.get_logger()

REQUIRED_CONFIG_KEYS = ['refresh_token',
                        'client_id',
                        'client_secret',
                        'start_date',
                        'api_type',
                        'select_fields_by_default']

CONFIG = {
    'refresh_token': None,
    'client_id': None,
    'client_secret': None,
    'start_date': None
}

FORCED_FULL_TABLE = {
    # Does not support ordering by CreatedDate
    'BackgroundOperationResult',
    'LoginEvent',
    'LightningUriEvent',
    'UriEvent',
    'LogoutEvent',
    'ReportEvent',
}


def get_replication_key(sobject_name, fields):
    if sobject_name in FORCED_FULL_TABLE:
        return None

    fields_list = [f['name'] for f in fields]

    if 'SystemModstamp' in fields_list:
        return 'SystemModstamp'
    elif 'LastModifiedDate' in fields_list:
        return 'LastModifiedDate'
    elif 'CreatedDate' in fields_list:
        return 'CreatedDate'
    elif 'LoginTime' in fields_list and sobject_name == 'LoginHistory':
        return 'LoginTime'
    return None


def stream_is_selected(mdata):
    return mdata.get((), {}).get('selected', False)


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
            current_bookmark = singer.get_bookmark(raw_state, tap_stream_id,
                                                   'JobHighestBookmarkSeen')
            state = singer.write_bookmark(state, tap_stream_id, 'JobID', job_id)
            state = singer.write_bookmark(state, tap_stream_id, 'BatchIDs', batches)
            state = singer.write_bookmark(state, tap_stream_id, 'JobHighestBookmarkSeen',
                                          current_bookmark)

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


# pylint: disable=undefined-variable
def create_property_schema(field, mdata):
    field_name = field['name']

    if field_name == "Id":
        mdata = metadata.write(
            mdata, ('properties', field_name), 'inclusion', 'automatic')
    else:
        mdata = metadata.write(
            mdata, ('properties', field_name), 'inclusion', 'available')

    property_schema, mdata = salesforce.field_to_property_schema(field, mdata)

    return (property_schema, mdata)


def discover_objects(sf, streams: List[str] = None) -> List[str]:
    global_description = sf.describe()

    return list({o['name'] for o in global_description['sobjects'] if not streams or o['name'] in streams}) # noqa


# pylint: disable=too-many-branches,too-many-statements
def do_discover(sf, streams, logger):
    """Describes a Salesforce instance's objects and generates a JSON schema for each field."""

    objects_to_discover = discover_objects(sf, streams=streams)
    key_properties = ['Id']

    sf_custom_setting_objects = []
    object_to_tag_references = {}

    # For each SF Object describe it, loop its fields and build a schema
    entries = []

    # Check if the user has BULK API enabled
    if sf.api_type == 'BULK' and not Bulk(sf).has_permissions():
        raise TapSalesforceBulkAPIDisabledException('This client does not have Bulk API permissions'
                                                    ' received "API_DISABLED_FOR_ORG" error code')

    for sobject_name in objects_to_discover:

        # Skip blacklisted SF objects depending on the api_type in use
        # ChangeEvent objects are not queryable via Bulk or REST (undocumented)
        if sobject_name in sf.get_blacklisted_objects() \
           or sobject_name.endswith("ChangeEvent"):
            continue

        sobject_description = sf.describe(sobject_name)

        # Cache customSetting and Tag objects to check for blacklisting after
        # all objects have been described
        if sobject_description.get("customSetting"):
            sf_custom_setting_objects.append(sobject_name)
        elif sobject_name.endswith("__Tag"):
            relationship_field = next(
                (f for f in sobject_description["fields"] if f.get("relationshipName") == "Item"),
                None)
            if relationship_field:
                # Map {"Object":"Object__Tag"}
                object_to_tag_references[relationship_field["referenceTo"]
                                         [0]] = sobject_name

        fields = sobject_description['fields']
        replication_key = get_replication_key(sobject_name, fields)

        unsupported_fields = set()
        properties = {}
        mdata = metadata.new()

        found_id_field = False

        # Loop over the object's fields
        for f in fields:
            field_name = f['name']

            if field_name == "Id":
                found_id_field = True

            property_schema, mdata = create_property_schema(
                f, mdata)

            # Compound Address fields and geolocations cannot be queried by the Bulk API
            if f['type'] in ("address", "location") and sf.api_type == salesforce.BULK_API_TYPE:
                unsupported_fields.add(
                    (field_name,
                     'cannot query compound address fields or geolocations with bulk API'))

            # we haven't been able to observe any records with a json field, so we
            # are marking it as unavailable until we have an example to work with
            if f['type'] == "json":
                unsupported_fields.add(
                    (field_name, 'do not currently support json fields - please contact support'))

            # Blacklisted fields are dependent on the api_type being used
            field_pair = (sobject_name, field_name)
            if field_pair in sf.get_blacklisted_fields():
                unsupported_fields.add(
                    (field_name, sf.get_blacklisted_fields()[field_pair]))

            inclusion = metadata.get(
                mdata, ('properties', field_name), 'inclusion')

            if sf.select_fields_by_default and inclusion != 'unsupported':
                mdata = metadata.write(
                    mdata, ('properties', field_name), 'selected-by-default', True)

            properties[field_name] = property_schema

        if replication_key:
            mdata = metadata.write(
                mdata, ('properties', replication_key), 'inclusion', 'automatic')

        # There are cases where compound fields are referenced by the associated
        # subfields but are not actually present in the field list
        field_name_set = {f['name'] for f in fields}
        filtered_unsupported_fields = [f for f in unsupported_fields if f[0] in field_name_set]
        missing_unsupported_field_names = [f[0] for f in unsupported_fields if f[0] not in field_name_set] # noqa

        if missing_unsupported_field_names:
            logger.info(f"Ignoring the following unsupported fields for object {sobject_name} as they are missing from the field list: {', '.join(sorted(missing_unsupported_field_names))}") # noqa

        if filtered_unsupported_fields:
            logger.info(f"Not syncing the following unsupported fields for object {sobject_name}: {', '.join(sorted([k for k, _ in filtered_unsupported_fields]))}") # noqa
        # Salesforce Objects are skipped when they do not have an Id field
        if not found_id_field:
            logger.info(
                f"Skipping Salesforce Object {sobject_name}, as it has no Id field")
            continue

        # Any property added to unsupported_fields has metadata generated and
        # removed
        for prop, description in filtered_unsupported_fields:
            if metadata.get(mdata, ('properties', prop),
                            'selected-by-default'):
                metadata.delete(
                    mdata, ('properties', prop), 'selected-by-default')

            mdata = metadata.write(
                mdata, ('properties', prop), 'unsupported-description', description)
            mdata = metadata.write(
                mdata, ('properties', prop), 'inclusion', 'unsupported')

        if replication_key:
            mdata = metadata.write(
                mdata, (), 'valid-replication-keys', [replication_key])
        else:
            mdata = metadata.write(
                mdata,
                (),
                'forced-replication-method',
                {
                    'replication-method': 'FULL_TABLE',
                    'reason': 'No replication keys found from the Salesforce API'})

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

    # For each custom setting field, remove its associated tag from entries
    # See Blacklisting.md for more information
    unsupported_tag_objects = [object_to_tag_references[f]
                               for f in sf_custom_setting_objects if f in object_to_tag_references]
    if unsupported_tag_objects:
        logger.info(  # pylint:disable=logging-not-lazy
            "Skipping the following Tag objects, Tags on Custom Settings Salesforce objects " +
            "are not supported by the Bulk API:")
        logger.info(unsupported_tag_objects)
        entries = [e for e in entries if e['stream']
                   not in unsupported_tag_objects]

    result = {'streams': entries}
    return result


def do_sync(sf, catalog, state, logger):
    starting_stream = state.get("current_stream")

    if starting_stream:
        logger.info(f"Resuming sync from {starting_stream}")
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
            logger.info(f"{stream_name}: Skipping - not selected")
            continue

        if starting_stream:
            if starting_stream == stream_name:
                logger.info(f"{stream_name}: Resuming")
                starting_stream = None
            else:
                logger.info(f"{stream_name}: Skipping - already synced")
                continue
        else:
            logger.info(f"{stream_name}: Starting")

        state["current_stream"] = stream_name
        singer.write_state(state)
        key_properties = metadata.to_map(
            catalog_entry['metadata']).get((), {}).get('table-key-properties')
        bookmark_properties = catalog_entry.get('bookmark_properties', [])
        replication_method = catalog_entry.get('replication_method')
        schema = catalog_entry.get('schema')
        unique_conflict_method = catalog_entry.get('unique_conflict_method')
        unique_constraints = catalog_entry.get('unique_constraints')

        write_schema(
            bookmark_properties=bookmark_properties,
            key_properties=key_properties,
            replication_method=replication_method,
            schema=schema,
            stream_name=stream,
            unique_conflict_method=unique_conflict_method,
            unique_constraints=unique_constraints,
        )

        job_id = singer.get_bookmark(state, catalog_entry['tap_stream_id'], 'JobID')
        batch_ids = singer.get_bookmark(state, catalog_entry['tap_stream_id'], 'BatchIDs')
        # Checking whether job_id list is not empty and batches list is not empty
        if job_id and batch_ids:
            with metrics.record_counter(stream) as counter:
                logger.info(f"Found JobID from previous Bulk Query Resuming sync for job: {job_id}")
                # Resuming a sync should clear out the remaining state once finished
                counter = resume_syncing_bulk_query(sf, catalog_entry, job_id, state, counter)
                logger.info(f"{stream_name}: Completed sync ({counter.value} rows)")
                # Remove Job info from state once we complete this resumed query.
                # One of a few cases could have occurred:
                # 1. The job succeeded, in which case make JobHighestBookmarkSeen the new bookmark
                # 2. The job partially completed,
                #    in which case make JobHighestBookmarkSeen the new bookmark, or
                #    existing bookmark if no bookmark exists for the Job.
                # 3. The job completely failed, in which case maintain the existing bookmark
                #    or None if no bookmark
                state.get('bookmarks', {}).get(catalog_entry['tap_stream_id'], {}).pop('JobID',
                                                                                       None)
                state.get('bookmarks', {}).get(catalog_entry['tap_stream_id'], {}).pop('BatchIDs',
                                                                                       None)
                bookmark = state.get('bookmarks', {}).get(catalog_entry['tap_stream_id'], {}) \
                                                     .pop('JobHighestBookmarkSeen', None)
                existing_bookmark = state.get('bookmarks', {}).get(catalog_entry['tap_stream_id'],
                                                                   {}) \
                                                              .pop(replication_key, None)
                state = singer.write_bookmark(
                    state,
                    catalog_entry['tap_stream_id'],
                    replication_key,
                    # If job is removed, reset to existing bookmark or None
                    bookmark or existing_bookmark)
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
            counter = sync_stream(sf, catalog_entry, state)
            logger.info(f"{stream_name}: Completed sync ({counter.value} rows)")

    state["current_stream"] = None
    singer.write_state(state)
    logger.info("Finished sync")


def main_impl():
    args = singer_utils.parse_args(REQUIRED_CONFIG_KEYS)
    CONFIG.update(args.config)

    sf = None
    try:
        # get lookback window from config
        lookback_window = CONFIG.get('lookback_window')
        lookback_window = int(lookback_window) if lookback_window else None

        sf = Salesforce(
            refresh_token=CONFIG['refresh_token'],
            sf_client_id=CONFIG['client_id'],
            sf_client_secret=CONFIG['client_secret'],
            quota_percent_total=CONFIG.get('quota_percent_total'),
            quota_percent_per_run=CONFIG.get('quota_percent_per_run'),
            is_sandbox=CONFIG.get('is_sandbox'),
            select_fields_by_default=CONFIG.get('select_fields_by_default'),
            default_start_date=CONFIG.get('start_date'),
            api_type=CONFIG.get('api_type'),
            lookback_window=lookback_window)
        sf.login()

        if args.discover:
            do_discover(sf)
        elif args.properties:
            catalog = args.properties
            state = build_state(args.state, catalog)
            do_sync(sf, catalog, state)
    finally:
        if sf:
            if sf.rest_requests_attempted > 0:
                LOGGER.debug(
                    "This job used %s REST requests towards the Salesforce quota.",
                    sf.rest_requests_attempted)
            if sf.jobs_completed > 0:
                LOGGER.debug(
                    "Replication used %s Bulk API jobs towards the Salesforce quota.",
                    sf.jobs_completed)
            if sf.login_timer:
                sf.login_timer.cancel()


def main():
    try:
        main_impl()
    except TapSalesforceQuotaExceededException as e:
        LOGGER.critical(e)
        sys.exit(2)
    except TapSalesforceException as e:
        LOGGER.critical(e)
        sys.exit(1)
    except Exception as e:
        for error_line in str(e).splitlines():
            LOGGER.critical(error_line)
        raise e
