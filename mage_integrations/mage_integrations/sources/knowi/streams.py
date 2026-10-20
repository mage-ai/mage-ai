"""
This module defines the stream classes and their individual sync logic.
"""

import datetime
from typing import Iterator

import singer
from singer.transform import unix_milliseconds_to_datetime

from mage_integrations.sources.knowi.client import KnowiClient, KnowiError

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
    # default_data_key is unique for Knowi since the data comes under the "list" key
    default_data_key = "list"
    data_key = None

    def __init__(self, client: KnowiClient, logger=LOGGER):
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


class DashboardList(FullTableStream):
    tap_stream_id = "dashboard_list"
    key_properties = ["id"]
    to_replicate = False
    path = "dashboards"
    data_key = "dashboards"

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        response = self.client.get(self.path)

        if response.get(self.default_data_key) is None:
            self.logger.critical(f"Response is empty for {self.tap_stream_id} stream")
            raise KnowiError

        # Only yield records when called by child streams
        if is_parent:
            for record in response.get(self.default_data_key):
                yield record.get("id")


class Dashboards(FullTableStream):
    tap_stream_id = "dashboards"
    key_properties = ["id"]
    path = "dashboards/{}"
    parent = DashboardList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        self.logger.info("Syncing: {}".format(self.tap_stream_id))
        dashboards = []

        for dashboard_id in self.get_parent_data():
            call_path = self.path.format(dashboard_id)
            results = self.client.get(call_path)

            dashboards.append(results)

        yield from dashboards


class WidgetList(FullTableStream):
    tap_stream_id = "widget_list"
    key_properties = ["id"]
    to_replicate = False
    path = "widgets"
    data_key = "widgets"

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        response = self.client.get(self.path)

        if response.get(self.default_data_key) is None:
            self.logger.critical(f"Response is empty for {self.tap_stream_id} stream")
            raise KnowiError

        # Only yield records when called by child streams
        if is_parent:
            for record in response.get(self.default_data_key):
                yield record.get("id")


class Widgets(FullTableStream):
    tap_stream_id = "widgets"
    key_properties = ["id"]
    path = "widgets/{}"
    parent = WidgetList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        self.logger.info("Syncing: {}".format(self.tap_stream_id))
        widgets = []

        for widget_id in self.get_parent_data():
            call_path = self.path.format(widget_id)
            results = self.client.get(call_path)

            widgets.append(results)

        yield from widgets


STREAMS = {
    "dashboard_list": DashboardList,
    "dashboards": Dashboards,
    "widget_list": WidgetList,
    "widgets": Widgets,
}
