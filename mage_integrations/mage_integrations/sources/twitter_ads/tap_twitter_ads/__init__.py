import json
import sys
from typing import List

import singer
from twitter_ads.client import Client

from mage_integrations.sources.twitter_ads.tap_twitter_ads.discover import discover
from mage_integrations.sources.twitter_ads.tap_twitter_ads.sync import sync as _sync

LOGGER = singer.get_logger()
REQUEST_TIMEOUT = 300   # 5 minutes default timeout

REQUIRED_CONFIG_KEYS = [
    'start_date',
    'consumer_key',
    'consumer_secret',
    'access_token',
    'access_token_secret',
    'account_ids'
]


def build_client(config):
    return Client(
        consumer_key=config.get('consumer_key'),
        consumer_secret=config.get('consumer_secret'),
        access_token=config.get('access_token'),
        access_token_secret=config.get('access_token_secret'),
        options={
            'handle_rate_limit': True,  # Handles 429 errors
            'retry_max': 10,
            'retry_delay': 60000,   # milliseconds, wait 1 minute for each retry
            # Error codes: https://developer.twitter.com/en/docs/basics/response-codes
            'retry_on_status': [400, 420, 500, 502, 503, 504],
            'retry_on_timeouts': True,
            'timeout': config.get('request_timeout', REQUEST_TIMEOUT),
        },
    )


def check_credentials(client, twitter_ads_client, account_ids):
    """
        Checking credentials for the discover mode
    """
    # check whether tokens are valid or not
    twitter_ads_client.get_resource('accounts', client, 'accounts')
    invalid_account_ids = []
    # check whether account ids are valid or not
    for account_id in account_ids.replace(' ', '').split(','):
        try:
            client.accounts(account_id)
        except Exception:
            invalid_account_ids.append(account_id)

    if invalid_account_ids:
        error_message = 'Invalid Twitter Ads accounts provided during the configuration:{}'.format(
            invalid_account_ids)
        raise Exception(error_message) from None


def do_discover(
    reports,
    client,
    account_ids,
    logger=LOGGER,
    return_streams: bool = False,
    selected_streams: List = None,
):
    if selected_streams is None:
        selected_streams = []
    logger.info('Starting discover')
    # check_credentials(client, TwitterAds(), account_ids)    # validating credentials
    catalog = discover(reports)
    catalog_dict = catalog.to_dict()
    logger.info('Finished discover')

    if return_streams:
        return catalog_dict
    json.dump(catalog_dict, sys.stdout, indent=2)


@singer.utils.handle_top_exception(LOGGER)
def main():

    parsed_args = singer.utils.parse_args(REQUIRED_CONFIG_KEYS)

    config = parsed_args.config
    request_timeout = config.get('request_timeout')
    # if request_timeout is other than 0, "0" or "" then use request_timeout
    if request_timeout and float(request_timeout):
        request_timeout = float(request_timeout)
    else:
        # If value is 0, "0" or "" then set the default which is 300 seconds.
        request_timeout = REQUEST_TIMEOUT

    # Twitter Ads SDK Reference: https://github.com/twitterdev/twitter-python-ads-sdk
    # Client reference:
    # https://github.com/twitterdev/twitter-python-ads-sdk#rate-limit-handling-and-request-options
    client = Client(
        consumer_key=config.get('consumer_key'),
        consumer_secret=config.get('consumer_secret'),
        access_token=config.get('access_token'),
        access_token_secret=config.get('access_token_secret'),
        options={
            'handle_rate_limit': True,  # Handles 429 errors
            'retry_max': 10,
            'retry_delay': 60000,   # milliseconds, wait 1 minute for each retry
            # Error codes: https://developer.twitter.com/en/docs/basics/response-codes
            'retry_on_status': [400, 420, 500, 502, 503, 504],
            'retry_on_timeouts': True,
            'timeout': request_timeout})    # connect and read timeout in seconds
    state = {}
    if parsed_args.state:
        state = parsed_args.state

    catalog = parsed_args.catalog

    reports = config.get('reports', {})

    if parsed_args.discover:
        do_discover(reports, client, config.get("account_ids"))
    elif parsed_args.catalog:
        _sync(
            client=client,
            config=config,
            catalog=catalog,
            state=state)


if __name__ == '__main__':
    main()
