"""
This module defines the stream classes and their individual sync logic.
"""


import datetime
from typing import Iterator

import singer
from singer import Transformer, metrics, UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING
from singer.transform import transform, unix_milliseconds_to_datetime

from mage_integrations.sources.mode.client import (
    ModeClient,
    ModeError,
)
from mage_integrations.sources.mode.transform import (
    transform_json,
    transform_times,
    find_datetimes_in_schema,
    test_transform_spaces
)

LOGGER = singer.get_logger()

MAX_PAGE_SIZE = 150


class BaseStream:
    """
    A base class representing singer streams.

    :param client: The API client used to extract records from external source
    """
    tap_stream_id = None
    replication_method = None
    replication_key = None
    key_properties = []
    valid_replication_keys = []
    to_replicate = True
    path = None
    params = {}
    parent = None
    default_data_key = "_embedded" # This is unique for Mode since the data comes under "_embedded" in the response
    data_key = None
    

    def __init__(self, client: ModeClient, logger=LOGGER):
        self.client = client
        self.logger = logger

    def get_records(self, bookmark_datetime: datetime = None, is_parent: bool = False) -> list:
        """
        Returns a list of records for that stream.

        :param bookmark_datetime: The datetime object representing the
            bookmark date
        :param is_parent: If true, may change the type of data
            that is returned for a child stream to consume
        :return: list of records
        """
        raise NotImplementedError("Child classes of BaseStream require "
                                  "`get_records` implementation")

    def get_parent_data(self, bookmark_datetime: datetime = None) -> list:
        """
        Returns a list of records from the parent stream.

        :param bookmark_datetime: The datetime object representing the
            bookmark date
        :return: A list of records
        """
        # pylint: disable=not-callable
        parent = self.parent(self.client)
        return parent.get_records(bookmark_datetime, is_parent=True)

    @staticmethod
    def epoch_milliseconds_to_dt_str(timestamp: float) -> str:
        # Convert epoch milliseconds to datetime object in UTC format
        new_dttm = unix_milliseconds_to_datetime(timestamp)
        return new_dttm

    @staticmethod
    def dt_to_epoch_seconds(dt_object: datetime) -> float:
        if dt_object is None:
            return 0
        return datetime.datetime.timestamp(dt_object)


# pylint: disable=abstract-method
class IncrementalStream(BaseStream):
    """
    A child class of a base stream used to represent streams that use the
    INCREMENTAL replication method.

    :param client: The API client used extract records from the external source
    """
    replication_method = 'INCREMENTAL'

    # Disabled `unused-argument` as it causing pylint error.
    # Method which call this `sync` method is passing unused argument.So, removing argument would not work.
    # pylint: disable=too-many-arguments,unused-argument
    def sync(self,
             state: dict,
             stream_schema: dict,
             stream_metadata: dict,
             config: dict,
             transformer: Transformer) -> dict:
        """
        The sync logic for an incremental stream.

        :param state: A dictionary representing singer state
        :param stream_schema: A dictionary containing the stream schema
        :param stream_metadata: A dictionnary containing stream metadata
        :param config: A dictionary containing tap config data
        :return: State data in the form of a dictionary
        """
        start_date = singer.get_bookmark(state,
                                         self.tap_stream_id,
                                         self.replication_key,
                                         config['start_date'])

        self.logger.info(f'Stream: {self.tap_stream_id}, initial max_bookmark_value: {start_date}')
        bookmark_datetime = singer.utils.strptime_to_utc(start_date)
        max_datetime = bookmark_datetime

        schema_datetimes = find_datetimes_in_schema(stream_schema)

        with metrics.record_counter(self.tap_stream_id) as counter:
            for record in self.get_records(bookmark_datetime):
                transform_times(record, schema_datetimes)

                record_datetime = singer.utils.strptime_to_utc(
                    self.epoch_milliseconds_to_dt_str(
                        record[self.replication_key])
                )

                if record_datetime >= bookmark_datetime:
                    transformed_record = transform(record,
                                                   stream_schema,
                                                   integer_datetime_fmt=UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING,
                                                   metadata=stream_metadata)
                    # Write records with time_extracted field
                    singer.write_record(self.tap_stream_id, transformed_record, time_extracted=singer.utils.now())
                    counter.increment()
                    max_datetime = max(record_datetime, max_datetime)
            bookmark_date = singer.utils.strftime(max_datetime)
            self.logger.info(f'FINISHED Syncing: {self.tap_stream_id}, total_records: {counter.value}.')

        self.logger.info(f'Stream: {self.tap_stream_id}, writing final bookmark')
        state = singer.write_bookmark(state,
                                      self.tap_stream_id,
                                      self.replication_key,
                                      bookmark_date)
        return state


# pylint: disable=abstract-method
class FullTableStream(BaseStream):
    """
    A child class of a base stream used to represent streams that use the
    FULL_TABLE replication method.

    :param client: The API client used extract records from the external source
    """
    replication_method = 'FULL_TABLE'

    # Disabled `unused-argument` as it causing pylint error.
    # Method which call this `sync` method is passing unused argument. So, removing argument would not work.
    # pylint: disable=too-many-arguments,unused-argument
    def sync(self,
             state: dict,
             stream_schema: dict,
             stream_metadata: dict,
             config: dict,
             transformer: Transformer) -> dict:
        """
        The sync logic for an full table stream.

        :param state: A dictionary representing singer state
        :param stream_schema: A dictionary containing the stream schema
        :param stream_metadata: A dictionnary containing stream metadata
        :param config: A dictionary containing tap config data
        :return: State data in the form of a dictionary
        """

        schema_datetimes = find_datetimes_in_schema(stream_schema)
        records = self.get_records()
        self.logger.info(f"Starting syncing from inside FullTableStream, the records: {records}")

        with metrics.record_counter(self.tap_stream_id) as counter:
            for record in records:
                transform_times(record, schema_datetimes)

                transformed_record = transform(
                    record,
                    stream_schema,
                    integer_datetime_fmt=UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING,
                    metadata=stream_metadata,
                )
                # Write records with time_extracted field
                singer.write_record(
                    self.tap_stream_id,
                    transformed_record,
                    time_extracted=singer.utils.now(),
                )
                counter.increment()

            self.logger.info(
                f'FINISHED Syncing: {self.tap_stream_id}, total_records: {counter.value}.')

        return state


class SpaceList(FullTableStream):
    """
    This stream is not replicated and only used by the Spaces stream.

    """
    tap_stream_id = 'space_list'
    key_properties = ['id']
    to_replicate = False
    path = 'spaces'
    data_key = 'spaces'

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        response = self.client.get(self.path)

        if not response.get(self.default_data_key).get(self.data_key):
            self.logger.critical(f'Response is empty for {self.tap_stream_id} stream')
            raise ModeError

        # Only yield records when called by child streams
        if is_parent:
            for record in response.get(self.default_data_key).get(self.data_key):
                yield record.get('token')


class Spaces(FullTableStream):
    """
    Retrieves spaces for a workspace

    """
    tap_stream_id = 'spaces'
    key_properties = ['id']
    path = 'spaces/{}'
    parent = SpaceList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        self.logger.info("Syncing: {}".format(self.tap_stream_id))
        spaces = []

        for space_token in self.get_parent_data():
            call_path = self.path.format(space_token)
            results = self.client.get(call_path)

            spaces.append(results)

        yield from spaces

class ReportList(FullTableStream):
    tap_stream_id = 'report_list'
    key_properties = ['id']
    to_replicate = False
    path = 'spaces/{}/reports'
    data_key = 'reports'
    parent = SpaceList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        # response = self.client.get(self.path)
        counter = 0

        for space_token in self.get_parent_data():
            call_path = self.path.format(space_token)
            response = self.client.get(call_path)

            reports_in_response = response.get(self.default_data_key).get(self.data_key)

            # Only yield records when called by child streams
            if is_parent and reports_in_response != []:
                counter += 1
                for record in reports_in_response:
                    yield record.get('token')

        if counter == 0:
            self.logger.error(f'Response is empty for {self.tap_stream_id} stream')
            raise ModeError

class Reports(FullTableStream):
    tap_stream_id = 'reports'
    key_properties = ['id']
    path = 'reports/{}'
    parent = ReportList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        self.logger.info("Syncing: {}".format(self.tap_stream_id))
        reports = []

        for report_token in self.get_parent_data():
            call_path = self.path.format(report_token)
            results = self.client.get(call_path)

            reports.append(results)

        yield from reports


STREAMS = {
    'space_list': SpaceList,
    'spaces': Spaces,
    'report_list': ReportList,
    'reports': Reports
}
