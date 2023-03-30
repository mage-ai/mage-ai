#!/usr/bin/env python3
import datetime
import pytz
import itertools
import os
import re
import sys
import json
# pylint: disable=import-error
import attr
import backoff
import requests
import singer
import singer.messages
from singer import metrics
from singer import metadata
from singer import utils
from singer import (
    transform,
    UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING,
    Transformer,
    _transform_datetime,
)
from mage_integrations.sources.hubspot.tap_hubspot.constants import BOOKMARK_PROPERTIES_BY_STREAM_NAME
from mage_integrations.sources.messages import write_schema
from mage_integrations.utils.logger import Logger

LOGGER = Logger(
    caller='tap_hubspot',
    log_to_stdout=False,
    logger=singer.get_logger(),
    verbose=True,
)
SESSION = requests.Session()

REQUEST_TIMEOUT = 300


class InvalidAuthException(Exception):
    pass


class SourceUnavailableException(Exception):
    pass


class DependencyException(Exception):
    pass


class DataFields:
    offset = 'offset'


class StateFields:
    offset = 'offset'
    this_stream = 'this_stream'


BASE_URL = "https://api.hubapi.com"

CONTACTS_BY_COMPANY = "contacts_by_company"

DEFAULT_CHUNK_SIZE = 1000 * 60 * 60 * 24

V3_PREFIXES = {'hs_date_entered', 'hs_date_exited', 'hs_time_in'}

CONFIG = {
    "access_token": None,
    "token_expires": None,
    "email_chunk_size": DEFAULT_CHUNK_SIZE,
    "subscription_chunk_size": DEFAULT_CHUNK_SIZE,

    # in config.json
    "redirect_uri": None,
    "client_id": None,
    "client_secret": None,
    "refresh_token": None,
    "start_date": None,
    "hapikey": None,
    "include_inactives": None,
}
STATE = {}

ENDPOINTS = {
    "contacts_properties":  "/properties/v1/contacts/properties",
    "contacts_all":         "/contacts/v1/lists/all/contacts/all",
    "contacts_recent":      "/contacts/v1/lists/recently_updated/contacts/recent",
    "contacts_detail":      "/contacts/v1/contact/vids/batch/",

    "companies_properties": "/companies/v2/properties",
    "companies_all":        "/companies/v2/companies/paged",
    "companies_recent":     "/companies/v2/companies/recent/modified",
    "companies_detail":     "/companies/v2/companies/{company_id}",
    "contacts_by_company":  "/companies/v2/companies/{company_id}/vids",

    "deals_properties":     "/properties/v1/deals/properties",
    "deals_all":            "/deals/v1/deal/paged",
    "deals_recent":         "/deals/v1/deal/recent/modified",
    "deals_detail":         "/deals/v1/deal/{deal_id}",

    "deals_v3_batch_read":  "/crm/v3/objects/deals/batch/read",
    "deals_v3_properties":  "/crm/v3/properties/deals",

    "deal_pipelines":       "/deals/v1/pipelines",

    "campaigns_all":        "/email/public/v1/campaigns/by-id",
    "campaigns_detail":     "/email/public/v1/campaigns/{campaign_id}",

    "engagements_all":        "/engagements/v1/engagements/paged",

    "subscription_changes": "/email/public/v1/subscriptions/timeline",
    "email_events":         "/email/public/v1/events",
    "contact_lists":        "/contacts/v1/lists",
    "forms":                "/forms/v2/forms",
    "workflows":            "/automation/v3/workflows",
    "owners":               "/owners/v2/owners",
}


def get_start(state, tap_stream_id, bookmark_key, older_bookmark_key=None):
    """
    If the current bookmark_key is available in the state, then return the bookmark_key value.
    If it is not available then check and return the older_bookmark_key in the state for the existing connection.
    If none of the keys are available in the state for a particular stream, then return start_date.

    We have made this change because of an update in the replication key of the deals stream.
    So, if any existing connections have only older_bookmark_key in the state then tap should utilize that bookmark value.
    Then next time, the tap should use the current bookmark value.
    """
    current_bookmark = singer.get_bookmark(state, tap_stream_id, bookmark_key)
    if current_bookmark is None:
        if older_bookmark_key:
            previous_bookmark = singer.get_bookmark(state, tap_stream_id, older_bookmark_key)
            if previous_bookmark:
                return previous_bookmark

        return CONFIG['start_date']
    return current_bookmark


def get_current_sync_start(state, tap_stream_id):
    current_sync_start_value = singer.get_bookmark(state, tap_stream_id, "current_sync_start")
    if current_sync_start_value is None:
        return current_sync_start_value
    return utils.strptime_to_utc(current_sync_start_value)


def write_current_sync_start(state, tap_stream_id, start):
    value = start
    if start is not None:
        value = utils.strftime(start)
    return singer.write_bookmark(state, tap_stream_id, "current_sync_start", value)


def clean_state(state, logger=LOGGER):
    """ Clear deprecated keys out of state. """
    for stream, bookmark_map in state.get("bookmarks", {}).items():
        if "last_sync_duration" in bookmark_map:
            logger.info(f'{stream} - Removing last_sync_duration from state.')
            state["bookmarks"][stream].pop("last_sync_duration", None)


def get_url(endpoint, **kwargs):
    if endpoint not in ENDPOINTS:
        raise ValueError("Invalid endpoint {}".format(endpoint))

    return BASE_URL + ENDPOINTS[endpoint].format(**kwargs)


def get_field_type_schema(field_type):
    if field_type == "bool":
        return {"type": ["null", "boolean"]}

    elif field_type == "datetime":
        return {"type": ["null", "string"],
                "format": "date-time"}

    elif field_type == "number":
        # A value like 'N/A' can be returned for this type,
        # so we have to let this be a string sometimes
        return {"type": ["null", "number", "string"]}

    else:
        return {"type": ["null", "string"]}


def get_field_schema(field_type, extras=False):
    if extras:
        return {
            "type": "object",
            "properties": {
                "value": get_field_type_schema(field_type),
                "timestamp": get_field_type_schema("datetime"),
                "source": get_field_type_schema("string"),
                "sourceId": get_field_type_schema("string"),
            }
        }
    else:
        return {
            "type": "object",
            "properties": {
                "value": get_field_type_schema(field_type),
            }
        }


def parse_custom_schema(entity_name, data):
    return {
        field['name']: get_field_schema(field['type'], entity_name != 'contacts')
        for field in data
    }


def get_custom_schema(entity_name):
    return parse_custom_schema(entity_name, request(get_url(entity_name + "_properties")).json())


def get_v3_schema(entity_name):
    url = get_url("deals_v3_properties")
    return parse_custom_schema(entity_name, request(url).json()['results'])


def get_abs_path(path):
    return os.path.join(os.path.dirname(os.path.realpath(__file__)), path)


def load_associated_company_schema():
    associated_company_schema = load_schema("companies")
    #pylint: disable=line-too-long
    associated_company_schema['properties']['company-id'] = associated_company_schema['properties'].pop('companyId')
    associated_company_schema['properties']['portal-id'] = associated_company_schema['properties'].pop('portalId')
    return associated_company_schema


def load_schema(entity_name):
    schema = utils.load_json(get_abs_path('schemas/{}.json'.format(entity_name)))
    if entity_name in ["contacts", "companies", "deals"]:
        custom_schema = get_custom_schema(entity_name)

        schema['properties']['properties'] = {
            "type": "object",
            "properties": custom_schema,
        }

        if entity_name in ["deals"]:
            v3_schema = get_v3_schema(entity_name)
            for key, value in v3_schema.items():
                if any(prefix in key for prefix in V3_PREFIXES):
                    custom_schema[key] = value

        # Move properties to top level
        custom_schema_top_level = {'property_{}'.format(k): v for k, v in custom_schema.items()}
        schema['properties'].update(custom_schema_top_level)

        # Make properties_versions selectable and share the same schema.
        versions_schema = utils.load_json(get_abs_path('schemas/versions.json'))
        schema['properties']['properties_versions'] = versions_schema

    if entity_name == "contacts":
        schema['properties']['associated-company'] = load_associated_company_schema()

    return schema


#pylint: disable=invalid-name
def acquire_access_token_from_refresh_token():
    payload = {
        "grant_type": "refresh_token",
        "redirect_uri": CONFIG['redirect_uri'],
        "refresh_token": CONFIG['refresh_token'],
        "client_id": CONFIG['client_id'],
        "client_secret": CONFIG['client_secret'],
    }

    resp = requests.post(BASE_URL + "/oauth/v1/token", data=payload, timeout=get_request_timeout())
    if resp.status_code == 403:
        raise InvalidAuthException(resp.content)

    resp.raise_for_status()
    auth = resp.json()
    CONFIG['access_token'] = auth['access_token']
    CONFIG['refresh_token'] = auth['refresh_token']
    CONFIG['token_expires'] = (
        datetime.datetime.utcnow() +
        datetime.timedelta(seconds=auth['expires_in'] - 600))
    LOGGER.info("Token refreshed. Expires at %s", CONFIG['token_expires'])


def giveup(exc):
    return exc.response is not None \
        and 400 <= exc.response.status_code < 500 \
        and exc.response.status_code != 429


def on_giveup(details):
    if len(details['args']) == 2:
        url, params = details['args']
    else:
        url = details['args']
        params = {}

    raise Exception("Giving up on request after {} tries with url {} and params {}" \
                    .format(details['tries'], url, params))


URL_SOURCE_RE = re.compile(BASE_URL + r'/(\w+)/')


def parse_source_from_url(url):
    match = URL_SOURCE_RE.match(url)
    if match:
        return match.group(1)
    return None


def get_params_and_headers(params):
    """
    This function makes a params object and headers object based on the
    authentication values available. If there is an `hapikey` in the config, we
    need that in `params` and not in the `headers`. Otherwise, we need to get an
    `access_token` to put in the `headers` and not in the `params`
    """
    params = params or {}
    hapikey = CONFIG['hapikey']
    if hapikey is None:
        if 'access_token' not in CONFIG and (CONFIG['token_expires'] is None or CONFIG['token_expires'] < datetime.datetime.utcnow()):
            acquire_access_token_from_refresh_token()
        headers = {'Authorization': 'Bearer {}'.format(CONFIG['access_token'])}
    else:
        params['hapikey'] = hapikey
        headers = {}

    if 'user_agent' in CONFIG:
        headers['User-Agent'] = CONFIG['user_agent']

    return params, headers


# backoff for Timeout error is already included in "requests.exceptions.RequestException"
# as it is a parent class of "Timeout" error
@backoff.on_exception(backoff.constant,
                      (requests.exceptions.RequestException,
                       requests.exceptions.HTTPError),
                      max_tries=5,
                      jitter=None,
                      giveup=giveup,
                      on_giveup=on_giveup,
                      interval=10)
def request(url, params=None, logger=LOGGER):

    params, headers = get_params_and_headers(params)

    req = requests.Request('GET', url, params=params, headers=headers).prepare()
    logger.info(f'GET {req.url}')
    with metrics.http_request_timer(parse_source_from_url(url)) as timer:
        resp = SESSION.send(req, timeout=get_request_timeout())
        timer.tags[metrics.Tag.http_status_code] = resp.status_code
        if resp.status_code == 403:
            raise SourceUnavailableException(resp.content)
        else:
            resp.raise_for_status()

    return resp


# {"bookmarks" : {"contacts" : { "lastmodifieddate" : "2001-01-01"
#                                "offset" : {"vidOffset": 1234
#                                           "timeOffset": "3434434 }}
#                 "users" : { "timestamp" : "2001-01-01"}}
#  "currently_syncing" : "contacts"
# }
# }
def lift_properties_and_versions(record):
    for key, value in record.get('properties', {}).items():
        computed_key = "property_{}".format(key)
        versions = value.get('versions')
        record[computed_key] = value

        if versions:
            if not record.get('properties_versions'):
                record['properties_versions'] = []
            record['properties_versions'] += versions
    return record


# backoff for Timeout error is already included in "requests.exceptions.RequestException"
# as it is a parent class of "Timeout" error
@backoff.on_exception(backoff.constant,
                      (requests.exceptions.RequestException,
                       requests.exceptions.HTTPError),
                      max_tries=5,
                      jitter=None,
                      giveup=giveup,
                      on_giveup=on_giveup,
                      interval=10)
def post_search_endpoint(url, data, params=None):

    params, headers = get_params_and_headers(params)
    headers['content-type'] = "application/json"

    with metrics.http_request_timer(url) as _:
        resp = requests.post(
            url=url,
            json=data,
            params=params,
            timeout=get_request_timeout(),
            headers=headers
        )

        resp.raise_for_status()

    return resp


def merge_responses(v1_data, v3_data):
    for v1_record in v1_data:
        v1_id = v1_record.get('dealId')
        for v3_record in v3_data:
            v3_id = v3_record.get('id')
            if str(v1_id) == v3_id:
                v1_record['properties'] = {**v1_record['properties'],
                                           **v3_record['properties']}


def process_v3_deals_records(v3_data):
    """
    This function:
    1. filters out fields that don't contain 'hs_date_entered_*' and
       'hs_date_exited_*'
    2. changes a key value pair in `properties` to a key paired to an
       object with a key 'value' and the original value
    """
    transformed_v3_data = []
    for record in v3_data:
        new_properties = {field_name : {'value': field_value}
                          for field_name, field_value in record['properties'].items()
                          if any(prefix in field_name for prefix in V3_PREFIXES)}
        transformed_v3_data.append({**record, 'properties' : new_properties})
    return transformed_v3_data


def get_v3_deals(v3_fields, v1_data):
    v1_ids = [{'id': str(record['dealId'])} for record in v1_data]

    # Sending the first v3_field is enough to get them all
    v3_body = {'inputs': v1_ids,
               'properties': [v3_fields[0]],}
    v3_url = get_url('deals_v3_batch_read')
    v3_resp = post_search_endpoint(v3_url, v3_body)
    return v3_resp.json()['results']


def gen_request(
    STATE,
    tap_stream_id,
    url,
    params,
    path,
    more_key,
    offset_keys,
    offset_targets,
    v3_fields=None,
    logger=LOGGER,
):
    if len(offset_keys) != len(offset_targets):
        raise ValueError("Number of offset_keys must match number of offset_targets")

    if singer.get_offset(STATE, tap_stream_id):
        params.update(singer.get_offset(STATE, tap_stream_id))

    with metrics.record_counter(tap_stream_id) as counter:
        while True:
            data = request(url, params, logger=logger).json()

            if data.get(path) is None:
                raise RuntimeError("Unexpected API response: {} not in {}".format(path, data.keys()))

            if v3_fields:
                v3_data = get_v3_deals(v3_fields, data[path])

                # The shape of v3_data is different than the V1 response,
                # so we transform v3 to look like v1
                transformed_v3_data = process_v3_deals_records(v3_data)
                merge_responses(data[path], transformed_v3_data)

            for row in data[path]:
                counter.increment()
                yield row

            if not data.get(more_key, False):
                break

            STATE = singer.clear_offset(STATE, tap_stream_id)
            for key, target in zip(offset_keys, offset_targets):
                if key in data:
                    params[target] = data[key]
                    STATE = singer.set_offset(STATE, tap_stream_id, target, data[key])

            singer.write_state(STATE)

    STATE = singer.clear_offset(STATE, tap_stream_id)
    singer.write_state(STATE)


def _sync_contact_vids(
    catalog,
    vids,
    schema,
    bumble_bee,
    bookmark_values,
    bookmark_key,
    logger=LOGGER,
):
    if len(vids) == 0:
        return

    data = request(
        get_url('contacts_detail'),
        params={'vid': vids, 'showListMemberships': True, "formSubmissionMode": "all"},
        logger=logger,
    ).json()
    time_extracted = utils.now()
    mdata = metadata.to_map(catalog.get('metadata'))

    for record in data.values():
        # Explicitly add the bookmark field "versionTimestamp" and its value in the record.
        record[bookmark_key] = bookmark_values.get(record.get("vid"))
        record = bumble_bee.transform(lift_properties_and_versions(record), schema, mdata)
        singer.write_record("contacts", record, catalog.get('stream_alias'), time_extracted=time_extracted)


default_contact_params = {
    'showListMemberships': True,
    'includeVersion': True,
    'count': 100,
}


def sync_contacts(STATE, ctx, logger=LOGGER):
    catalog = ctx.get_catalog_from_id(singer.get_currently_syncing(STATE))
    bookmark_key = 'versionTimestamp'
    start = utils.strptime_with_tz(get_start(STATE, "contacts", bookmark_key))
    logger.info(f'sync_contacts from {start}')

    max_bk_value = start

    schema = catalog['schema']
    schema['properties'].update(load_schema('contacts')['properties'])
    write_schema(
        stream_name=catalog['tap_stream_id'],
        schema=schema,
        key_properties=catalog.get('key_properties', ['vid']),
        bookmark_properties=catalog.get('bookmark_properties', [bookmark_key]),
        disable_column_type_check=catalog.get('disable_column_type_check'),
        partition_keys=catalog.get('partition_keys'),
        replication_method=catalog.get('replication_method'),
        stream_alias=catalog.get('stream_alias'),
        unique_conflict_method=catalog.get('unique_conflict_method'),
        unique_constraints=catalog.get('unique_constraints'),
    )

    url = get_url("contacts_all")

    vids = []
    # Dict to store replication key value for each contact record
    bookmark_values = {}
    with Transformer(UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING) as bumble_bee:
        for row in gen_request(
            STATE,
            'contacts',
            url,
            default_contact_params,
            'contacts',
            'has-more',
            ['vid-offset'],
            ['vidOffset'],
            logger=logger,
        ):
            modified_time = None
            if bookmark_key in row:
                modified_time = utils.strptime_with_tz(
                    _transform_datetime( # pylint: disable=protected-access
                        row[bookmark_key],
                        UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING))

            if not modified_time or modified_time >= start:
                vids.append(row['vid'])
                # Adding replication key value in `bookmark_values` dict
                # Here, key is vid(primary key) and value is replication key value.
                bookmark_values[row['vid']] = utils.strftime(modified_time)

            if modified_time and modified_time >= max_bk_value:
                max_bk_value = modified_time

            if len(vids) == 100:
                _sync_contact_vids(
                    catalog,
                    vids,
                    schema,
                    bumble_bee,
                    bookmark_values,
                    bookmark_key,
                    logger=logger,
                )
                vids = []

        _sync_contact_vids(
            catalog,
            vids,
            schema,
            bumble_bee,
            bookmark_values,
            bookmark_key,
            logger=logger,
        )

    STATE = singer.write_bookmark(STATE, 'contacts', bookmark_key, utils.strftime(max_bk_value))
    singer.write_state(STATE)
    return STATE


class ValidationPredFailed(Exception):
    pass


# companies_recent only supports 10,000 results. If there are more than this,
# we'll need to use the companies_all endpoint
def use_recent_companies_endpoint(response):
    return response["total"] < 10000


default_contacts_by_company_params = {'count' : 100}


# NB> to do: support stream aliasing and field selection
def _sync_contacts_by_company(STATE, ctx, company_id):
    schema = load_schema(CONTACTS_BY_COMPANY)
    catalog = ctx.get_catalog_from_id(singer.get_currently_syncing(STATE))
    mdata = metadata.to_map(catalog.get('metadata'))
    url = get_url("contacts_by_company", company_id=company_id)
    path = 'vids'
    with Transformer(UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING) as bumble_bee:
        with metrics.record_counter(CONTACTS_BY_COMPANY) as counter:
            data = request(url, default_contacts_by_company_params).json()

            if data.get(path) is None:
                raise RuntimeError("Unexpected API response: {} not in {}".format(path, data.keys()))

            for row in data[path]:
                counter.increment()
                record = {'company-id': company_id,
                          'contact-id': row}
                record = bumble_bee.transform(lift_properties_and_versions(record), schema, mdata)
                singer.write_record("contacts_by_company", record, time_extracted=utils.now())

    return STATE


default_company_params = {
    'limit': 250, 'properties': ["createdate", "hs_lastmodifieddate"]
}


def sync_companies(STATE, ctx, logger=LOGGER):
    catalog = ctx.get_catalog_from_id(singer.get_currently_syncing(STATE))
    mdata = metadata.to_map(catalog.get('metadata'))
    bumble_bee = Transformer(UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING)
    bookmark_key = 'property_hs_lastmodifieddate'
    bookmark_field_in_record = 'hs_lastmodifieddate'

    start = utils.strptime_to_utc(get_start(STATE, "companies", bookmark_key, older_bookmark_key=bookmark_field_in_record))
    logger.info(f'sync_companies from {start}')

    schema = catalog['schema']
    schema['properties'].update(load_schema('companies')['properties'])
    write_schema(
        stream_name=catalog['tap_stream_id'],
        schema=schema,
        key_properties=catalog.get('key_properties', ['companyId']),
        bookmark_properties=catalog.get('bookmark_properties', [bookmark_key]),
        disable_column_type_check=catalog.get('disable_column_type_check'),
        partition_keys=catalog.get('partition_keys'),
        replication_method=catalog.get('replication_method'),
        stream_alias=catalog.get('stream_alias'),
        unique_conflict_method=catalog.get('unique_conflict_method'),
        unique_constraints=catalog.get('unique_constraints'),
    )

    # Because this stream doesn't query by `lastUpdated`, it cycles
    # through the data set every time. The issue with this is that there
    # is a race condition by which records may be updated between the
    # start of this table's sync and the end, causing some updates to not
    # be captured, in order to combat this, we must store the current
    # sync's start in the state and not move the bookmark past this value.
    current_sync_start = get_current_sync_start(STATE, "companies") or utils.now()
    STATE = write_current_sync_start(STATE, "companies", current_sync_start)
    singer.write_state(STATE)

    url = get_url("companies_all")
    max_bk_value = start
    if CONTACTS_BY_COMPANY in ctx.selected_stream_ids:
        contacts_by_company_schema = load_schema(CONTACTS_BY_COMPANY)
        write_schema(
            stream_name='contacts_by_company',
            schema=contacts_by_company_schema,
            key_properties=["company-id", "contact-id"],
        )

    with bumble_bee:
        for row in gen_request(
            STATE,
            'companies',
            url,
            default_company_params,
            'companies',
            'has-more',
            ['offset'],
            ['offset'],
            logger=logger,
        ):
            row_properties = row['properties']
            modified_time = None
            if bookmark_field_in_record in row_properties:
                # Hubspot returns timestamps in millis
                timestamp_millis = row_properties[bookmark_field_in_record]['timestamp'] / 1000.0
                modified_time = datetime.datetime.fromtimestamp(timestamp_millis, datetime.timezone.utc)
            elif 'createdate' in row_properties:
                # Hubspot returns timestamps in millis
                timestamp_millis = row_properties['createdate']['timestamp'] / 1000.0
                modified_time = datetime.datetime.fromtimestamp(timestamp_millis, datetime.timezone.utc)

            if modified_time and modified_time >= max_bk_value:
                max_bk_value = modified_time

            if not modified_time or modified_time >= start:
                record = request(get_url("companies_detail", company_id=row['companyId'])).json()
                record = bumble_bee.transform(lift_properties_and_versions(record), schema, mdata)
                singer.write_record("companies", record, catalog.get('stream_alias'), time_extracted=utils.now())
                if CONTACTS_BY_COMPANY in ctx.selected_stream_ids:
                    STATE = _sync_contacts_by_company(STATE, ctx, record['companyId'])

    # Don't bookmark past the start of this sync to account for updated records during the sync.
    new_bookmark = min(max_bk_value, current_sync_start)
    STATE = singer.write_bookmark(STATE, 'companies', bookmark_key, utils.strftime(new_bookmark))
    STATE = write_current_sync_start(STATE, 'companies', None)
    singer.write_state(STATE)
    return STATE


def has_selected_custom_field(mdata):
    top_level_custom_props = [x for x in mdata if len(x) == 2 and 'property_' in x[1]]
    for prop in top_level_custom_props:
        # Return 'True' if the custom field is automatic.
        if (mdata.get(prop, {}).get('selected') is True) or (mdata.get(prop, {}).get('inclusion') == "automatic"):
            return True
    return False


def sync_deals(STATE, ctx, logger=LOGGER):
    catalog = ctx.get_catalog_from_id(singer.get_currently_syncing(STATE))
    mdata = metadata.to_map(catalog.get('metadata'))
    bookmark_key = 'property_hs_lastmodifieddate'
    # The Bookmark field('hs_lastmodifieddate') available in the record is different from
    # the tap's bookmark key(property_hs_lastmodifieddate).
    # `hs_lastmodifieddate` is available in the properties field at the nested level.
    # As `hs_lastmodifieddate` is not available at the 1st level it can not be marked as automatic inclusion.
    # tap includes all nested fields of the properties field as custom fields in the schema by appending the
    # prefix `property_` along with each field.
    # That's why bookmark_key is `property_hs_lastmodifieddate` so that we can mark it as automatic inclusion.

    last_modified_date = 'hs_lastmodifieddate'

    # Tap was used to write bookmark using replication key `hs_lastmodifieddate`.
    # Now, as the replication key gets changed to "property_hs_lastmodifieddate", `get_start` function would return
    # bookmark value of older bookmark key(`hs_lastmodifieddate`) if it is available.
    # So, here `older_bookmark_key` is the previous bookmark key that may be available in the state of
    # the existing connection.

    start = utils.strptime_with_tz(get_start(STATE, "deals", bookmark_key, older_bookmark_key=last_modified_date))
    max_bk_value = start
    logger.info(f'sync_deals from {start}')
    params = {
        'limit': 100,
        'includeAssociations': False,
        'properties': [],
    }

    schema = catalog['schema']
    schema['properties'].update(load_schema('deals')['properties'])
    write_schema(
        stream_name=catalog['tap_stream_id'],
        schema=schema,
        key_properties=catalog.get('key_properties', ['dealId']),
        bookmark_properties=catalog.get('bookmark_properties', [bookmark_key]),
        disable_column_type_check=catalog.get('disable_column_type_check'),
        partition_keys=catalog.get('partition_keys'),
        replication_method=catalog.get('replication_method'),
        stream_alias=catalog.get('stream_alias'),
        unique_conflict_method=catalog.get('unique_conflict_method'),
        unique_constraints=catalog.get('unique_constraints'),
    )

    # Check if we should  include associations
    for key in mdata.keys():
        if 'associations' in key:
            assoc_mdata = mdata.get(key)
            if (assoc_mdata.get('selected') and assoc_mdata.get('selected') is True):
                params['includeAssociations'] = True

    v3_fields = None
    has_selected_properties = mdata.get(('properties', 'properties'), {}).get('selected')
    if has_selected_properties or has_selected_custom_field(mdata):
        # On 2/12/20, hubspot added a lot of additional properties for
        # deals, and appending all of them to requests ended up leading to
        # 414 (url-too-long) errors. Hubspot recommended we use the
        # `includeAllProperties` and `allpropertiesFetchMode` params
        # instead.
        params['includeAllProperties'] = True
        params['allPropertiesFetchMode'] = 'latest_version'

        # Grab selected `hs_date_entered/exited` fields to call the v3 endpoint with
        v3_fields = [breadcrumb[1].replace('property_', '')
                     for breadcrumb, mdata_map in mdata.items()
                     if breadcrumb
                     and (mdata_map.get('selected') is True or has_selected_properties)
                     and any(prefix in breadcrumb[1] for prefix in V3_PREFIXES)]

    url = get_url('deals_all')
    with Transformer(UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING) as bumble_bee:
        for row in gen_request(
            STATE,
            'deals',
            url,
            params,
            'deals',
            'hasMore',
            ['offset'],
            ['offset'],
            v3_fields=v3_fields,
            logger=logger,
        ):
            row_properties = row['properties']
            modified_time = None
            if last_modified_date in row_properties:
                # Hubspot returns timestamps in millis
                timestamp_millis = row_properties[last_modified_date]['timestamp'] / 1000.0
                modified_time = datetime.datetime.fromtimestamp(timestamp_millis, datetime.timezone.utc)
            elif 'createdate' in row_properties:
                # Hubspot returns timestamps in millis
                timestamp_millis = row_properties['createdate']['timestamp'] / 1000.0
                modified_time = datetime.datetime.fromtimestamp(timestamp_millis, datetime.timezone.utc)
            if modified_time and modified_time >= max_bk_value:
                max_bk_value = modified_time

            if not modified_time or modified_time >= start:
                record = bumble_bee.transform(lift_properties_and_versions(row), schema, mdata)
                singer.write_record("deals", record, catalog.get('stream_alias'), time_extracted=utils.now())

    STATE = singer.write_bookmark(STATE, 'deals', bookmark_key, utils.strftime(max_bk_value))
    singer.write_state(STATE)
    return STATE

#NB> no suitable bookmark is available: https://developers.hubspot.com/docs/methods/email/get_campaigns_by_id
def sync_campaigns(STATE, ctx, logger=LOGGER):
    catalog = ctx.get_catalog_from_id(singer.get_currently_syncing(STATE))
    mdata = metadata.to_map(catalog.get('metadata'))

    schema = catalog['schema']
    schema['properties'].update(load_schema('campaigns')['properties'])
    write_schema(
        stream_name=catalog['tap_stream_id'],
        schema=schema,
        key_properties=catalog.get('key_properties', ['id']),
        bookmark_properties=catalog.get('bookmark_properties'),
        disable_column_type_check=catalog.get('disable_column_type_check'),
        partition_keys=catalog.get('partition_keys'),
        replication_method=catalog.get('replication_method'),
        stream_alias=catalog.get('stream_alias'),
        unique_conflict_method=catalog.get('unique_conflict_method'),
        unique_constraints=catalog.get('unique_constraints'),
    )

    logger.info('sync_campaigns(NO bookmarks)')
    url = get_url('campaigns_all')
    params = {'limit': 500}

    with Transformer(UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING) as bumble_bee:
        for row in gen_request(
            STATE,
            'campaigns',
            url,
            params,
            'campaigns',
            'hasMore',
            ['offset'],
            ['offset'],
            logger=logger,
        ):
            record = request(get_url("campaigns_detail", campaign_id=row['id'])).json()
            record = bumble_bee.transform(lift_properties_and_versions(record), schema, mdata)
            singer.write_record("campaigns", record, catalog.get('stream_alias'), time_extracted=utils.now())

    return STATE


def sync_entity_chunked(STATE, catalog, entity_name, key_properties, path, logger=LOGGER):
    bookmark_key = 'startTimestamp'

    schema = catalog['schema']
    schema['properties'].update(load_schema(entity_name)['properties'])
    write_schema(
        stream_name=catalog['tap_stream_id'],
        schema=schema,
        key_properties=catalog.get('key_properties', key_properties),
        bookmark_properties=catalog.get('bookmark_properties', [bookmark_key]),
        disable_column_type_check=catalog.get('disable_column_type_check'),
        partition_keys=catalog.get('partition_keys'),
        replication_method=catalog.get('replication_method'),
        stream_alias=catalog.get('stream_alias'),
        unique_conflict_method=catalog.get('unique_conflict_method'),
        unique_constraints=catalog.get('unique_constraints'),
    )

    start = get_start(STATE, entity_name, bookmark_key)
    logger.info(f'sync_{entity_name} from {start}')

    now = datetime.datetime.utcnow().replace(tzinfo=pytz.UTC)
    now_ts = int(now.timestamp() * 1000)

    start_ts = int(utils.strptime_with_tz(start).timestamp() * 1000)
    url = get_url(entity_name)

    mdata = metadata.to_map(catalog.get('metadata'))

    if entity_name == 'email_events':
        window_size = int(CONFIG['email_chunk_size'])
    elif entity_name == 'subscription_changes':
        window_size = int(CONFIG['subscription_chunk_size'])

    with metrics.record_counter(entity_name) as counter:
        while start_ts < now_ts:
            end_ts = start_ts + window_size
            params = {
                'startTimestamp': start_ts,
                'endTimestamp': end_ts,
                'limit': 1000,
            }
            with Transformer(UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING) as bumble_bee:
                while True:
                    our_offset = singer.get_offset(STATE, entity_name)
                    if bool(our_offset) and our_offset.get('offset') is not None:
                        params[StateFields.offset] = our_offset.get('offset')

                    data = request(url, params).json()
                    time_extracted = utils.now()

                    if data.get(path) is None:
                        raise RuntimeError("Unexpected API response: {} not in {}".format(path, data.keys()))

                    for row in data[path]:
                        counter.increment()
                        record = bumble_bee.transform(lift_properties_and_versions(row), schema, mdata)
                        singer.write_record(entity_name,
                                            record,
                                            catalog.get('stream_alias'),
                                            time_extracted=time_extracted)
                    if data.get('hasMore'):
                        STATE = singer.set_offset(STATE, entity_name, 'offset', data['offset'])
                        singer.write_state(STATE)
                    else:
                        STATE = singer.clear_offset(STATE, entity_name)
                        singer.write_state(STATE)
                        break
            STATE = singer.write_bookmark(
                STATE,
                entity_name,
                'startTimestamp',
                utils.strftime(datetime.datetime.fromtimestamp((start_ts / 1000), datetime.timezone.utc)))  # pylint: disable=line-too-long
            singer.write_state(STATE)
            start_ts = end_ts

    STATE = singer.clear_offset(STATE, entity_name)
    singer.write_state(STATE)
    return STATE


def sync_subscription_changes(STATE, ctx, logger=LOGGER):
    catalog = ctx.get_catalog_from_id(singer.get_currently_syncing(STATE))
    STATE = sync_entity_chunked(
        STATE,
        catalog,
        'subscription_changes',
        ['timestamp', 'portalId', 'recipient'],
        'timeline',
        logger=logger,
    )
    return STATE


def sync_email_events(STATE, ctx, logger=LOGGER):
    catalog = ctx.get_catalog_from_id(singer.get_currently_syncing(STATE))
    STATE = sync_entity_chunked(
        STATE,
        catalog,
        'email_events',
        ['id'],
        'events',
        logger=logger,
    )
    return STATE


def sync_contact_lists(STATE, ctx, logger=LOGGER):
    catalog = ctx.get_catalog_from_id(singer.get_currently_syncing(STATE))
    mdata = metadata.to_map(catalog.get('metadata'))
    bookmark_key = 'updatedAt'

    schema = catalog['schema']
    schema['properties'].update(load_schema('contact_lists')['properties'])
    write_schema(
        stream_name=catalog['tap_stream_id'],
        schema=schema,
        key_properties=catalog.get('key_properties', ['listId']),
        bookmark_properties=catalog.get('bookmark_properties', [bookmark_key]),
        disable_column_type_check=catalog.get('disable_column_type_check'),
        partition_keys=catalog.get('partition_keys'),
        replication_method=catalog.get('replication_method'),
        stream_alias=catalog.get('stream_alias'),
        unique_conflict_method=catalog.get('unique_conflict_method'),
        unique_constraints=catalog.get('unique_constraints'),
    )

    start = get_start(STATE, "contact_lists", bookmark_key)
    max_bk_value = start

    logger.info(f'sync_contact_lists from {start}')

    url = get_url("contact_lists")
    params = {'count': 250}
    with Transformer(UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING) as bumble_bee:
        for row in gen_request(
            STATE,
            'contact_lists',
            url,
            params,
            'lists',
            'has-more',
            ['offset'],
            ['offset'],
            logger=logger,
        ):
            record = bumble_bee.transform(lift_properties_and_versions(row), schema, mdata)

            if record[bookmark_key] >= start:
                singer.write_record("contact_lists", record, catalog.get('stream_alias'), time_extracted=utils.now())
            if record[bookmark_key] >= max_bk_value:
                max_bk_value = record[bookmark_key]

    STATE = singer.write_bookmark(STATE, 'contact_lists', bookmark_key, max_bk_value)
    singer.write_state(STATE)

    return STATE


def sync_forms(STATE, ctx, logger=LOGGER):
    catalog = ctx.get_catalog_from_id(singer.get_currently_syncing(STATE))
    mdata = metadata.to_map(catalog.get('metadata'))
    bookmark_key = 'updatedAt'

    schema = catalog['schema']
    schema['properties'].update(load_schema('forms')['properties'])
    write_schema(
        stream_name=catalog['tap_stream_id'],
        schema=schema,
        key_properties=catalog.get('key_properties', ['guid']),
        bookmark_properties=catalog.get('bookmark_properties', [bookmark_key]),
        disable_column_type_check=catalog.get('disable_column_type_check'),
        partition_keys=catalog.get('partition_keys'),
        replication_method=catalog.get('replication_method'),
        stream_alias=catalog.get('stream_alias'),
        unique_conflict_method=catalog.get('unique_conflict_method'),
        unique_constraints=catalog.get('unique_constraints'),
    )

    start = get_start(STATE, 'forms', bookmark_key)
    max_bk_value = start

    logger.info(f'sync_forms from {start}')

    data = request(get_url('forms')).json()
    time_extracted = utils.now()

    with Transformer(UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING) as bumble_bee:
        for row in data:
            record = bumble_bee.transform(lift_properties_and_versions(row), schema, mdata)

            if record[bookmark_key] >= start:
                singer.write_record("forms", record, catalog.get('stream_alias'), time_extracted=time_extracted)
            if record[bookmark_key] >= max_bk_value:
                max_bk_value = record[bookmark_key]

    STATE = singer.write_bookmark(STATE, 'forms', bookmark_key, max_bk_value)
    singer.write_state(STATE)

    return STATE


def sync_workflows(STATE, ctx, logger=LOGGER):
    catalog = ctx.get_catalog_from_id(singer.get_currently_syncing(STATE))
    mdata = metadata.to_map(catalog.get('metadata'))
    bookmark_key = 'updatedAt'

    schema = catalog['schema']
    schema['properties'].update(load_schema('workflows')['properties'])
    write_schema(
        stream_name=catalog['tap_stream_id'],
        schema=schema,
        key_properties=catalog.get('key_properties', ['id']),
        bookmark_properties=catalog.get('bookmark_properties', [bookmark_key]),
        disable_column_type_check=catalog.get('disable_column_type_check'),
        partition_keys=catalog.get('partition_keys'),
        replication_method=catalog.get('replication_method'),
        stream_alias=catalog.get('stream_alias'),
        unique_conflict_method=catalog.get('unique_conflict_method'),
        unique_constraints=catalog.get('unique_constraints'),
    )

    start = get_start(STATE, "workflows", bookmark_key)
    max_bk_value = start

    STATE = singer.write_bookmark(STATE, 'workflows', bookmark_key, max_bk_value)
    singer.write_state(STATE)

    logger.info(f'sync_workflows from {start}')

    data = request(get_url("workflows")).json()
    time_extracted = utils.now()

    with Transformer(UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING) as bumble_bee:
        for row in data['workflows']:
            record = bumble_bee.transform(lift_properties_and_versions(row), schema, mdata)
            if record[bookmark_key] >= start:
                singer.write_record("workflows", record, catalog.get('stream_alias'), time_extracted=time_extracted)
            if record[bookmark_key] >= max_bk_value:
                max_bk_value = record[bookmark_key]

    STATE = singer.write_bookmark(STATE, 'workflows', bookmark_key, max_bk_value)
    singer.write_state(STATE)
    return STATE


def sync_owners(STATE, ctx, logger=LOGGER):
    catalog = ctx.get_catalog_from_id(singer.get_currently_syncing(STATE))
    mdata = metadata.to_map(catalog.get('metadata'))
    bookmark_key = 'updatedAt'

    schema = catalog['schema']
    schema['properties'].update(load_schema('owners')['properties'])
    write_schema(
        stream_name=catalog['tap_stream_id'],
        schema=schema,
        key_properties=catalog.get('key_properties', ['ownerId']),
        bookmark_properties=catalog.get('bookmark_properties', [bookmark_key]),
        disable_column_type_check=catalog.get('disable_column_type_check'),
        partition_keys=catalog.get('partition_keys'),
        replication_method=catalog.get('replication_method'),
        stream_alias=catalog.get('stream_alias'),
        unique_conflict_method=catalog.get('unique_conflict_method'),
        unique_constraints=catalog.get('unique_constraints'),
    )

    start = get_start(STATE, "owners", bookmark_key)
    max_bk_value = start

    logger.info(f'sync_owners from {start}')

    params = {}
    if CONFIG.get('include_inactives'):
        params['includeInactives'] = "true"
    data = request(get_url("owners"), params).json()

    time_extracted = utils.now()

    with Transformer(UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING) as bumble_bee:
        for row in data:
            record = bumble_bee.transform(lift_properties_and_versions(row), schema, mdata)
            if record[bookmark_key] >= max_bk_value:
                max_bk_value = record[bookmark_key]

            if record[bookmark_key] >= start:
                singer.write_record("owners", record, catalog.get('stream_alias'), time_extracted=time_extracted)

    STATE = singer.write_bookmark(STATE, 'owners', bookmark_key, max_bk_value)
    singer.write_state(STATE)
    return STATE


def sync_engagements(STATE, ctx, logger=LOGGER):
    catalog = ctx.get_catalog_from_id(singer.get_currently_syncing(STATE))
    mdata = metadata.to_map(catalog.get('metadata'))
    bookmark_key = 'lastUpdated'

    schema = catalog['schema']
    schema['properties'].update(load_schema('engagements')['properties'])
    write_schema(
        stream_name=catalog['tap_stream_id'],
        schema=schema,
        key_properties=catalog.get('key_properties', ['engagement_id']),
        bookmark_properties=catalog.get('bookmark_properties', [bookmark_key]),
        disable_column_type_check=catalog.get('disable_column_type_check'),
        partition_keys=catalog.get('partition_keys'),
        replication_method=catalog.get('replication_method'),
        stream_alias=catalog.get('stream_alias'),
        unique_conflict_method=catalog.get('unique_conflict_method'),
        unique_constraints=catalog.get('unique_constraints'),
    )

    start = get_start(STATE, "engagements", bookmark_key)

    # Because this stream doesn't query by `lastUpdated`, it cycles
    # through the data set every time. The issue with this is that there
    # is a race condition by which records may be updated between the
    # start of this table's sync and the end, causing some updates to not
    # be captured, in order to combat this, we must store the current
    # sync's start in the state and not move the bookmark past this value.
    current_sync_start = get_current_sync_start(STATE, "engagements") or utils.now()
    STATE = write_current_sync_start(STATE, "engagements", current_sync_start)
    singer.write_state(STATE)

    max_bk_value = start
    logger.info(f'sync_engagements from {start}')

    STATE = singer.write_bookmark(STATE, 'engagements', bookmark_key, start)
    singer.write_state(STATE)

    url = get_url("engagements_all")
    params = {'limit': 250}
    top_level_key = "results"
    engagements = gen_request(
        STATE,
        'engagements',
        url,
        params,
        top_level_key,
        'hasMore',
        ['offset'],
        ['offset'],
        logger=logger,
    )

    time_extracted = utils.now()

    with Transformer(UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING) as bumble_bee:
        for engagement in engagements:
            record = bumble_bee.transform(lift_properties_and_versions(engagement), schema, mdata)
            if record['engagement'][bookmark_key] >= start:
                # hoist PK and bookmark field to top-level record
                record['engagement_id'] = record['engagement']['id']
                record[bookmark_key] = record['engagement'][bookmark_key]
                singer.write_record("engagements", record, catalog.get('stream_alias'), time_extracted=time_extracted)
                if record['engagement'][bookmark_key] >= max_bk_value:
                    max_bk_value = record['engagement'][bookmark_key]

    # Don't bookmark past the start of this sync to account for updated records during the sync.
    new_bookmark = min(utils.strptime_to_utc(max_bk_value), current_sync_start)
    STATE = singer.write_bookmark(STATE, 'engagements', bookmark_key, utils.strftime(new_bookmark))
    STATE = write_current_sync_start(STATE, 'engagements', None)
    singer.write_state(STATE)
    return STATE


def sync_deal_pipelines(STATE, ctx, logger=LOGGER):
    catalog = ctx.get_catalog_from_id(singer.get_currently_syncing(STATE))
    mdata = metadata.to_map(catalog.get('metadata'))

    schema = catalog['schema']
    schema['properties'].update(load_schema('deal_pipelines')['properties'])
    write_schema(
        stream_name=catalog['tap_stream_id'],
        schema=schema,
        key_properties=catalog.get('key_properties', ['pipelineId']),
        bookmark_properties=catalog.get('bookmark_properties', []),
        disable_column_type_check=catalog.get('disable_column_type_check'),
        partition_keys=catalog.get('partition_keys'),
        replication_method=catalog.get('replication_method'),
        stream_alias=catalog.get('stream_alias'),
        unique_conflict_method=catalog.get('unique_conflict_method'),
        unique_constraints=catalog.get('unique_constraints'),
    )

    logger.info('sync_deal_pipelines')
    data = request(get_url('deal_pipelines')).json()
    with Transformer(UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING) as bumble_bee:
        for row in data:
            record = bumble_bee.transform(lift_properties_and_versions(row), schema, mdata)
            singer.write_record("deal_pipelines", record, catalog.get('stream_alias'), time_extracted=utils.now())
    singer.write_state(STATE)
    return STATE


@attr.s
class Stream:
    tap_stream_id = attr.ib()
    sync = attr.ib()
    key_properties = attr.ib()
    replication_key = attr.ib()
    replication_method = attr.ib()


STREAMS = [
    # Do these first as they are incremental
    Stream('subscription_changes', sync_subscription_changes, ['timestamp', 'portalId', 'recipient'], 'startTimestamp', 'INCREMENTAL'),
    Stream('email_events', sync_email_events, ['id'], 'startTimestamp', 'INCREMENTAL'),
    Stream('contacts', sync_contacts, ["vid"], 'versionTimestamp', 'INCREMENTAL'),
    Stream('deals', sync_deals, ["dealId"], 'property_hs_lastmodifieddate', 'INCREMENTAL'),
    Stream('companies', sync_companies, ["companyId"], 'property_hs_lastmodifieddate', 'INCREMENTAL'),

    # Do these last as they are full table
    Stream('forms', sync_forms, ['guid'], 'updatedAt', 'FULL_TABLE'),
    Stream('workflows', sync_workflows, ['id'], 'updatedAt', 'FULL_TABLE'),
    Stream('owners', sync_owners, ["ownerId"], 'updatedAt', 'FULL_TABLE'),
    Stream('campaigns', sync_campaigns, ["id"], None, 'FULL_TABLE'),
    Stream('contact_lists', sync_contact_lists, ["listId"], 'updatedAt', 'FULL_TABLE'),
    Stream('deal_pipelines', sync_deal_pipelines, ['pipelineId'], None, 'FULL_TABLE'),
    Stream('engagements', sync_engagements, ["engagement_id"], 'lastUpdated', 'FULL_TABLE')
]


def get_streams_to_sync(streams, state):
    target_stream = singer.get_currently_syncing(state)
    result = streams
    if target_stream:
        skipped = list(itertools.takewhile(
            lambda x: x.tap_stream_id != target_stream, streams))
        rest = list(itertools.dropwhile(
            lambda x: x.tap_stream_id != target_stream, streams))
        result = rest + skipped  # Move skipped streams to end
    if not result:
        raise Exception('Unknown stream {} in state'.format(target_stream))
    return result


def get_selected_streams(remaining_streams, ctx):
    selected_streams = []
    for stream in remaining_streams:
        if stream.tap_stream_id in ctx.selected_stream_ids:
            selected_streams.append(stream)
    return selected_streams


def do_sync(STATE, catalog, logger=LOGGER):
    # Clear out keys that are no longer used
    clean_state(STATE, logger=logger)

    ctx = Context(catalog)
    validate_dependencies(ctx)

    remaining_streams = get_streams_to_sync(STREAMS, STATE)
    selected_streams = get_selected_streams(remaining_streams, ctx)
    logger.info('Starting sync. Will sync these streams: '
                f'{[stream.tap_stream_id for stream in selected_streams]}')
    for stream in selected_streams:
        logger.info(f'Syncing {stream.tap_stream_id}')
        STATE = singer.set_currently_syncing(STATE, stream.tap_stream_id)
        singer.write_state(STATE)

        try:
            STATE = stream.sync(STATE, ctx, logger=logger)  # pylint: disable=not-callable
        except SourceUnavailableException as ex:
            error_message = str(ex).replace(CONFIG['access_token'], 10 * '*')
            logger.error(error_message)

    STATE = singer.set_currently_syncing(STATE, None)
    singer.write_state(STATE)
    logger.info("Sync completed")


class Context:
    def __init__(self, catalog):
        self.selected_stream_ids = set()

        for stream in catalog.get('streams'):
            mdata = metadata.to_map(stream['metadata'])
            if metadata.get(mdata, (), 'selected'):
                self.selected_stream_ids.add(stream['tap_stream_id'])

        self.catalog = catalog

    def get_catalog_from_id(self, tap_stream_id):
        return [c for c in self.catalog.get('streams') if c.get('stream') == tap_stream_id][0]


# stream a is dependent on stream STREAM_DEPENDENCIES[a]
STREAM_DEPENDENCIES = {
    CONTACTS_BY_COMPANY: 'companies'
}


def validate_dependencies(ctx):
    errs = []
    msg_tmpl = ("Unable to extract {0} data. "
                "To receive {0} data, you also need to select {1}.")

    for k, v in STREAM_DEPENDENCIES.items():
        if k in ctx.selected_stream_ids and v not in ctx.selected_stream_ids:
            errs.append(msg_tmpl.format(k, v))
    if errs:
        raise DependencyException(" ".join(errs))


def load_discovered_schema(stream):
    schema = load_schema(stream.tap_stream_id)
    mdata = metadata.new()

    mdata = metadata.write(mdata, (), 'table-key-properties', stream.key_properties)
    mdata = metadata.write(mdata, (), 'forced-replication-method', stream.replication_method)

    if stream.replication_key:
        mdata = metadata.write(mdata, (), 'valid-replication-keys', [stream.replication_key])

    for field_name in schema['properties'].keys():
        if field_name in stream.key_properties or field_name == stream.replication_key:
            mdata = metadata.write(mdata, ('properties', field_name), 'inclusion', 'automatic')
        else:
            mdata = metadata.write(mdata, ('properties', field_name), 'inclusion', 'available')

    # The engagements stream has nested data that we synthesize; The engagement field needs to be automatic
    if stream.tap_stream_id == "engagements":
        mdata = metadata.write(mdata, ('properties', 'engagement'), 'inclusion', 'automatic')
        mdata = metadata.write(mdata, ('properties', 'lastUpdated'), 'inclusion', 'automatic')

    return schema, metadata.to_list(mdata)


def discover_schemas(logger=LOGGER):
    result = {'streams': []}
    for stream in STREAMS:
        logger.info(f'Loading schema for {stream.tap_stream_id}')
        try:
            schema, mdata = load_discovered_schema(stream)
            result['streams'].append({
                'bookmark_properties': BOOKMARK_PROPERTIES_BY_STREAM_NAME.get(stream.tap_stream_id),
                'key_properties': stream.key_properties,
                'metadata': mdata,
                'replication_method': stream.replication_method,
                'schema': schema,
                'stream': stream.tap_stream_id,
                'tap_stream_id': stream.tap_stream_id,
            })
        except SourceUnavailableException as err:
            logger.info(f'{err}', tags=dict(
                stream=stream.tap_stream_id,
            ))

    try:
        # Load the contacts_by_company schema
        logger.info('Loading schema for contacts_by_company')
        contacts_by_company = Stream(
            'contacts_by_company',
            _sync_contacts_by_company,
            ['company-id', 'contact-id'],
            None,
            'FULL_TABLE',
        )
        schema, mdata = load_discovered_schema(contacts_by_company)

        result['streams'].append({
            'bookmark_properties': BOOKMARK_PROPERTIES_BY_STREAM_NAME.get(CONTACTS_BY_COMPANY),
            'key_properties': [
                'company-id',
                'contact-id',
            ],
            'metadata': mdata,
            'replication_method': 'FULL_TABLE',
            'schema': schema,
            'stream': CONTACTS_BY_COMPANY,
            'tap_stream_id': CONTACTS_BY_COMPANY,
        })
    except SourceUnavailableException as err:
        logger.info(f'{err}', tags=dict(
            stream=stream.tap_stream_id,
        ))

    return result


def do_discover(return_streams: bool = False, logger=LOGGER):
    logger.info('Loading schemas')

    catalog = discover_schemas(logger=logger)

    if return_streams:
        return catalog

    json.dump(catalog, sys.stdout, indent=4)


def get_request_timeout():
    # Get `request_timeout` value from config.
    config_request_timeout = CONFIG.get('request_timeout')
    # if config request_timeout is other than 0, "0" or "" then use request_timeout
    if config_request_timeout and float(config_request_timeout):
        request_timeout = float(config_request_timeout)
    else:
        # If value is 0, "0", "" or not passed then it set default to 300 seconds.
        request_timeout = REQUEST_TIMEOUT
    return request_timeout


def setup(config, state):
    CONFIG.update(config)
    STATE = {}

    if state:
        STATE.update(state)

    return CONFIG, STATE


def main_impl():
    args = utils.parse_args(
        ["redirect_uri",
         "client_id",
         "client_secret",
         "refresh_token",
         "start_date"])

    setup(args.config, args.state)

    if args.discover:
        do_discover()
    elif args.properties:
        do_sync(STATE, args.properties)
    else:
        LOGGER.info("No properties were selected")


def main():
    try:
        main_impl()
    except Exception as exc:
        LOGGER.critical(exc)
        raise exc


if __name__ == '__main__':
    main()
