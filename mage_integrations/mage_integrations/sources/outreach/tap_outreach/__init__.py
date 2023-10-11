#!/usr/bin/env python3

import argparse
import json
import sys

import singer
from singer import metadata
from singer.catalog import write_catalog

from mage_integrations.sources.outreach.tap_outreach.client import OutreachClient
from mage_integrations.sources.outreach.tap_outreach.discover import discover
from mage_integrations.sources.outreach.tap_outreach.sync import sync

LOGGER = singer.get_logger()

REQUIRED_CONFIG_KEYS = [
    'start_date',
    'client_id',
    'client_secret',
    'redirect_uri',
    'refresh_token'
]


def check_auth(client):
    LOGGER.info('Testing authentication')
    try:
        client.get(
            path='stages',
            endpoint='stages')
    except:
        raise Exception('Error testing Outreach authentication')


@singer.utils.handle_top_exception(LOGGER)
def main():
    parsed_args = singer.utils.parse_args(REQUIRED_CONFIG_KEYS)
    catalog = parsed_args.catalog if parsed_args.catalog else discover()

    if parsed_args.discover:
        write_catalog(catalog)
    else:
        with OutreachClient(parsed_args.config) as client:
            check_auth(client)
            sync(client,
                parsed_args.config,
                catalog,
                parsed_args.state,
                parsed_args.config['start_date'])
