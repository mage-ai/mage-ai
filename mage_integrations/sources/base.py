from datetime import datetime
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.constants import (
    REPLICATION_METHOD_FULL_TABLE,
    REPLICATION_METHOD_INCREMENTAL,
)
from mage_integrations.utils.array import find_index
from mage_integrations.utils.dictionary import extract, merge_dict
from mage_integrations.utils.logger import Logger
from mage_integrations.utils.schema_helpers import extract_selected_columns
from mage_integrations.sources.messages import write_schema
from mage_integrations.sources.utils import get_abs_path, get_standard_metadata, parse_args
from os.path import isfile
from singer.schema import Schema
from typing import Dict, List
import dateutil.parser
import inspect
import json
import os
import singer

LOGGER = singer.get_logger()


class Source():
    def __init__(self,
        args = None,
        catalog: Catalog = None,
        config: Dict = None,
        discover_mode: bool = False,
        is_sorted: bool = True,
        logger = LOGGER,
        query: Dict = {},
        schemas_folder: str = 'schemas',
        settings: Dict = None,
        state: Dict = None,
        verbose: int = 1,
    ):
        args = parse_args([])
        if args:
            if args.catalog:
                catalog = args.catalog
            if args.config:
                config = args.config
            if args.discover:
                discover_mode = args.discover
            if args.query:
                query = args.query
            if args.state:
                state = args.state

        self.catalog = catalog
        self.config = config
        self.discover_mode = discover_mode
        # TODO (tommy dang): indicate whether data is sorted ascending on bookmark value
        self.is_sorted = is_sorted
        self.logger = Logger(caller=self, logger=logger, verbose=verbose)
        self.schemas_folder = schemas_folder
        self.settings = settings
        self.state = state

        if type(query) is str:
            self.query = json.loads(query)
        else:
            self.query = query

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

    def sync(self, config: Dict, state: Dict, catalog: Catalog) -> None:
        for stream in catalog.get_selected_streams(state):
            tap_stream_id = stream.tap_stream_id

            self.logger.info(f'Syncing stream {tap_stream_id}.')

            bookmarks = None
            bookmark_properties = []
            replication_method = stream.replication_method
            incremental = REPLICATION_METHOD_INCREMENTAL == replication_method
            if incremental:
                bookmarks = state.get('bookmarks', {}).get(tap_stream_id, None)
                if stream.replication_key:
                    bookmark_properties = [stream.replication_key]
                else:
                    bookmark_properties = stream.to_dict().get('bookmark_properties', [])
            elif REPLICATION_METHOD_FULL_TABLE != replication_method:
                message = f'Invalid replication_method {replication_method}'
                self.logger.exception(message)
                raise Exception(message)

            start_date = None
            if not incremental and self.config.get('start_date'):
                start_date = dateutil.parser.parse(self.config.get('start_date'))

            selected_columns = extract_selected_columns(stream.metadata)
            schema_dict = stream.schema.to_dict()
            schema_dict['properties'] = extract(schema_dict['properties'], selected_columns)

            write_schema(
                bookmark_properties=bookmark_properties,
                key_properties=stream.key_properties,
                replication_method=replication_method,
                schema=schema_dict,
                stream_name=tap_stream_id,
                unique_conflict_method=stream.unique_conflict_method,
                unique_constraints=stream.unique_constraints,
            )

            max_bookmark = None
            for row in self.load_data(
                bookmarks=bookmarks,
                query=self.query,
                start_date=start_date,
            ):
                singer.write_records(
                    tap_stream_id,
                    [
                        {col: row.get(col) for col in selected_columns},
                    ],
                )

                if incremental and bookmark_properties:
                    if self.is_sorted:
                        singer.write_state({
                            tap_stream_id: {col: row.get(col) for col in bookmark_properties},
                        })
                    else:
                        # If data unsorted, save max value until end of writes
                        max_bookmark = max(
                            max_bookmark,
                            [row.get(col) for col in bookmark_properties],
                        )

            if bookmark_properties and not self.is_sorted:
                if max_bookmark:
                    singer.write_state({
                        tap_stream_id: {col: max_bookmark[idx] for idx, col in enumerate(bookmark_properties)},
                    })

    def build_catalog_entry(self, stream_id, schema, **kwargs):
        # https://github.com/singer-io/getting-started/blob/master/docs/DISCOVERY_MODE.md#metadata
        metadata = get_standard_metadata(
            key_properties=self.get_table_key_properties(stream_id),
            replication_method=self.get_forced_replication_method(stream_id),
            schema=schema.to_dict(),
            stream_id=stream_id,
            valid_replication_keys=self.get_valid_replication_keys(stream_id),
        )
        idx = find_index(lambda x: len(x['breadcrumb']) == 0, metadata)
        if idx >= 0:
            metadata[idx]['metadata']['selected'] = False

        return CatalogEntry(**merge_dict(
            dict(
                database=None,
                is_view=None,
                key_properties=[], # User customizes this after creating catalog from discover.
                metadata=metadata,
                replication_key='', # User customizes this after creating catalog from discover.
                replication_method=self.get_forced_replication_method(stream_id),
                row_count=None,
                schema=schema,
                stream=stream_id,
                stream_alias=None,
                table=None,
                tap_stream_id=stream_id,
            ),
            kwargs,
        ))


    def load_data(
        self,
        bookmarks: Dict = None,
        query: Dict = {},
        start_date: datetime = None,
        **kwargs,
    ) -> List[Dict]:
        raise Exception('Subclasses must implement the load_data method.')

    def get_forced_replication_method(self, stream_id: str) -> str:
        # INCREMENTAL or FULL_TABLE
        raise Exception('Subclasses must implement the get_forced_replication_method method.')
        return ''

    def get_table_key_properties(self, stream_id: str) -> List[str]:
        raise Exception('Subclasses must implement the get_table_key_properties method.')
        return []

    def get_valid_replication_keys(self, stream_id: str) -> List[str]:
        raise Exception('Subclasses must implement the get_valid_replication_keys method.')
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
