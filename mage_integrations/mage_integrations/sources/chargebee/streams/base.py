import inspect
import json
import os
from datetime import datetime, timedelta

import pytz
import singer
from dateutil.parser import parse

from mage_integrations.sources.chargebee.state import (
    get_last_record_value_for_table,
    incorporate,
)
from mage_integrations.sources.chargebee.streams.util import Util
from mage_integrations.sources.constants import REPLICATION_METHOD_INCREMENTAL
from mage_integrations.sources.messages import write_schema

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


class BaseChargebeeStream():
    # GLOBAL PROPERTIES
    TABLE = None
    KEY_PROPERTIES = []
    API_METHOD = 'GET'
    REQUIRES = []

    def __init__(self, config, state, catalog, client, logger=None):
        self.config = config
        self.state = state
        self.catalog = catalog
        self.client = client
        self.substreams = []
        self.logger = logger or LOGGER

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

    def append_custom_fields(self, record):
        list_of_custom_field_obj = ['addon', 'plan', 'subscription', 'customer']
        custom_fields = {}
        event_custom_fields = {}
        if self.ENTITY == 'event':
            content = record['content']
            words = record['event_type'].split("_")
            sl = slice(len(words) - 1)
            content_obj = "_".join(words[sl])

            if content_obj in list_of_custom_field_obj:
                for k in content[content_obj].keys():
                    if "cf_" in k:
                        event_custom_fields[k] = content[content_obj][k]
                content[content_obj]['custom_fields'] = json.dumps(event_custom_fields)

        for key in record.keys():
            if "cf_" in key:
                custom_fields[key] = record[key]
        if custom_fields:
            record['custom_fields'] = json.dumps(custom_fields)
        return record

    # This overrides the transform_record method in the Fistown Analytics tap-framework package
    def transform_record(self, record):
        with singer.Transformer(integer_datetime_fmt="unix-seconds-integer-datetime-parsing") as tx:
            metadata = {}

            record = self.append_custom_fields(record)

            if self.catalog.metadata is not None:
                metadata = singer.metadata.to_map(self.catalog.metadata)

            return tx.transform(
                record,
                self.catalog.schema.to_dict(),
                metadata)

    def get_stream_data(self, data):
        entity = self.ENTITY
        return [self.transform_record(item.get(entity)) for item in data]

    def load_data(self, logger=None):
        table = self.TABLE
        api_method = self.API_METHOD
        done = False
        sync_interval_in_mins = 2

        # Attempt to get the bookmark date from the state file (if one exists and is supplied).
        self.logger.info(
            f'Attempting to get the most recent bookmark_date for entity {self.ENTITY}.')
        bookmark_date = get_last_record_value_for_table(self.state, table, self.REPLICATION_KEY)

        # If there is no bookmark date, fall back to using the start date from the config file.
        if bookmark_date is None:
            self.logger.info(
                'Could not locate bookmark_date from STATE file. Falling back to start_date '
                'from config.json instead.')
            bookmark_date = parse(self.config.get('start_date'))
        else:
            bookmark_date = parse(bookmark_date)

        # Convert bookmarked start date to POSIX.
        bookmark_date_posix = int(bookmark_date.timestamp())
        to_date = datetime.now(pytz.utc) - timedelta(minutes=sync_interval_in_mins)
        to_date_posix = int(to_date.timestamp())
        sync_window = str([bookmark_date_posix, to_date_posix])
        self.logger.info("Sync Window {} for schema {}".format(sync_window, table))

        # Create params for filtering
        if self.ENTITY == 'event':
            params = {"occurred_at[between]": sync_window}
            # bookmark_key = 'occurred_at'
        elif self.ENTITY in ['promotional_credit', 'comment']:
            params = {"created_at[between]": sync_window}
            # bookmark_key = 'created_at'
        else:
            params = {"updated_at[between]": sync_window}
            # bookmark_key = 'updated_at'

        # Add sort_by[asc] to prevent data overwrite by oldest deleted records
        if self.SORT_BY is not None:
            params['sort_by[asc]'] = self.SORT_BY

        self.logger.info("Querying {} starting at {}".format(table, bookmark_date))

        while not done:
            max_date = to_date

            response = self.client.make_request(
                url=self.get_url(),
                method=api_method,
                params=params)

            if 'api_error_code' in response.keys():
                if response['api_error_code'] == 'configuration_incompatible':
                    self.logger.error('{} is not configured'.format(response['error_code']))
                    break

            records = response.get('list')

            # List of deleted "plans, addons and coupons" from the /events endpoint
            deleted_records = []

            if self.config.get('include_deleted') not in ['false', 'False', False]:
                if self.ENTITY == 'event':
                    # Parse "event_type" from events records and collect deleted plan/addon/coupon
                    # from events
                    for record in records:
                        event = record.get(self.ENTITY)
                        if event["event_type"] == 'plan_deleted':
                            Util.plans.append(event['content']['plan'])
                        elif event['event_type'] == 'addon_deleted':
                            Util.addons.append(event['content']['addon'])
                        elif event['event_type'] == 'coupon_deleted':
                            Util.coupons.append(event['content']['coupon'])
                # We need additional transform for deleted records as "to_write" already contains
                # transformed data
                if self.ENTITY == 'plan':
                    for plan in Util.plans:
                        deleted_records.append(self.transform_record(plan))
                if self.ENTITY == 'addon':
                    for addon in Util.addons:
                        deleted_records.append(self.transform_record(addon))
                if self.ENTITY == 'coupon':
                    for coupon in Util.coupons:
                        deleted_records.append(self.transform_record(coupon))

            # Get records from API response and transform
            to_write = self.get_stream_data(records)

            with singer.metrics.record_counter(endpoint=table) as ctr:
                # Combine transformed records and deleted data of  "plan, addon and coupon"
                # collected from events endpoint
                to_write = to_write + deleted_records
                yield to_write

                ctr.increment(amount=len(to_write))

            # update max_date with minimum of (max_replication_key) or (now - 2 minutes)
            # this will make sure that bookmark does not go beyond (now - 2 minutes)
            # so, no data will be missed due to API latency
            max_date = min(max_date, to_date)
            self.state = incorporate(
                self.state, table, self.REPLICATION_KEY, max_date)

            if not response.get('next_offset'):
                self.logger.info("Final offset reached. Ending sync.")
                done = True
            else:
                self.logger.info("Advancing by one offset.")
                params['offset'] = response.get('next_offset')
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
