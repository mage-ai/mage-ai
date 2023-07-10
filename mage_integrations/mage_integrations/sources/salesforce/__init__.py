from datetime import datetime
from typing import Dict, Generator, List

from mage_integrations.sources.base import Source, main
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


class Salesforce(Source):
    def __init__(self, **kwargs):
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
                self.logger.info(
                    f"This job used {self.client.rest_requests_attempted} REST requests \
                    towards the Salesforce quota.")
            if self.client.jobs_completed > 0:
                self.logger.info(
                    f"Replication used {self.client.jobs_completed} Bulk API jobs \
                    towards the Salesforce quota.")
            if self.client.login_timer:
                self.client.login_timer.cancel()

    def test_connection(self):
        self.client

    def load_data(
        self,
        stream,
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        raw_state = {}
        catalog_dict = self.discover(streams=self.selected_streams).to_dict()
        state = build_state(raw_state, catalog_dict)

        yield self._client.query(state=state, catalog_entry=stream.to_dict(), limit=True)


if __name__ == '__main__':
    main(Salesforce)
