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


# pylint: disable=abstract-method
class FullTableStream(BaseStream):
    """
    A child class of a base stream used to represent streams that use the
    FULL_TABLE replication method.

    :param client: The API client used extract records from the external source
    """
    replication_method = 'FULL_TABLE'


class SpaceList(FullTableStream):
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

class QueryList(FullTableStream):
    tap_stream_id = 'query_list'
    key_properties = ['id']
    to_replicate = False
    path = 'reports/{}/queries'
    data_key = 'queries'
    parent = ReportList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        counter = 0

        for report_token in self.get_parent_data():
            call_path = self.path.format(report_token)
            response = self.client.get(call_path)

            queries_in_response = response.get(self.default_data_key).get(self.data_key)

            # Only yield records when called by child streams
            if is_parent and queries_in_response != []:
                counter += 1
                for record in queries_in_response:
                    yield {
                        'query_token': record.get('token'),
                        'report_token': report_token
                    }

        if counter == 0:
            self.logger.error(f'Response is empty for {self.tap_stream_id} stream')
            raise ModeError

class Queries(FullTableStream):
    tap_stream_id = 'queries'
    key_properties = ['id']
    path = 'reports/{}/queries/{}'
    parent = QueryList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        self.logger.info("Syncing: {}".format(self.tap_stream_id))
        queries = []

        for tokens in self.get_parent_data():
            query_token = tokens.get("query_token")
            report_token = tokens.get("report_token")

            call_path = self.path.format(report_token, query_token)
            results = self.client.get(call_path)

            queries.append(results)

        yield from queries

class ChartList(FullTableStream):
    tap_stream_id = 'chart_list'
    key_properties = ['id']
    to_replicate = False
    path = 'reports/{}/queries/{}/charts'
    data_key = 'charts'
    parent = QueryList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        counter = 0

        for tokens in self.get_parent_data():
            report_token = tokens.get("report_token")
            query_token = tokens.get("query_token")

            call_path = self.path.format(report_token, query_token)
            response = self.client.get(call_path)

            charts_in_response = response.get(self.default_data_key).get(self.data_key)

            # Only yield records when called by child streams
            if is_parent and charts_in_response != []:
                counter += 1
                for record in charts_in_response:
                    yield {
                        'chart_token': record.get('token'),
                        'report_token': report_token,
                        'query_token': query_token
                    }

        if counter == 0:
            self.logger.error(f'Response is empty for {self.tap_stream_id} stream')
            raise ModeError

class Charts(FullTableStream):
    tap_stream_id = 'charts'
    key_properties = ['id']
    path = 'reports/{}/queries/{}/charts/{}'
    parent = ChartList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        self.logger.info("Syncing: {}".format(self.tap_stream_id))
        charts = []

        for tokens in self.get_parent_data():
            query_token = tokens.get("query_token")
            report_token = tokens.get("report_token")
            chart_token = tokens.get("chart_token")

            call_path = self.path.format(report_token, query_token, chart_token)
            results = self.client.get(call_path)

            charts.append(results)

        yield from charts


STREAMS = {
    'space_list': SpaceList,
    'spaces': Spaces,
    'report_list': ReportList,
    'reports': Reports,
    'query_list': QueryList,
    'queries': Queries,
    'chart_list': ChartList,
    'charts': Charts
}
