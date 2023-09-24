import json
import sys

import singer

from mage_integrations.sources.github.tap_github.client import GithubClient
from mage_integrations.sources.github.tap_github.discover import discover as _discover
from mage_integrations.sources.github.tap_github.sync import sync as _sync

LOGGER = singer.get_logger()

REQUIRED_CONFIG_KEYS = ["start_date", "access_token", "repository"]


def do_discover(client):
    """
    Call the discovery function.
    """
    catalog = _discover(client)
    # Dump catalog
    json.dump(catalog, sys.stdout, indent=2)


@singer.utils.handle_top_exception(LOGGER)
def main():
    """
    Run discover mode or sync mode.
    """
    args = singer.utils.parse_args(REQUIRED_CONFIG_KEYS)

    config = args.config

    client = GithubClient(config)

    state = {}
    if args.state:
        state = args.state

    if args.discover:
        do_discover(client)
    else:
        catalog = args.properties if args.properties else _discover(client)
        _sync(client, config, state, catalog)


if __name__ == "__main__":
    main()
