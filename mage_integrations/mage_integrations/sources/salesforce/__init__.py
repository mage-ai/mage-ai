from typing import Dict, Generator, List

from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.salesforce.client.tap_salesforce import (
    build_state,
    do_discover,
    do_sync,
)
from mage_integrations.sources.salesforce.client.tap_salesforce.salesforce import (
    Salesforce as SalesforceConnection,
)
from mage_integrations.sources.salesforce.client.tap_salesforce.salesforce.credentials import (
    parse_credentials,
)


class Salesforce(Source):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._client = None

    @property
    def client(self) -> SalesforceConnection:
        if self._client:
            return self._client

        self._client = SalesforceConnection(
            credentials=parse_credentials(self.config),
            quota_percent_total=self.config.get('quota_percent_total'),
            quota_percent_per_run=self.config.get('quota_percent_per_run'),
            is_sandbox=self.config.get('domain'),
            select_fields_by_default=self.config.get('select_fields_by_default'),
            default_start_date=self.config.get('start_date'),
            api_type=self.config.get('api_type')
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
            threshold=self.config.get('threshold'),
            logger=self.logger
        )

    def discover(self, streams: List[str] = None) -> Catalog:
        catalog = Catalog(do_discover(self.client,
                                      streams=self.config.get('streams', None),
                                      logger=self.logger)['streams'])
        self.__finally_clean_up()
        return catalog

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
        try:
            self.client
        except Exception as e:
            raise e

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
