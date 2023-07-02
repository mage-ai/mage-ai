import json
import sys
import traceback
from datetime import datetime
from typing import Dict, Generator, List

import pandas as pd
import simplejson
import singer
from singer import utils

from mage_integrations.sources.base import Source
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.salesforce.client.tap_salesforce import (
    build_state,
    discover_objects,
    do_discover,
    do_sync,
)
from mage_integrations.sources.salesforce.client.tap_salesforce.salesforce import (
    Salesforce as SalesforceConnection,
)
from mage_integrations.utils.dictionary import group_by
from mage_integrations.utils.logger.constants import TYPE_SAMPLE_DATA

LOGGER = singer.get_logger()


class Salesforce(Source):
    def __init__(self, **kwargs):
        self.load_sample_data = True
        super().__init__(**kwargs)
        self._client = None

    @property
    def client(self) -> SalesforceConnection:
        if self._client:
            return self._client

        lookback_window = self.config.get('lookback_window')
        lookback_window = int(lookback_window) if lookback_window else None

        start_date = self.config.get('start_date')
        if type(start_date) is datetime:
            start_date = start_date.isoformat()

        self._client = SalesforceConnection(
            api_type=self.config.get('api_type'),
            default_start_date=start_date,
            is_sandbox=self.config.get('is_sandbox'),
            lookback_window=lookback_window,
            quota_percent_per_run=self.config.get('quota_percent_per_run'),
            quota_percent_total=self.config.get('quota_percent_total'),
            refresh_token=self.config['refresh_token'],
            select_fields_by_default=self.config.get('select_fields_by_default'),
            sf_client_id=self.config['client_id'],
            sf_client_secret=self.config['client_secret'],
        )
        self._client.login()

        return self._client

    def sync(self, catalog: Catalog) -> None:
        catalog_dict = catalog.to_dict()
        state = build_state(self.state, catalog_dict)
        do_sync(
            self.client,
            catalog_dict,
            state,
            logger=self.logger
        )

    def discover(self, streams: List[str] = None) -> Catalog:
        try:
            if streams:
                return Catalog(
                    do_discover(self.client, streams=streams, logger=self.logger)['streams'])
        finally:
            self.__finally_clean_up()

        return Catalog([])

    def get_stream_ids(self) -> List[str]:
        return discover_objects(self.client, self.selected_streams)

    def __finally_clean_up(self):
        if self.client:
            if self.client.rest_requests_attempted > 0:
                LOGGER.debug(
                    "This job used %s REST requests towards the Salesforce quota.",
                    self.client.rest_requests_attempted)
            if self.client.jobs_completed > 0:
                LOGGER.debug(
                    "Replication used %s Bulk API jobs towards the Salesforce quota.",
                    self.client.jobs_completed)
            if self.client.login_timer:
                self.client.login_timer.cancel()

    def test_connection(self):
        self.client

    def load_data(
        self,
        stream,
        catalog_dict,
        bookmarks: Dict = None,
        query: Dict = {},
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        raw_state = {}
        state = build_state(raw_state, catalog_dict)
        data_frames = []
        for data in self._client.query(state=state, catalog_entry=stream, limit=True):
            data_test = pd.read_json(json.dumps(data), lines=True)
            data_frames.append(data_test)

        return pd.concat(data_frames, ignore_index=True)

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
                catalog = self.discover(streams=self.selected_streams)
                streams = catalog.to_dict()['streams']
                for stream in streams:

                    gen = self.load_data(stream, sample_data=True, catalog_dict=catalog.to_dict())
                    if gen is not None:
                        print(gen)
                        print(gen.to_json())
                        output = {
                            'stream_id': stream['tap_stream_id'],
                            'sample_data': gen.to_json(),
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
                streams = [stream for stream in selected_streams_arr if stream.tap_stream_id in self.selected_streams] # noqa
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


@utils.handle_top_exception(LOGGER)
def main():
    source = Salesforce()
    source.process()


if __name__ == '__main__':
    main()
