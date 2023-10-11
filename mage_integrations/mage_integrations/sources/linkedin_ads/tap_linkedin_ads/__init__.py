#!/usr/bin/env python3

import argparse
import json
import sys

import singer
from singer import metadata, utils

from mage_integrations.sources.linkedin_ads.tap_linkedin_ads.client import (
    REQUEST_TIMEOUT,
    LinkedinClient,
)
from mage_integrations.sources.linkedin_ads.tap_linkedin_ads.discover import discover
from mage_integrations.sources.linkedin_ads.tap_linkedin_ads.sync import sync as _sync

LOGGER = singer.get_logger()
REQUEST_TIMEOUT = 300

REQUIRED_CONFIG_KEYS = [
    'access_token',
    'user_agent'
]


def do_discover(client, config, return_streams: bool = False):
    LOGGER.info('Starting discover')
    client.check_accounts(config)
    catalog = discover()
    catalog_dict = catalog.to_dict()

    LOGGER.info('Finished discover')

    if return_streams:
        return catalog_dict

    json.dump(catalog_dict, sys.stdout, indent=2)

@singer.utils.handle_top_exception(LOGGER)
def main():
    parsed_args = singer.utils.parse_args(REQUIRED_CONFIG_KEYS)
    config = parsed_args.config

    with LinkedinClient(parsed_args.config.get('client_id', None),
                        parsed_args.config.get('client_secret', None),
                        parsed_args.config.get('refresh_token', None),
                        parsed_args.config.get('access_token'),
                        REQUEST_TIMEOUT,
                        parsed_args.config['user_agent']
                        ) as client:

        state = {}
        if parsed_args.state:
            state = parsed_args.state
        if parsed_args.discover:
            do_discover(client, config)
        elif parsed_args.catalog:
            _sync(client=client,
                  config=config,
                  catalog=parsed_args.catalog,
                  state=state)


if __name__ == '__main__':
    main()
