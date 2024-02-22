import inspect
import json
import os
import sys
import traceback
from datetime import datetime
from os.path import isfile
from typing import Dict, Generator, List

import dateutil.parser
import pandas as pd
import simplejson
import singer
from singer import utils
from singer.schema import Schema

from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.constants import (
    REPLICATION_METHOD_FULL_TABLE,
    REPLICATION_METHOD_INCREMENTAL,
    REPLICATION_METHOD_LOG_BASED,
)
from mage_integrations.sources.messages import write_records, write_schema, write_state
from mage_integrations.sources.utils import get_standard_metadata, parse_args
from mage_integrations.utils.array import find_index
from mage_integrations.utils.dictionary import extract, group_by, merge_dict
from mage_integrations.utils.files import get_abs_path
from mage_integrations.utils.logger import Logger
from mage_integrations.utils.logger.constants import TYPE_SAMPLE_DATA
from mage_integrations.utils.schema_helpers import extract_selected_columns

LOGGER = singer.get_logger()


class Source:
    def __init__(
        self,
        args=None,
        catalog: Catalog = None,
        config: Dict = None,
        count_records: bool = False,
        discover_mode: bool = False,
        discover_streams_mode: bool = False,
        is_sorted: bool = True,
        load_sample_data: bool = False,
        log_to_stdout: bool = False,
        logger=LOGGER,
        query: Dict = None,
        schemas_folder: str = 'schemas',
        selected_streams: List[str] = None,
        settings: Dict = None,
        show_templates: bool = False,
        state: Dict = None,
        test_connection: bool = False,
        verbose: int = 1,
    ):
        if query is None:
            query = {}
        args = parse_args([])
        if args:
            if args.catalog:
                catalog = args.catalog
            if args.config:
                config = args.config
            if args.count_records:
                count_records = args.count_records
            if args.discover:
                discover_mode = args.discover
            if args.discover_streams:
                discover_streams_mode = args.discover_streams
            if args.log_to_stdout:
                log_to_stdout = args.log_to_stdout
            if args.query:
                query = args.query
            if args.selected_streams:
                selected_streams = args.selected_streams
            if args.show_templates:
                show_templates = args.show_templates
            if args.state:
                state = args.state
            if args.test_connection:
                test_connection = args.test_connection
            if args.load_sample_data:
                load_sample_data = args.load_sample_data

        self.catalog = catalog
        self.config = config
        self.count_records_mode = count_records
        self.discover_mode = discover_mode
        self.discover_streams_mode = discover_streams_mode
        # TODO (tommy dang): indicate whether data is sorted ascending on bookmark value
        self.is_sorted = is_sorted
        self.load_sample_data = load_sample_data
        self.logger = Logger(
            caller=self,
            log_to_stdout=log_to_stdout,
            logger=logger,
            verbose=verbose,
        )
        self.schemas_folder = schemas_folder
        self.selected_streams = selected_streams
        self.settings = settings
        self.show_templates = show_templates
        self.should_test_connection = test_connection
        self.state = state

        if type(query) is str:
            self.query = json.loads(query)
        else:
            self.query = query

    @classmethod
    def templates(self) -> List[Dict]:
        """
        Get a list of template files.

        Returns:
            List[Dict]: Description
        """
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

    def discover(self, streams: List[str] = None) -> Catalog:
        """
        Disocver streams and build catalog entries.

        Args:
            streams (List[str], optional): Description

        Returns:
            Catalog: Description
        """
        catalog_entries = []
        for stream_id, schema in self.load_schemas_from_folder().items():
            if not streams or stream_id in streams:
                catalog_entries.append(self.build_catalog_entry(stream_id, schema))

        return Catalog(catalog_entries)

    def discover_streams(self) -> List[Dict]:
        """
        Discover streams.

        Returns:
            List[Dict]: Description
        """
        return [dict(
            stream=stream_id,
            tap_stream_id=stream_id,
        ) for stream_id in self.get_stream_ids()]

    def get_stream_ids(self) -> List[str]:
        """
        Get stream IDs after discovery.

        Returns:
            List[str]: A list of discovered stream IDs.

        Raises:
            Exception: The stream type in catalog is not a CatalogEntry or a dict.
        """
        # If you want to display available stream IDs before getting the stream properties,
        # override this method to return a list of stream IDs
        catalog = self.discover()

        stream_ids = []
        for stream in catalog.streams:
            if type(stream) is CatalogEntry:
                stream_ids.append(stream.tap_stream_id)
            elif type(stream) is dict:
                stream_ids.append(stream['tap_stream_id'])
            else:
                raise Exception(f'Invalid stream class type of {stream.__class__.__name__}.')

        return stream_ids

    def internal_column_schema(self, stream, bookmarks: Dict = None) -> Dict[str, Dict]:
        return dict()

    def process(self) -> None:
        """
        Main method to fetch data from the source with the following steps:
            1. Discover streams
            2. Build catalog
            3. Start syncing data

        Raises:
            Exception: Failed to fetch data from the source.
        """
        self.logger.info('Process started.')
        try:
            if self.should_test_connection:
                self.test_connection()
            elif self.load_sample_data:
                catalog = self.catalog or self.discover(streams=self.selected_streams)
                streams = [
                    catalog.get_stream(tap_stream_id) for tap_stream_id in self.selected_streams
                ]
                for stream in streams:
                    gen = self.load_data(stream, sample_data=True)
                    if gen is not None:
                        data = next(gen)
                        df = pd.DataFrame.from_records(data)

                        output = {
                            'stream_id': stream.tap_stream_id,
                            'sample_data': df.to_json(),
                            'type': TYPE_SAMPLE_DATA,
                        }

                        sys.stdout.write(simplejson.dumps(output) + '\n')
            elif self.discover_mode:
                if self.discover_streams_mode:
                    json.dump(self.discover_streams(), sys.stdout)
                else:
                    catalog = self.discover(streams=self.selected_streams)
                    if type(catalog) is Catalog:
                        catalog.dump()
                    elif type(catalog) is dict:
                        json.dump(catalog, sys.stdout)
            elif self.count_records_mode:
                arr = []
                selected_streams_arr = self.catalog.get_selected_streams(self.state or {}) or []
                streams = [stream for stream in selected_streams_arr
                           if stream.tap_stream_id in self.selected_streams]
                for stream in streams:
                    tap_stream_id = stream.tap_stream_id
                    count = self.count_records(
                        stream=stream,
                        bookmarks=self.__get_bookmarks_for_stream(stream),
                        query=self.query,
                    )
                    arr.append(dict(
                        count=count,
                        id=tap_stream_id,
                        stream=tap_stream_id,
                    ))
                json.dump(arr, sys.stdout)
            elif self.show_templates:
                json.dump(self.templates(), sys.stdout)
            else:
                if not self.catalog:
                    catalog = self.discover(streams=self.selected_streams)
                else:
                    streams_to_update = []
                    for stream in self.catalog.streams:
                        if stream.auto_add_new_fields:
                            streams_to_update.append(stream.tap_stream_id)
                    if len(streams_to_update) > 0:
                        updated_streams = self.discover(streams=streams_to_update).streams
                        updated_streams = group_by(
                            lambda s: s['tap_stream_id'] if type(s) is dict else s.tap_stream_id,
                            updated_streams
                        )
                        for stream in self.catalog.streams:
                            if stream.tap_stream_id in updated_streams:
                                stream.update_schema(updated_streams[stream.tap_stream_id][0])
                    catalog = self.catalog

                if self.selected_streams:
                    catalog.streams = list(filter(
                        lambda x: x.tap_stream_id in self.selected_streams,
                        catalog.streams,
                    ))

                self.sync(catalog)
        except Exception as err:
            message = f'{self.__class__.__name__} process failed with error {str(err)}.'
            self.logger.exception(message, tags=dict(
                error=str(err),
                errors=traceback.format_stack(),
                message=traceback.format_exc(),
            ))
            raise Exception(message)

    def process_stream(self, stream, properties: Dict = None):
        """
        Start syncing stream and write SCHEMA message.
        SCHEMA messages describe the datatypes of data in the stream.

        Example SCHEMA message:
            {
              "type": "SCHEMA",
              "stream": "users",
              "schema": {
                "properties": {
                  "id": {
                    "type": "integer"
                  },
                  "name": {
                    "type": "string"
                  },
                  "updated_at": {
                    "type": "string",
                    "format": "date-time"
                  }
                }
              },
              "key_properties": ["id"],
              "bookmark_properties": ["updated_at"]
            }

        Args:
            stream (TYPE): The stream to be processed.
            properties (Dict, optional): Dictionary to overwrite the
                stream's schema properties.

        Raises:
            Exception: Invalid replication_method.
        """
        tap_stream_id = stream.tap_stream_id
        self.logger.info(f'Process stream {tap_stream_id} started.')

        if stream.replication_method not in [
            REPLICATION_METHOD_FULL_TABLE,
            REPLICATION_METHOD_INCREMENTAL,
            REPLICATION_METHOD_LOG_BASED,
        ]:
            message = f'Invalid replication_method {stream.replication_method}'
            self.logger.exception(message)
            raise Exception(message)

        schema_dict = stream.schema.to_dict()
        schema_properties_dict = schema_dict['properties']
        if properties:
            schema_dict['properties'] = {
                k: schema_properties_dict[k]
                if k in schema_properties_dict else v
                for k, v in properties.items()
            }
        else:
            schema_dict['properties'] = extract(
                schema_dict['properties'],
                extract_selected_columns(stream.metadata),
            )

        bookmarks = self.__get_bookmarks_for_stream(stream)

        schema_dict['properties'] = merge_dict(
            schema_dict['properties'],
            self.internal_column_schema(stream, bookmarks=bookmarks),
        )

        schema_data = dict(
            bookmark_properties=self._get_bookmark_properties_for_stream(
                stream, bookmarks=bookmarks),
            disable_column_type_check=stream.disable_column_type_check,
            key_properties=stream.key_properties,
            partition_keys=stream.partition_keys,
            replication_method=stream.replication_method,
            schema=schema_dict,
            stream_name=tap_stream_id,
            unique_conflict_method=stream.unique_conflict_method,
            unique_constraints=stream.unique_constraints,
        )
        tags = dict(
            schema=schema_data,
            stream=tap_stream_id,
        )
        self.logger.info(f'Write schema {tap_stream_id} started.', tags=tags)

        write_schema(**schema_data)

        self.logger.info(f'Write schema {tap_stream_id} completed.', tags=tags)

        self.logger.info(f'Process stream {tap_stream_id} completed.')

    def sync_stream(self, stream, properties: Dict = None) -> int:
        """
        Steps:
            1. Get bookmarks.
            2. Load data.
            3. Write RECORD messages.
            4. Write STATE messages.

        Args:
            stream (TYPE): The stream object.
            properties (Dict, optional ): Dictionary to overwrite the
                stream's schema properties.

        Returns:
            int: Number of records.
        """
        start_date = None
        if not REPLICATION_METHOD_INCREMENTAL == stream.replication_method and \
           self.config.get('start_date'):
            start_date = dateutil.parser.parse(self.config.get('start_date'))

        bookmark_properties = self._get_bookmark_properties_for_stream(stream)
        max_bookmark = []

        tap_stream_id = stream.tap_stream_id
        tags = dict(
            query=self.query,
            start_date=start_date,
            stream=tap_stream_id,
        )
        self.logger.info(f'Load data for stream {tap_stream_id} started.', tags=tags)

        record_count = 0
        final_record = None
        for rows in self.load_data(
            bookmarks=self.__get_bookmarks_for_stream(stream),
            query=self.query,
            start_date=start_date,
            stream=stream,
        ):
            result = self.write_records(stream, rows, properties)
            max_bookmark_tmp = result['max_bookmark']
            final_record = result['final_record']
            max_bookmark = max(max_bookmark, max_bookmark_tmp)
            record_count += len(rows)

        if final_record:
            self.logger.info(
                'Final record writing completed.',
                tags=dict(
                    record=final_record,
                    stream=tap_stream_id,
                ),
            )

        if bookmark_properties and not self.is_sorted:
            if max_bookmark:
                state = {}

                for idx, col in enumerate(bookmark_properties):
                    singer.write_bookmark(
                        state,
                        stream.tap_stream_id,
                        col,
                        max_bookmark[idx],
                    )

                write_state(state)

        self.logger.info(
            f'Load data for stream {tap_stream_id} completed.',
            tags=merge_dict(tags, dict(records=record_count)),
        )

        return record_count

    def write_records(self, stream, rows: List[Dict], properties: Dict = None) -> List:
        """Write RECORD messages.

        Args:
            stream (TYPE): The stream object.
            rows (List[Dict]): Records to write.

        Returns:
            List: Bookmark values.
        """
        bookmarks = self.__get_bookmarks_for_stream(stream)
        bookmark_properties = self._get_bookmark_properties_for_stream(
            stream,
            bookmarks=bookmarks,
        )
        max_bookmark = []

        columns = extract_selected_columns(stream.metadata)
        if properties is not None:
            columns = list(properties.keys())
        columns += self.internal_column_schema(stream, bookmarks=bookmarks).keys()

        final_record = None
        for row in rows:
            tap_stream_id = stream.tap_stream_id
            record = {col: row.get(col) for col in columns}
            write_records(
                tap_stream_id,
                [
                    record,
                ],
            )
            final_record = record

            if (stream.replication_method in [
                    REPLICATION_METHOD_INCREMENTAL,
                    REPLICATION_METHOD_LOG_BASED,
                ]
                    and bookmark_properties):
                if self.is_sorted:
                    state = {}

                    for _, col in enumerate(bookmark_properties):
                        singer.write_bookmark(
                            state,
                            tap_stream_id,
                            col,
                            row.get(col),
                        )

                    write_state(state)
                else:
                    # If data unsorted, save max value until end of writes
                    max_bookmark = max(
                        max_bookmark,
                        [row.get(col) for col in bookmark_properties],
                    )

        return dict(
            final_record=final_record,
            max_bookmark=max_bookmark,
        )

    def sync(self, catalog: Catalog, properties: Dict = None) -> None:
        """
        Main method to sync the data.

        Steps:
            1. Process stream: write SCHEMA message.
            2. Sync stream: load data, write RECORD messages and STATE messages.

        Args:
            catalog (Catalog): The catalog of streams
            properties (Dict): Optional argument to overwrite stream schema properties
        """
        self.logger.info('Sync started.')

        for stream in catalog.get_selected_streams(self.state or {}):
            tap_stream_id = stream.tap_stream_id
            tags = dict(stream=tap_stream_id)
            self.logger.info(f'Sync for stream {tap_stream_id} started.', tags=tags)

            self.process_stream(stream, properties)
            record_count = self.sync_stream(stream, properties)

            self.logger.info(
                f'Sync for stream {tap_stream_id} completed.',
                tags=merge_dict(tags, dict(records=record_count)),
            )

        self.logger.info('Sync completed.')

    def build_catalog_entry(
        self,
        stream_id: str,
        schema,
        bookmark_properties: List[str] = None,
        key_properties: List[str] = None,
        replication_key: str = None,
        replication_method: str = None,
        **kwargs,
    ) -> CatalogEntry:
        """
        Build catalog entry.

        Args:
            stream_id (str): The name of the stream.
            schema: The schema of the stream.

        Returns:
            CatalogEntry: The catalog entry of the stream.
        """
        # https://github.com/singer-io/getting-started/blob/master/docs/DISCOVERY_MODE.md#metadata
        metadata = get_standard_metadata(
            key_properties=key_properties or self.get_table_key_properties(stream_id),
            replication_method=replication_method or self.get_forced_replication_method(stream_id),
            schema=schema.to_dict(),
            stream_id=stream_id,
            valid_replication_keys=bookmark_properties or
            self.get_valid_replication_keys(stream_id),
        )

        idx = find_index(lambda x: len(x['breadcrumb']) == 0, metadata)
        if idx >= 0:
            metadata[idx]['metadata']['selected'] = False

        if not replication_key and bookmark_properties and len(bookmark_properties) >= 1:
            replication_key = bookmark_properties[0]

        return CatalogEntry(**merge_dict(
            dict(
                bookmark_properties=bookmark_properties,
                database=None,
                disable_column_type_check=None,
                is_view=None,
                # User customizes this after creating catalog from discover.
                key_properties=key_properties or [],
                metadata=metadata,
                partition_keys=None,
                replication_key=replication_key or '',
                replication_method=replication_method or
                self.get_forced_replication_method(stream_id),
                row_count=None,
                schema=schema,
                stream=stream_id,
                stream_alias=None,
                table=None,
                tap_stream_id=stream_id,
                unique_conflict_method=None,
                unique_constraints=None,
            ),
            kwargs,
        ))

    def test_connection(self) -> None:
        """
        Test connection with source.
        Subclasses must implement the test_connection method.
        """
        raise Exception('Testing the connection is not currently supported for this source. ' +
                        'You can request it as a feature by creating a new Github issue.')

    def count_records(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = None,
        **kwargs,
    ) -> int:
        return 0

    def load_data(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = None,
        sample_data: bool = False,
        start_date: datetime = None,
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        """
        Load data from source.

        Args:
            bookmarks (Dict): Bookmarks for the stream id.
            query (Dict): query
            start_date (datetime): start_date

        Subclasses must implement the load_data method.
        """
        raise Exception('Loading sample data is not currently supported for this source.')

    def get_forced_replication_method(self, stream_id: str) -> str:
        """
        Get forced replication method to use for a stream.
        Either FULL_TABLE or INCREMENTAL.

        Args:
            stream_id (str): The name of the stream.

        Returns:
            str: The replication method.
        """
        return REPLICATION_METHOD_FULL_TABLE

    def get_table_key_properties(self, stream_id: str) -> List[str]:
        """
        Get the table key properties: a list of strings indicating which
        properties make up the primary key for this stream.

        Args:
            stream_id (str): The name of the stream.

        Returns:
            List[str]: The list of key properties.
        """
        return []

    def get_valid_replication_keys(self, stream_id: str) -> List[str]:
        """
        Get valid replication keys.
        Replication key is the name of a property in the source to use as a
        "bookmark". For example, this will often be an "updated-at" field or
        an auto-incrementing primary key (requires replication-method).

        Args:
            stream_id (str): The name of the stream.

        Returns:
            List[str]: The list of replication keys.
        """
        return []

    def load_schemas_from_folder(self) -> Dict:
        """
        Load schemas from /schemas folder.

        Returns:
            dict: A dictionary of schema name to schema
        """
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

    def _get_bookmark_properties_for_stream(self, stream, bookmarks: Dict = None) -> List[str]:
        bookmark_properties = []

        if REPLICATION_METHOD_INCREMENTAL == stream.replication_method:
            bookmark_properties = self._get_replication_key(stream)
        return bookmark_properties

    def _get_replication_key(self, stream) -> List[str]:
        if stream.replication_key:
            return [stream.replication_key]
        else:
            return stream.to_dict().get('bookmark_properties', [])

    def __get_bookmarks_for_stream(self, stream) -> Dict:
        if stream.replication_method in [
            REPLICATION_METHOD_INCREMENTAL,
            REPLICATION_METHOD_LOG_BASED,
        ]:
            data = self.state or {}
            return data.get('bookmarks', {}).get(stream.tap_stream_id, None)


@utils.handle_top_exception(LOGGER)
def main(source_class, **kwargs):
    source = source_class(**kwargs)
    source.process()
