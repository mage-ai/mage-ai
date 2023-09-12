"""
This module defines the stream classes and their individual sync logic.
"""

import datetime
from typing import Iterator

import singer
from singer.transform import unix_milliseconds_to_datetime

from mage_integrations.sources.powerbi.client import PowerbiClient, PowerbiError

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
    # default_data_key is unique for Powerbi since the data comes under the "value" key
    default_data_key = "value"
    data_key = None

    def __init__(self, client: PowerbiClient, logger=LOGGER):
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
            raise PowerbiError

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


class TileList(FullTableStream):
    tap_stream_id = "tile_list"
    key_properties = ["id"]
    to_replicate = False
    path = "dashboards/{}/tiles"
    data_key = "queries"
    parent = DashboardList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        counter = 0

        for dashboard_id in self.get_parent_data():
            call_path = self.path.format(dashboard_id)
            response = self.client.get(call_path)

            tiles_in_response = response.get(self.default_data_key)

            # Only yield records when called by child streams
            if is_parent and tiles_in_response != []:
                counter += 1
                for record in tiles_in_response:
                    yield {"tile_id": record.get("id"), "dashboard_id": dashboard_id}

        if counter == 0:
            self.logger.error(f"Response is empty for {self.tap_stream_id} stream")
            raise PowerbiError


class Tiles(FullTableStream):
    tap_stream_id = "tiles"
    key_properties = ["id"]
    path = "dashboards/{}/tiles/{}"
    parent = TileList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        self.logger.info("Syncing: {}".format(self.tap_stream_id))
        tiles = []

        for tokens in self.get_parent_data():
            dashboard_id = tokens.get("dashboard_id")
            tile_id = tokens.get("tile_id")

            call_path = self.path.format(dashboard_id, tile_id)
            results = self.client.get(call_path)

            tiles.append(results)

        yield from tiles


class ReportList(FullTableStream):
    tap_stream_id = "report_list"
    key_properties = ["id"]
    to_replicate = False
    path = "reports"
    data_key = "reports"

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        response = self.client.get(self.path)

        if response.get(self.default_data_key) is None:
            self.logger.critical(f"Response is empty for {self.tap_stream_id} stream")
            raise PowerbiError

        # Only yield records when called by child streams
        if is_parent:
            for record in response.get(self.default_data_key):
                yield record.get("id")


class Reports(FullTableStream):
    tap_stream_id = "reports"
    key_properties = ["id"]
    path = "reports/{}"
    parent = ReportList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        self.logger.info("Syncing: {}".format(self.tap_stream_id))
        reports = []

        for report_id in self.get_parent_data():
            call_path = self.path.format(report_id)
            results = self.client.get(call_path)

            reports.append(results)

        yield from reports


class DatasetList(FullTableStream):
    tap_stream_id = "dataset_list"
    key_properties = ["id"]
    to_replicate = False
    path = "datasets"
    data_key = "datasets"

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        response = self.client.get(self.path)

        if response.get(self.default_data_key) is None:
            self.logger.critical(f"Response is empty for {self.tap_stream_id} stream")
            raise PowerbiError

        # Only yield records when called by child streams
        if is_parent:
            for record in response.get(self.default_data_key):
                yield record.get("id")


class Datasets(FullTableStream):
    tap_stream_id = "datasets"
    key_properties = ["id"]
    path = "datasets/{}"
    parent = DatasetList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        self.logger.info("Syncing: {}".format(self.tap_stream_id))
        datasets = []

        for dataset_id in self.get_parent_data():
            call_path = self.path.format(dataset_id)
            results = self.client.get(call_path)

            datasets.append(results)

        yield from datasets


class AppList(FullTableStream):
    tap_stream_id = "app_list"
    key_properties = ["id"]
    to_replicate = False
    path = "apps"
    data_key = "apps"

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        response = self.client.get(self.path)

        if response.get(self.default_data_key) is None:
            self.logger.critical(f"Response is empty for {self.tap_stream_id} stream")
            raise PowerbiError

        # Only yield records when called by child streams
        if is_parent:
            for record in response.get(self.default_data_key):
                yield record.get("id")


class Apps(FullTableStream):
    tap_stream_id = "apps"
    key_properties = ["id"]
    path = "apps/{}"
    parent = AppList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        self.logger.info("Syncing: {}".format(self.tap_stream_id))
        apps = []

        for app_id in self.get_parent_data():
            call_path = self.path.format(app_id)
            results = self.client.get(call_path)

            apps.append(results)

        yield from apps


class GroupList(FullTableStream):
    tap_stream_id = "group_list"
    key_properties = ["id"]
    to_replicate = False
    path = "groups"
    data_key = "groups"

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        response = self.client.get(self.path)

        if response.get(self.default_data_key) is None:
            self.logger.critical(f"Response is empty for {self.tap_stream_id} stream")
            raise PowerbiError

        # Only yield records when called by child streams
        if is_parent:
            for record in response.get(self.default_data_key):
                yield record.get("id")


class Groups(FullTableStream):
    tap_stream_id = "groups"
    key_properties = ["id"]
    path = "groups/{}"
    parent = GroupList

    def get_records(self, bookmark_datetime=None, is_parent=False) -> Iterator[list]:
        self.logger.info("Syncing: {}".format(self.tap_stream_id))
        groups = []

        for group_id in self.get_parent_data():
            call_path = self.path.format(group_id)
            results = self.client.get(call_path)

            groups.append(results)

        yield from groups


STREAMS = {
    "dashboard_list": DashboardList,
    "dashboards": Dashboards,
    "tile_list": TileList,
    "tiles": Tiles,
    "report_list": ReportList,
    "reports": Reports,
    "dataset_list": DatasetList,
    "datasets": Datasets,
    "app_list": AppList,
    "apps": Apps,
    "group_list": GroupList,
    "groups": Groups,
}
