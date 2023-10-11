#!/usr/bin/env python3
import logging

import singer
from singer import utils

from mage_integrations.sources.google_ads.tap_google_ads.discover import (
    create_resource_schema,
    do_discover,
)
from mage_integrations.sources.google_ads.tap_google_ads.sync import do_sync

LOGGER = singer.get_logger()


REQUIRED_CONFIG_KEYS = [
    "start_date",
    "oauth_client_id",
    "oauth_client_secret",
    "refresh_token",
    "customer_ids",
    "developer_token",
]


def main_impl():
    args = utils.parse_args(REQUIRED_CONFIG_KEYS)
    resource_schema = create_resource_schema(args.config)
    state = {}

    if args.state:
        state.update(args.state)
    if args.discover:
        do_discover(resource_schema)
        LOGGER.info("Discovery complete")
    elif args.catalog:
        do_sync(args.config, args.catalog.to_dict(), resource_schema, state)
        LOGGER.info("Sync Completed")
    else:
        LOGGER.info("No properties were selected")


def main():

    google_logger = logging.getLogger("google")
    google_logger.setLevel(level=logging.CRITICAL)

    try:
        main_impl()
    except Exception as e:
        for line in str(e).splitlines():
            LOGGER.critical(line)
        raise e


if __name__ == "__main__":
    main()
