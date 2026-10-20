"""
This module defines the stream classes and their individual sync logic.
"""

import datetime
from typing import Iterator

import singer
from singer.transform import unix_milliseconds_to_datetime

from mage_integrations.sources.tableau.client import TableauClient, TableauError

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
    data_key = None
    sub_data_key = None

    def __init__(self, client: TableauClient, logger=LOGGER):
        self.client = client
        self.logger = logger

    def get_records(
        self, bookmark_datetime: datetime = None, is_parent: bool = False
    ) -> list:
        """
        Returns a list of records for that stream.

        :param bookmark_datetime: The datetime object representing the
            bookmark date
        :param is_parent: If true, may change the type of data
            that is returned for a child stream to consume
        :return: list of records
        """
        raise NotImplementedError(
            "Child classes of BaseStream require " "`get_records` implementation"
        )

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

    replication_method = "INCREMENTAL"


# pylint: disable=abstract-method
class FullTableStream(BaseStream):
    """
    A child class of a base stream used to represent streams that use the
    FULL_TABLE replication method.

    :param client: The API client used extract records from the external source
    """

    replication_method = "FULL_TABLE"


class WorkbookList(FullTableStream):
    tap_stream_id = "workbook_list"
    key_properties = ["id"]
    to_replicate = False
    path = "workbooks"
    data_key = "workbooks"
    sub_data_key = "workbook"

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        response = self.client.get(self.path)

        if response.get(self.data_key).get(self.sub_data_key) is None:
            self.logger.critical(f"Response is empty for {self.tap_stream_id} stream")
            raise TableauError

        # Only yield records when called by child streams
        if is_parent:
            for record in response.get(self.data_key).get(self.sub_data_key):
                yield record.get("id")


class Workbooks(FullTableStream):
    tap_stream_id = "workbooks"
    key_properties = ["id"]
    path = "workbooks/{}"
    parent = WorkbookList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        self.logger.info("Syncing: {}".format(self.tap_stream_id))
        workbooks = []

        for workbook_id in self.get_parent_data():
            call_path = self.path.format(workbook_id)
            response = self.client.get(call_path)
            results = response.get("workbook")

            workbooks.append(results)

        yield from workbooks


class ViewList(FullTableStream):
    tap_stream_id = "view_list"
    key_properties = ["id"]
    to_replicate = False
    path = "views"
    data_key = "views"
    sub_data_key = "view"

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        response = self.client.get(self.path)

        if response.get(self.data_key).get(self.sub_data_key) is None:
            self.logger.critical(f"Response is empty for {self.tap_stream_id} stream")
            raise TableauError

        # Only yield records when called by child streams
        if is_parent:
            for record in response.get(self.data_key).get(self.sub_data_key):
                yield record.get("id")


class Views(FullTableStream):
    tap_stream_id = "views"
    key_properties = ["id"]
    path = "views/{}"
    parent = ViewList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        self.logger.info("Syncing: {}".format(self.tap_stream_id))
        views = []

        for view_id in self.get_parent_data():
            call_path = self.path.format(view_id)
            response = self.client.get(call_path)
            results = response.get("view")

            views.append(results)

        yield from views


STREAMS = {
    "workbook_list": WorkbookList,
    "workbooks": Workbooks,
    "view_list": ViewList,
    "views": Views
}
