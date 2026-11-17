#!/usr/bin/env python3
import json
import os

import requests
import singer
from requests import Session
from requests.adapters import HTTPAdapter
from singer import Schema, metadata
from singer import metrics as singer_metrics
from tap_zendesk import metrics as zendesk_metrics
from tap_zendesk.discover import discover_streams
from tap_zendesk.streams import STREAMS
from tap_zendesk.sync import sync_stream
from zenpy import Zenpy

from mage_integrations.sources.base import write_schema, write_state

LOGGER = singer.get_logger()

REQUIRED_CONFIG_KEYS = [
    "start_date",
    "subdomain",
]

# default authentication
OAUTH_CONFIG_KEYS = [
    "access_token",
]

# email + api_token authentication
API_TOKEN_CONFIG_KEYS = [
    "email",
    "api_token",
]

# patch Session.request to record HTTP request metrics
request = Session.request


def request_metrics_patch(self, method, url, **kwargs):
    with singer_metrics.http_request_timer(None):
        return request(self, method, url, **kwargs)


Session.request = request_metrics_patch
# end patch


def do_discover(client, logger=LOGGER):
    logger.info("Starting discover")
    catalog = {"streams": discover_streams(client)}
    return catalog


def stream_is_selected(mdata):
    return mdata.get((), {}).get('selected', False)


def get_selected_streams(catalog):
    selected_stream_names = []
    for stream in catalog.streams:
        mdata = metadata.to_map(stream.metadata)
        if stream_is_selected(mdata):
            selected_stream_names.append(stream.tap_stream_id)
    return selected_stream_names


SUB_STREAMS = {
    'tickets': ['ticket_audits', 'ticket_metrics', 'ticket_comments']
}

# only side loading objects that are returned as a child object and not a separate array
SIDELOAD_OBJECTS = {
    'tickets': ['metric_sets', 'dates', 'comment_count', 'slas']
}


def get_sub_stream_names():
    sub_stream_names = []
    for parent_stream in SUB_STREAMS:
        sub_stream_names.extend(SUB_STREAMS[parent_stream])
    return sub_stream_names


def get_abs_path(path):
    return os.path.join(os.path.dirname(os.path.realpath(__file__)), path)


def get_side_load_schemas(sideload_objects, stream):
    """Returns the updated schema after adding side load objects to schema dict"""
    stream_schema = stream.schema.to_dict()
    for sideload_object in sideload_objects:
        if stream.tap_stream_id in SIDELOAD_OBJECTS:
            if sideload_object in SIDELOAD_OBJECTS[stream.tap_stream_id]:
                schema_file = "schemas/sideload_schemas/{}.json".format(sideload_object)
                with open(get_abs_path(schema_file)) as f:
                    schema = json.load(f)
                    stream_schema['properties'][list(schema['properties'].keys())[0]] = list(
                        schema['properties'].values())[0]
    return stream_schema


class DependencyException(Exception):
    pass


def validate_dependencies(selected_stream_ids):
    errs = []
    msg_tmpl = ("Unable to extract {0} data. "
                "To receive {0} data, you also need to select {1}.")
    for parent_stream_name in SUB_STREAMS:
        sub_stream_names = SUB_STREAMS[parent_stream_name]
        for sub_stream_name in sub_stream_names:
            if sub_stream_name in selected_stream_ids and parent_stream_name not in selected_stream_ids:  # noqa
                errs.append(msg_tmpl.format(sub_stream_name, parent_stream_name))

    if errs:
        raise DependencyException(" ".join(errs))


def populate_class_schemas(catalog, selected_stream_names):
    for stream in catalog.streams:
        if stream.tap_stream_id in selected_stream_names:
            STREAMS[stream.tap_stream_id].stream = stream


def do_sync(client, catalog, state, config, logger=LOGGER):
    selected_stream_names = get_selected_streams(catalog)
    validate_dependencies(selected_stream_names)
    populate_class_schemas(catalog, selected_stream_names)
    all_sub_stream_names = get_sub_stream_names()

    for stream in catalog.streams:
        stream_name = stream.tap_stream_id
        mdata = metadata.to_map(stream.metadata)
        if stream_name not in selected_stream_names:
            continue

        key_properties = metadata.get(mdata, (), 'table-key-properties')
        sideload_objects = metadata.get(mdata, (), 'sideload-objects')
        if sideload_objects:
            stream_schema = get_side_load_schemas(sideload_objects, stream)
            stream.schema = Schema.from_dict(stream_schema)

        write_schema(stream_name, stream.schema.to_dict(), key_properties,
                     replication_method=stream.replication_method)

        sub_stream_names = SUB_STREAMS.get(stream_name)
        if sub_stream_names:
            for sub_stream_name in sub_stream_names:
                if sub_stream_name not in selected_stream_names:
                    continue
                sub_stream = STREAMS[sub_stream_name].stream
                sub_mdata = metadata.to_map(sub_stream.metadata)
                sub_key_properties = metadata.get(sub_mdata, (), 'table-key-properties')
                sideload_objects = metadata.get(mdata, (), 'sideload-objects')
                if sideload_objects:
                    sub_stream_schema = get_side_load_schemas(sideload_objects, sub_stream)
                    sub_stream.schema = Schema.from_dict(sub_stream_schema)
                    write_schema(sub_stream.tap_stream_id, sub_stream.schema.to_dict(),
                                 sub_key_properties, replication_method=stream.replication_method)

        # parent stream will sync sub stream
        if stream_name in all_sub_stream_names:
            continue

        logger.info(f"{stream_name}: Starting sync")
        instance = STREAMS[stream_name](client, config)
        counter_value = sync_stream(state, config.get('start_date'), instance)
        write_state(state)
        logger.info(f"{stream_name}: Completed sync ({counter_value} rows)")
        zendesk_metrics.log_aggregate_rates()

    write_state(state)
    logger.info("Finished sync")
    zendesk_metrics.log_aggregate_rates()


def oauth_auth(args, logger=LOGGER):
    if not set(OAUTH_CONFIG_KEYS).issubset(args.keys()):
        logger.debug("OAuth authentication unavailable.")
        return None

    logger.info("Using OAuth authentication.")
    return {
        "subdomain": args['subdomain'],
        "oauth_token": args['access_token'],
    }


def api_token_auth(args, logger=LOGGER):
    if not set(API_TOKEN_CONFIG_KEYS).issubset(args.keys()):
        logger.debug("API Token authentication unavailable.")
        return None

    logger.info("Using API Token authentication.")
    return {
        "subdomain": args['subdomain'],
        "email": args['email'],
        "token": args['api_token']
    }


def get_session(config):
    """ Add partner information to requests Session object if specified in the config. """
    if not all(k in config for k in ["marketplace_name",
                                     "marketplace_organization_id",
                                     "marketplace_app_id"]):
        return None
    session = requests.Session()
    # Using Zenpy's default adapter args, following the method outlined here:
    # https://github.com/facetoe/zenpy/blob/master/docs/zenpy.rst#usage
    session.mount("https://", HTTPAdapter(**Zenpy.http_adapter_kwargs()))
    session.headers["X-Zendesk-Marketplace-Name"] = config.get("marketplace_name", "")
    session.headers["X-Zendesk-Marketplace-Organization-Id"] = str(config.get(
                                                                "marketplace_organization_id", ""))
    session.headers["X-Zendesk-Marketplace-App-Id"] = str(config.get("marketplace_app_id", ""))
    return session


# @singer.utils.handle_top_exception(LOGGER)
# def main():
#     parsed_args = singer.utils.parse_args(REQUIRED_CONFIG_KEYS)
#     # OAuth has precedence
#     creds = oauth_auth(parsed_args) or api_token_auth(parsed_args)
#     session = get_session(parsed_args.config)
#     client = Zenpy(session=session, **creds)

#     if not client:
#         LOGGER.error("""No suitable authentication keys provided.""")

#     if parsed_args.discover:
#         do_discover(client)
#     elif parsed_args.catalog:
#         state = parsed_args.state
#         do_sync(client, parsed_args.catalog, state, parsed_args.config)
