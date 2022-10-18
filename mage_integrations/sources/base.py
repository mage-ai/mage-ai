from datetime import datetime
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.constants import (
    REPLICATION_METHOD_FULL_TABLE,
    REPLICATION_METHOD_INCREMENTAL,
)
from mage_integrations.utils.array import find_index
from mage_integrations.utils.dictionary import extract, merge_dict
from mage_integrations.utils.files import get_abs_path
from mage_integrations.utils.logger import Logger
from mage_integrations.utils.schema_helpers import extract_selected_columns
from mage_integrations.sources.messages import write_schema
from mage_integrations.sources.utils import get_standard_metadata, parse_args
from os.path import isfile
from singer.schema import Schema
from typing import Dict, List
import dateutil.parser
import inspect
import json
import os
import singer
import traceback

LOGGER = singer.get_logger()


class Source():
    def __init__(self,
        args = None,
        catalog: Catalog = None,
        config: Dict = None,
        discover_mode: bool = False,
        is_sorted: bool = True,
        log_to_stdout: bool = False,
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
            if args.log_to_stdout:
                log_to_stdout = args.log_to_stdout
            if args.query:
                query = args.query
            if args.state:
                state = args.state

        self.catalog = catalog
        self.config = config
        self.discover_mode = discover_mode
        # TODO (tommy dang): indicate whether data is sorted ascending on bookmark value
        self.is_sorted = is_sorted
        self.logger = Logger(
            caller=self,
            log_to_stdout=log_to_stdout,
            logger=logger,
            verbose=verbose,
        )
        self.schemas_folder = schemas_folder
        self.settings = settings
        self.state = state

        if type(query) is str:
            self.query = json.loads(query)
        else:
            self.query = query

    @classmethod
    def templates(self) -> List[Dict]:
        parts = inspect.getfile(self).split('/')
        absolute_path = get_abs_path(f"{'/'.join(parts[:len(parts) - 1])}/templates")

        templates = {}
        for filename in os.listdir(absolute_path):
            path = absolute_path + '/' + filename
            if isfile(path):
                file_raw = filename.replace('.json', '')
                with open(path) as file:
                    templates[file_raw] = json.load(file)

        return templates

    def discover(self) -> Catalog:
        streams = []

        for stream_id, schema in self.__load_schemas().items():
            streams.append(self.build_catalog_entry(stream_id, schema))

        return Catalog(streams)

    def process(self) -> None:
        try:
            if self.discover_mode:
                catalog = self.discover()
                if type(catalog) is Catalog:
                    catalog.dump()
                elif type(catalog) is dict:
                    print(json.dumps(catalog, indent=2))
            else:
                catalog = self.catalog or self.discover()
                self.sync(catalog)
        except Exception as err:
            message = f'{self.__class__.__name__} process failed with error {err}.'
            self.logger.exception(message, tags=dict(
                error=str(err),
                errors=traceback.format_stack(),
                message=traceback.format_exc(),
            ))
            raise Exception(message)

    def get_bookmarks_for_stream(self, stream) -> Dict:
        if REPLICATION_METHOD_INCREMENTAL == stream.replication_method:
            return self.state.get('bookmarks', {}).get(stream.tap_stream_id, None)

    def get_boommark_properties_for_stream(self, stream) -> List[str]:
        bookmark_properties = []

        if REPLICATION_METHOD_INCREMENTAL == stream.replication_method:
            if stream.replication_key:
                bookmark_properties = [stream.replication_key]
            else:
                bookmark_properties = stream.to_dict().get('bookmark_properties', [])

        return bookmark_properties

    def process_stream(self, stream):
        self.logger.info(f'Syncing stream {stream.tap_stream_id}.')

        if stream.replication_method not in [
            REPLICATION_METHOD_FULL_TABLE,
            REPLICATION_METHOD_INCREMENTAL,
        ]:
            message = f'Invalid replication_method {stream.replication_method}'
            self.logger.exception(message)
            raise Exception(message)

        schema_dict = stream.schema.to_dict()
        schema_dict['properties'] = extract(
            schema_dict['properties'],
            extract_selected_columns(stream.metadata),
        )

        write_schema(
            bookmark_properties=self.get_boommark_properties_for_stream(stream),
            key_properties=stream.key_properties,
            replication_method=stream.replication_method,
            schema=schema_dict,
            stream_name=stream.tap_stream_id,
            unique_conflict_method=stream.unique_conflict_method,
            unique_constraints=stream.unique_constraints,
        )

    def sync_stream(self, stream) -> None:
        bookmark_properties = self.get_boommark_properties_for_stream(stream)

        start_date = None
        if not REPLICATION_METHOD_INCREMENTAL == stream.replication_method and self.config.get('start_date'):
            start_date = dateutil.parser.parse(self.config.get('start_date'))

        max_bookmark = None
        for row in self.load_data(
            bookmarks=self.get_bookmarks_for_stream(stream),
            query=self.query,
            start_date=start_date,
        ):
            singer.write_records(
                stream.tap_stream_id,
                [
                    {col: row.get(col) for col in extract_selected_columns(stream.metadata)},
                ],
            )

            if REPLICATION_METHOD_INCREMENTAL == stream.replication_method and bookmark_properties:
                if self.is_sorted:
                    singer.write_state({
                        stream.tap_stream_id: {col: row.get(col) for col in bookmark_properties},
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
                    stream.tap_stream_id: {col: max_bookmark[idx] for idx, col in enumerate(bookmark_properties)},
                })

    def sync(self, catalog: Catalog) -> None:
        for stream in catalog.get_selected_streams(self.state):
            self.process_stream(stream)
            self.sync_stream(stream)

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
