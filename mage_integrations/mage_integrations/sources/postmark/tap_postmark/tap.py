"""Postmark tap."""
# -*- coding: utf-8 -*-
import logging
from argparse import Namespace

import pkg_resources
from singer import get_logger, utils
from singer.catalog import Catalog

from mage_integrations.sources.postmark.tap_postmark.discover import discover
from mage_integrations.sources.postmark.tap_postmark.postmark import Postmark
from mage_integrations.sources.postmark.tap_postmark.sync import sync

# VERSION: str = pkg_resources.get_distribution('tap-postmark').version
LOGGER: logging.RootLogger = get_logger()
REQUIRED_CONFIG_KEYS: tuple = (
    'postmark_server_token',
    'start_date',
)


@utils.handle_top_exception(LOGGER)
def main() -> None:
    """Run tap."""
    # Parse command line arguments
    args: Namespace = utils.parse_args(REQUIRED_CONFIG_KEYS)

    # LOGGER.info(f'>>> Running tap-postmark v{VERSION}')

    # If discover flag was passed, run discovery mode and dump output to stdout
    if args.discover:
        catalog: Catalog = discover()
        catalog.dump()
        return

    # Otherwise run in sync mode
    if args.catalog:
        # Load command line catalog
        catalog = args.catalog
    else:
        # Loadt the  catalog
        catalog = discover()

    # Initialize postmark client
    postmark: Postmark = Postmark(
        args.config['postmark_server_token'],
    )

    sync(postmark, args.state, catalog, args.config['start_date'])


if __name__ == '__main__':
    main()
