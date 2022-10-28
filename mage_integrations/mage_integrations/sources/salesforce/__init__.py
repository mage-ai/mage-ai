from datetime import datetime
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
from singer import utils
from typing import List
import singer


LOGGER = singer.get_logger()


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
        do_sync(self.client, catalog_dict, state)

    def discover(self, streams: List[str] = None) -> Catalog:
        try:
            if streams:
                return Catalog(do_discover(self.client, streams=streams)['streams'])
        finally:
            self.__finally_clean_up()

        return Catalog([])

    def get_stream_ids(self) -> List[str]:
        return discover_objects(self.client)

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


@utils.handle_top_exception(LOGGER)
def main():
    source = Salesforce()
    source.process()


if __name__ == '__main__':
    main()
