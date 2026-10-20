from mage_integrations.sources.base import Source, main
from mage_integrations.sources.datadog.client import DatadogClient
from mage_integrations.sources.datadog.streams import (
    AuditLogs,
    Dashboards,
    Downtimes,
    IncidentTeams,
    Incidents,
    Logs,
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
    # 'metrics': Metrics,
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
        stream_obj = STREAMS[stream_id](
            self.config,
            self.state,
            stream,
            self.client,
            self.logger,
        )
        bookmark_properties = self._get_bookmark_properties_for_stream(stream)
        to_date = query.get('_execution_date')
        return stream_obj.load_data(bookmarks, bookmark_properties, to_date)


if __name__ == '__main__':
    main(Datadog)
