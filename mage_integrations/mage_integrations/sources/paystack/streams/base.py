from datetime import datetime, timedelta
from dateutil.parser import parse
from mage_integrations.sources.constants import REPLICATION_METHOD_INCREMENTAL
from mage_integrations.sources.messages import write_schema
from mage_integrations.sources.paystack.client import PaystackClient
from mage_integrations.sources.state_utils import (
    get_last_record_value_for_table,
    incorporate
)
import inspect
import os
import pytz
import singer


LOGGER = singer.get_logger()

def is_selected(stream_catalog):
    metadata = singer.metadata.to_map(stream_catalog.metadata)
    stream_metadata = metadata.get((), {})

    inclusion = stream_metadata.get('inclusion')

    if stream_metadata.get('selected') is not None:
        selected = stream_metadata.get('selected')
    else:
        selected = stream_metadata.get('selected-by-default')

    if inclusion == 'unsupported':
        return False

    elif selected is not None:
        return selected

    return inclusion == 'automatic'


class BasePaystackStream():
    # GLOBAL PROPERTIES
    TABLE = None
    KEY_PROPERTIES = []
    API_METHOD = 'GET'
    REQUIRES = []

    def __init__(self, config, state, catalog, client: PaystackClient):
        self.config = config
        self.state = state
        self.catalog = catalog
        self.client = client
        self.substreams = []

    def write_schema(self):
        bookmark_properties = []
        if REPLICATION_METHOD_INCREMENTAL == self.catalog.replication_method:
            bookmark_properties = self.BOOKMARK_PROPERTIES
        write_schema(
            self.catalog.stream,
            self.catalog.schema.to_dict(),
            key_properties=self.catalog.key_properties or [],
            bookmark_properties=bookmark_properties,
            replication_method=self.catalog.replication_method,
            unique_conflict_method=self.catalog.unique_conflict_method,
            unique_constraints=self.catalog.unique_constraints,
        )

    def get_url(self):
        """
        Return the URL to hit for data from this stream.
        """
        raise RuntimeError("get_url not implemented!")

    def get_abs_path(self, path):
        return os.path.join(os.path.dirname(os.path.realpath(__file__)), path)

    # This overrides the transform_record method in the Fistown Analytics tap-framework package
    def transform_record(self, record):
        with singer.Transformer(integer_datetime_fmt="unix-seconds-integer-datetime-parsing") as tx:
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

    def load_data(self):
        table = self.TABLE
        api_method = self.API_METHOD
        done = False
        sync_interval_in_mins = 2

        # Attempt to get the bookmark date from the state file (if one exists and is supplied).
        LOGGER.info('Attempting to get the most recent bookmark_date for entity {}.'.format(self.ENTITY))
        bookmark_date = get_last_record_value_for_table(self.state, table, 'bookmark_date')

        # If there is no bookmark date, fall back to using the start date from the config file.
        if bookmark_date is None:
            LOGGER.info('Could not locate bookmark_date from STATE file. Falling back to start_date from config.json instead.')
            bookmark_date = parse(self.config.get('start_date'))
        else:
            bookmark_date = parse(bookmark_date)

        # Convert bookmarked start date to POSIX.
        bookmark_date_iso = bookmark_date.strftime('%Y-%m-%dT%H:%M:%SZ')
        to_date = datetime.now(pytz.utc) - timedelta(minutes=sync_interval_in_mins)
        to_date_iso = to_date.strftime('%Y-%m-%dT%H:%M:%SZ')
        sync_window = str([bookmark_date_iso, to_date_iso])
        LOGGER.info("Sync Window {} for schema {}".format(sync_window, table))

        params = {'from': bookmark_date_iso, 'to': to_date_iso}

        LOGGER.info("Querying {} starting at {}".format(table, bookmark_date))

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
                    LOGGER.error('{} is not configured'.format(response['error_code']))
                    break

            records = response.get('data')

            # Get records from API response and transform
            to_write = self.get_stream_data(records)

            with singer.metrics.record_counter(endpoint=table) as ctr:
                yield to_write

                ctr.increment(amount=len(to_write))

            # update max_date with minimum of (max_replication_key) or (now - 2 minutes)
            # this will make sure that bookmark does not go beyond (now - 2 minutes)
            # so, no data will be missed due to API latency
            max_date = min(max_date, to_date)
            self.state = incorporate(
                self.state, table, 'bookmark_date', max_date)

            if meta.get('page') == meta.get('pageCount'):
                LOGGER.info("Final page reached. Ending sync.")
                done = True
            else:
                LOGGER.info("Advancing by one page.")
                params['page'] = meta.get('page') + 1
                bookmark_date = max_date

    def get_class_path(self):
        return os.path.dirname(inspect.getfile(self.__class__))

    def load_schema_by_name(self, name):
        return singer.utils.load_json(
            os.path.normpath(
                os.path.join(
                    self.get_class_path(),
                    '../schemas/{}.json'.format(name))))

    def get_schema(self):
        return self.load_schema_by_name(self.SCHEMA)
