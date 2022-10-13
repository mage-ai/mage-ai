from os.path import isfile
from singer.catalog import Catalog, CatalogEntry
from singer.metadata import get_standard_metadata
from singer.schema import Schema
from sources.utils import get_abs_path
from typing import List
from utils.array import find_index
from utils.dictionary import merge_dict
from utils.logger import Logger
import inspect
import json
import os
import singer

LOGGER = singer.get_logger()


class Source():
    def __init__(self,
        config: dict,
        state: dict,
        catalog: Catalog,
        discover_mode: bool = False,
        is_sorted: bool = True,
        key_properties: List[str] = None,
        logger = LOGGER,
        replication_key: str = None,
        replication_method: str = None, # INCREMENTAL or FULL_TABLE
        schemas_folder: str = 'schemas',
    ):
        self.catalog = catalog
        self.config = config
        self.discover_mode = discover_mode
        self.key_properties = key_properties
        # TODO (tommy dang): indicate whether data is sorted ascending on bookmark value
        self.is_sorted = is_sorted
        self.logger = Logger(caller=self, logger=logger)
        self.replication_key = replication_key
        self.replication_method = replication_method
        self.schemas_folder = schemas_folder
        self.state = state

    def discover(self) -> Catalog:
        streams = []

        for stream_id, schema in self.__load_schemas().items():
            streams.append(self.build_catalog_entry(stream_id, schema))

        return Catalog(streams)

    def process(self) -> None:
        if self.discover_mode:
            catalog = self.discover()
            catalog.dump()
        else:
            catalog = self.catalog or self.discover()
            self.sync(self.config, self.state, catalog)

    def sync(self, config: dict, state: dict, catalog: Catalog) -> None:
        for stream in catalog.get_selected_streams(state):
            tap_stream_id = stream.tap_stream_id

            self.logger.info(f'Syncing stream {tap_stream_id}.')

            singer.write_schema(
                key_properties=stream.key_properties,
                schema=stream.schema.to_dict(),
                stream_name=tap_stream_id,
            )

            bookmark = None
            bookmark_column = stream.replication_key
            if bookmark_column:
                bookmark = singer.get_bookmark(state, tap_stream_id, bookmark_column)

            max_bookmark = None
            for row in self.load_data(bookmark=bookmark, bookmark_column=bookmark_column):
                singer.write_records(tap_stream_id, [row])

                if bookmark_column:
                    if self.is_sorted:
                        singer.write_state({
                            tap_stream_id: row[bookmark_column],
                        })
                    else:
                        # If data unsorted, save max value until end of writes
                        max_bookmark = max(max_bookmark, row[bookmark_column])

            if bookmark_column and not self.is_sorted:
                singer.write_state({
                    tap_stream_id: max_bookmark,
                })

    def build_catalog_entry(self, stream_id, schema, **kwargs):
        # https://github.com/singer-io/getting-started/blob/master/docs/DISCOVERY_MODE.md#metadata
        metadata = get_standard_metadata(
            schema.to_dict(),
            stream_id,
            self.get_key_properties(stream_id),
            self.get_valid_replication_keys(stream_id),
            self.get_replication_method(stream_id),
        )
        idx = find_index(lambda x: len(x['breadcrumb']) == 0, metadata)
        if idx >= 0:
            metadata[idx]['metadata']['selected'] = False

        return CatalogEntry(**merge_dict(
            dict(
                database=None,
                is_view=None,
                key_properties=self.key_properties,
                metadata=metadata,
                replication_key=self.replication_key,
                replication_method=self.replication_method,
                row_count=None,
                schema=schema,
                stream=stream_id,
                stream_alias=None,
                table=None,
                tap_stream_id=stream_id,
            ),
            kwargs,
        ))

    def load_data(self, bookmark: str = None, bookmark_column: str = None, **kwargs) -> List[dict]:
        raise Exception('Subclasses must implement the load_data method.')

    def get_key_properties(self, stream_id: str) -> List[str]:
        return []

    def get_replication_method(self, stream_id: str) -> List[str]:
        return []

    def get_valid_replication_keys(self, stream_id: str) -> List[str]:
        return []

    def __load_schemas(self) -> dict:
        parts = inspect.getfile(self.__class__).split('/')
        absolute_path = get_abs_path(f"{'/'.join(parts[:len(parts) - 1])}/{self.schemas_folder}")

        schemas = {}
        for filename in os.listdir(absolute_path):
            path = absolute_path + '/' + filename
            if isfile(path):
                file_raw = filename.replace('.json', '')
                with open(path) as file:
                    schemas[file_raw] = Schema.from_dict(json.load(file))

        return schemas
