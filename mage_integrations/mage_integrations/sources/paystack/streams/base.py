from datetime import datetime, timedelta
from dateutil.parser import parse
from mage_integrations.sources.paystack.client import PaystackClient
from typing import Dict, List
import os
import pytz
import singer


class BasePaystackStream():
    # GLOBAL PROPERTIES
    TABLE = None
    KEY_PROPERTIES = []
    API_METHOD = 'GET'
    REQUIRES = []

    def __init__(self, config, state, catalog, client: PaystackClient, logger):
        self.config = config
        self.state = state
        self.catalog = catalog
        self.client = client
        self.logger = logger

    def get_url(self):
        """
        Return the URL to hit for data from this stream.
        """
        raise RuntimeError('get_url not implemented!')

    def get_abs_path(self, path):
        return os.path.join(os.path.dirname(os.path.realpath(__file__)), path)

    # This overrides the transform_record method in the Fistown Analytics tap-framework package
    def transform_record(self, record):
        with singer.Transformer(integer_datetime_fmt='unix-seconds-integer-datetime-parsing') as tx:
            metadata = {}

            if self.catalog.metadata is not None:
                metadata = singer.metadata.to_map(self.catalog.metadata)

            return tx.transform(
                record,
                self.catalog.schema.to_dict(),
                metadata
            )

    def get_stream_data(self, data):
        return [self.transform_record(item) for item in data]

    def load_data(
        self,
        bookmarks: Dict = None,
        bookmark_properties: List = None,
        to_date: str = None
    ):
        table = self.TABLE
        api_method = self.API_METHOD
        done = False
        sync_interval_in_mins = 2
        bookmark_date = None

        # Attempt to get the bookmark date from the state file (if one exists and is supplied).
        self.logger.info(
            f'Attempting to get the most recent bookmark_date for entity {self.ENTITY}.')
        if bookmarks and bookmark_properties:
            bookmark_date = bookmarks.get(bookmark_properties[0])

        # If there is no bookmark date, fall back to using the start date from the config file.
        if bookmark_date is None:
            self.logger.info(
                'Could not locate bookmark_date from STATE file. '
                'Falling back to start_date from config.json instead.'
            )
            if 'start_date' in self.config:
                bookmark_datetime = parse(self.config.get('start_date'))
            else:
                bookmark_datetime = datetime.now(pytz.utc) - timedelta(weeks=4)
            bookmark_date = bookmark_datetime.strftime('%Y-%m-%dT%H:%M:%SZ')

        if to_date is None:
            to_datetime = datetime.now(pytz.utc) - timedelta(minutes=sync_interval_in_mins)
            to_date = to_datetime.strftime('%Y-%m-%dT%H:%M:%SZ')
        sync_window = str([bookmark_date, to_date])
        self.logger.info(f'Sync Window {sync_window} for schema {table}')

        params = {'from': bookmark_date, 'to': to_date}

        self.logger.info(f'Querying {table} starting at {bookmark_date}')

        while not done:
            max_date = to_date

            response = self.client.make_request(
                url=self.get_url(),
                method=api_method,
                params=params
            )

            meta = response.get('meta', dict())

            if 'api_error_code' in response.keys():
                if response['api_error_code'] == 'configuration_incompatible':
                    self.logger.error('{} is not configured'.format(response['error_code']))
                    break

            records = response.get('data')

            # Get records from API response and transform
            to_write = self.get_stream_data(records)

            with singer.metrics.record_counter(endpoint=table) as ctr:
                yield to_write

                ctr.increment(amount=len(to_write))

            if meta.get('page') >= meta.get('pageCount'):
                self.logger.info('Final page reached. Ending sync.')
                done = True
            else:
                self.logger.info('Advancing by one page.')
                params['page'] = meta.get('page') + 1
                bookmark_date = max_date
