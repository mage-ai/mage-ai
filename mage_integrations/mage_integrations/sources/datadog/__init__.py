from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.datadog.client import DatadogClient
from mage_integrations.sources.datadog.streams import (
    AuditLogs,
    Dashboards,
    Downtimes,
    IncidentTeams,
    Incidents,
    Logs,
    Metrics,
    SyntheticTests,
    Users,
)
from typing import Dict, Generator, List

STREAMS = {
    'audit_logs': AuditLogs,
    'dashboards': Dashboards,
    'downtimes': Downtimes,
    'incident_teams': IncidentTeams,
    'incidents': Incidents,
    'logs': Logs,
    'metrics': Metrics,
    'synthetic_tests': SyntheticTests,
    'users': Users,
}


class Datadog(Source):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.client = DatadogClient(self.config, logger=self.logger)

    def load_data(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = {},
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        stream_id = stream.tap_stream_id
        return STREAMS[stream_id](
            self.config,
            self.state,
            stream,
            self.client,
            self.logger,
        ).load_data(bookmarks)
    
    def test_connection(self):
        pass


if __name__ == '__main__':
    main(Datadog)