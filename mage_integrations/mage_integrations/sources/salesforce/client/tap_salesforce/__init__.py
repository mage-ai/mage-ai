#!/usr/bin/env python3

import asyncio
import concurrent.futures
import sys
from copy import deepcopy

import singer
import singer.utils as singer_utils
from singer import metadata, metrics

from mage_integrations.sources.base import write_schema, write_state
from mage_integrations.sources.salesforce.client.tap_salesforce import salesforce
from mage_integrations.sources.salesforce.client.tap_salesforce.salesforce import (
    Salesforce,
)
from mage_integrations.sources.salesforce.client.tap_salesforce.salesforce.credentials import (
    OAuthCredentials,
    PasswordCredentials,
    parse_credentials,
)
from mage_integrations.sources.salesforce.client.tap_salesforce.salesforce.exceptions import (
    TapSalesforceException,
    TapSalesforceQuotaExceededException,
)
from mage_integrations.sources.salesforce.client.tap_salesforce.sync import (
    get_stream_version,
    resume_syncing_bulk_query,
    sync_stream,
)

LOGGER = singer.get_logger()

# the tap requires these keys
REQUIRED_CONFIG_KEYS = ['api_type',
                        'select_fields_by_default']

# and either one of these credentials

# OAuth:
# - client_id
# - client_secret
# - refresh_token
OAUTH_CONFIG_KEYS = OAuthCredentials._fields

# Password:
# - username
# - password
# - security_token
PASSWORD_CONFIG_KEYS = PasswordCredentials._fields

CONFIG = {
    'refresh_token': None,
    'client_id': None,
    'client_secret': None,
    'start_date': None
}

FORCED_FULL_TABLE = {
    'BackgroundOperationResult'  # Does not support ordering by CreatedDate
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
        replication_method = catalog_entry['replication_method']

        version = singer.get_bookmark(raw_state,
                                      tap_stream_id,
                                      'version')

        # Preserve state that deals with resuming an incomplete bulk job
        if singer.get_bookmark(raw_state, tap_stream_id, 'JobID'):
            job_id = singer.get_bookmark(
                raw_state,
                tap_stream_id,
                'JobID'
            )
            batches = singer.get_bookmark(
                raw_state,
                tap_stream_id,
                'BatchIDs'
            )
            current_bookmark = singer.get_bookmark(
                raw_state,
                tap_stream_id,
                'JobHighestBookmarkSeen'
            )

            state = singer.write_bookmark(
                state,
                tap_stream_id,
                'JobID',
                job_id
            )
            state = singer.write_bookmark(
                state,
                tap_stream_id,
                'BatchIDs',
                batches
            )
            state = singer.write_bookmark(
                state,
                tap_stream_id,
                'JobHighestBookmarkSeen',
                current_bookmark
            )

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


# pylint: disable=too-many-branches,too-many-statements
def do_discover(sf: Salesforce, streams: list[str], logger=None):
    if logger is None:
        logger = LOGGER

    if not streams:
        """Describes a Salesforce instance's objects and generates a JSON schema for each field."""
        logger.info("Start discovery for all streams")
        global_description = sf.describe()
        objects_to_discover = {o['name'] for o in global_description['sobjects']}
    else:
        logger.info(f"Start discovery: {streams=}")
        objects_to_discover = streams

    key_properties = []

    sf_custom_setting_objects = []
    object_to_tag_references = {}

    # For each SF Object describe it, loop its fields and build a schema
    entries = []
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

            # Compound Address fields cannot be queried by the Bulk API
            if f['type'] == "address" and sf.api_type == salesforce.BULK_API_TYPE:
                unsupported_fields.add(
                    (field_name, 'cannot query compound address fields with bulk API'))

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
        missing_unsupported_field_names = [f[0] for f in unsupported_fields
                                           if f[0] not in field_name_set]

        if missing_unsupported_field_names:
            logger.info(f"Ignoring the following unsupported fields \
                        for object {sobject_name} as they are missing \
                        from the field list: {', '.join(sorted(missing_unsupported_field_names))}")

        if filtered_unsupported_fields:
            logger.info(f"Not syncing the following unsupported fields \
                        for object {sobject_name}: \
                        {', '.join(sorted([k for k, _ in filtered_unsupported_fields]))}")

        # Salesforce Objects are skipped when they do not have an Id field
        if not found_id_field:
            logger.info(
                "Skipping Salesforce Object %s, as it has no Id field",
                sobject_name)
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
            mdata = metadata.write(
                mdata, (), 'replication-key', replication_key
            )
            mdata = metadata.write(
                mdata, (), 'replication-method', "INCREMENTAL"
            )
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


def is_object_type(property_schema):
    """
    Return true if the JSON Schema type is an object or None if detection fails.
    This code is based on the Meltano SDK:
    https://github.com/meltano/sdk/blob/c9c0967b0caca51fe7c87082f9e7c5dd54fa5dfa/singer_sdk/helpers/_typing.py#L50
    """
    if "anyOf" not in property_schema and "type" not in property_schema:
        return None  # Could not detect data type
    for property_type in property_schema.get("anyOf", [property_schema.get("type")]):
        if "object" in property_type or property_type == "object":
            return True
    return False


def is_property_selected(  # noqa: C901  # ignore 'too complex'
        stream_name,
        metadata_map,
        breadcrumb
) -> bool:
    """
    Return True if the property is selected for extract.
    Breadcrumb of `[]` or `None` indicates the stream itself. Otherwise, the
    breadcrumb is the path to a property within the stream.

    The code is based on the Meltano SDK:
    https://github.com/meltano/sdk/blob/c9c0967b0caca51fe7c87082f9e7c5dd54fa5dfa/singer_sdk/helpers/_catalog.py#L63
    """
    breadcrumb = breadcrumb or ()
    if isinstance(breadcrumb, str):
        breadcrumb = tuple([breadcrumb])

    if not metadata:
        # Default to true if no metadata to say otherwise
        return True

    md_entry = metadata_map.get(breadcrumb, {})
    parent_value = None
    if len(breadcrumb) > 0:
        parent_breadcrumb = tuple(list(breadcrumb)[:-2])
        parent_value = is_property_selected(
            stream_name, metadata_map, parent_breadcrumb
        )
    if parent_value is False:
        return parent_value

    selected = md_entry.get("selected")
    selected_by_default = md_entry.get("selected-by-default")
    inclusion = md_entry.get("inclusion")

    if inclusion == "unsupported":
        if selected is True:
            LOGGER.debug(
                "Property '%s' was selected but is not supported. "
                "Ignoring selected==True input.",
                ":".join(breadcrumb),
            )
        return False

    if inclusion == "automatic":
        if selected is False:
            LOGGER.debug(
                "Property '%s' was deselected while also set "
                "for automatic inclusion. Ignoring selected==False input.",
                ":".join(breadcrumb),
            )
        return True

    if selected is not None:
        return selected

    if selected_by_default is not None:
        return selected_by_default

    LOGGER.debug(
        "Selection metadata omitted for '%s':'%s'. "
        "Using parent value of selected=%s.",
        stream_name,
        breadcrumb,
        parent_value,
    )
    return parent_value or False


def pop_deselected_schema(
    schema,
    stream_name,
    breadcrumb,
    metadata_map
):
    """Remove anything from schema that is not selected.
    Walk through schema, starting at the index in breadcrumb, recursively updating in
    place.
    This code is based on
    https://github.com/meltano/sdk/blob/c9c0967b0caca51fe7c87082f9e7c5dd54fa5dfa/singer_sdk/helpers/_catalog.py#L146
    """
    for property_name, val in list(schema.get("properties", {}).items()):
        property_breadcrumb = tuple(
            list(breadcrumb) + ["properties", property_name]
        )
        selected = is_property_selected(
            stream_name, metadata_map, property_breadcrumb
        )
        LOGGER.info(stream_name + '.' + property_name + ' - ' + str(selected))
        if not selected:
            schema["properties"].pop(property_name)
            continue

        if is_object_type(val):
            # call recursively in case any subproperties are deselected.
            pop_deselected_schema(
                val, stream_name, property_breadcrumb, metadata_map
            )


async def sync_catalog_entry(sf, catalog_entry, state, threshold):
    stream_version = get_stream_version(catalog_entry, state)
    stream = catalog_entry['stream']
    stream_alias = catalog_entry.get('stream_alias')
    stream_name = catalog_entry["tap_stream_id"]
    activate_version_message = singer.ActivateVersionMessage(
        stream=(stream_alias or stream), version=stream_version)

    catalog_metadata = metadata.to_map(catalog_entry['metadata'])
    replication_key = catalog_metadata.get((), {}).get('replication-key')
    replication_method = catalog_entry['replication_method']

    mdata = metadata.to_map(catalog_entry['metadata'])

    if not stream_is_selected(mdata):
        LOGGER.debug("%s: Skipping - not selected", stream_name)
        return

    LOGGER.info("%s: Starting", stream_name)

    write_state(state)
    key_properties = metadata.to_map(
        catalog_entry['metadata']).get((), {}).get('table-key-properties')

    # Filter the schema for selected fields
    schema = deepcopy(catalog_entry['schema'])
    pop_deselected_schema(schema, stream_name, (), mdata)

    write_schema(
        stream,
        schema,
        key_properties,
        replication_key,
        stream_alias=stream_alias,
        replication_method=replication_method)
    loop = asyncio.get_event_loop()

    job_id = singer.get_bookmark(state, catalog_entry['tap_stream_id'], 'JobID')
    if job_id:
        with metrics.record_counter(stream) as counter:
            LOGGER.info("Found JobID from previous Bulk Query. Resuming sync for job: %s", job_id)
            # Resuming a sync should clear out the remaining state once finished
            await loop.run_in_executor(None,
                                       resume_syncing_bulk_query,
                                       sf,
                                       catalog_entry,
                                       job_id,
                                       state,
                                       counter)

            LOGGER.info("Completed sync for %s", stream_name)
            state.get('bookmarks', {}).get(catalog_entry['tap_stream_id'], {}).pop('JobID', None)
            state.get('bookmarks', {}).get(catalog_entry['tap_stream_id'], {}).pop('BatchIDs', None)
            bookmark = state.get('bookmarks', {}).get(catalog_entry['tap_stream_id'],
                                                      {}).pop('JobHighestBookmarkSeen', None)
            state = singer.write_bookmark(
                state,
                catalog_entry['tap_stream_id'],
                replication_key,
                bookmark)
            write_state(state)
    else:
        state_msg_threshold = CONFIG.get('state_message_threshold', 1000)

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
        await loop.run_in_executor(None, sync_stream, sf, catalog_entry, state, state_msg_threshold)
        LOGGER.info("Completed sync for %s", stream_name)


def do_sync(sf, catalog, state, threshold=None, logger=None):
    logger.info("Starting sync")
    if threshold is None:
        threshold = 1000

    max_workers = CONFIG.get('max_workers', 8)
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=max_workers)
    loop = asyncio.get_event_loop()
    loop.set_default_executor(executor)

    try:
        streams_to_sync = catalog["streams"]

        # Schedule one task for each catalog entry to be extracted
        # and run them concurrently.
        sync_tasks = (sync_catalog_entry(sf, catalog_entry, state, threshold=threshold)
                      for catalog_entry in streams_to_sync)
        tasks = asyncio.gather(*sync_tasks)
        loop.run_until_complete(tasks)
    finally:
        loop.run_until_complete(loop.shutdown_asyncgens())
        loop.close()

    write_state(state)
    logger.info("Finished sync")


def main_impl():
    args = singer_utils.parse_args(REQUIRED_CONFIG_KEYS)
    CONFIG.update(args.config)

    credentials = parse_credentials(CONFIG)
    sf = None
    try:
        sf = Salesforce(
            credentials=credentials,
            quota_percent_total=CONFIG.get('quota_percent_total'),
            quota_percent_per_run=CONFIG.get('quota_percent_per_run'),
            is_sandbox=CONFIG.get('is_sandbox'),
            select_fields_by_default=CONFIG.get('select_fields_by_default'),
            default_start_date=CONFIG.get('start_date'),
            api_type=CONFIG.get('api_type'))
        sf.login()

        if args.discover:
            do_discover(sf, CONFIG.get("streams_to_discover", []))
        elif args.properties or args.catalog:
            catalog = args.properties or args.catalog.to_dict()
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
            if sf.auth.login_timer:
                sf.auth.login_timer.cancel()


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
        LOGGER.critical(e)
        raise e
