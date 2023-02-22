from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from dateutil.parser import parse
from mage_integrations.sources.datadog.client import DatadogClient
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Optional, Union
import os
import pytz
import requests
import singer

DEFAULT_MAX_RECORDS = 100

class DatadogStream:
    """
    Datadog API Reference: https://docs.datadoghq.com/api/latest/
    """

    primary_key: Optional[str] = None
    parse_response_root: Optional[str] = None

    BASE_PATH = 'https://api.datadoghq.com/api/'
    URL_PATH = ''

    def __init__(self, config, state, catalog, client: DatadogClient, logger):
        self.config = config
        self.state = state
        self.catalog = catalog
        self.client = client
        self.logger = logger

        self.max_records_per_request = DEFAULT_MAX_RECORDS

    def get_url(self) -> str:
        """
        Return the URL to hit for data from this stream.
        """
        return f'{self.BASE_PATH}{self.URL_PATH}'
    
    def load_data(
        self,
        bookmarks: Dict = None,
        bookmark_properties: List = None,
        to_date: str = None
    ):
        table = self.TABLE
        done = False
        bookmark_date = None

        # Attempt to get the bookmark date from the state file (if one exists and is supplied).
        self.logger.info(
            f'Attempting to get the most recent bookmark_date for entity {self.ENTITY}.')
        if bookmarks and bookmark_properties:
            bookmark_date = bookmarks.get(bookmark_properties[0])

        # If there is no bookmark date, fall back to using the start date from the config file.
        if bookmark_date is None:
            self.logger.info(
                'Could not locate bookmark_date from STATE file. '
                'Falling back to start_date from config.json instead.'
            )
            if 'start_date' in self.config:
                bookmark_datetime = parse(self.config.get('start_date'))
            else:
                bookmark_datetime = datetime.now(pytz.utc) - timedelta(weeks=4)
            bookmark_date = bookmark_datetime.strftime('%Y-%m-%dT%H:%M:%SZ')

        if to_date is None:
            to_datetime = datetime.now(pytz.utc)
            to_date = to_datetime.strftime('%Y-%m-%dT%H:%M:%SZ')
        sync_window = str([bookmark_date, to_date])
        self.logger.info(f'Sync Window {sync_window} for schema {table}')

        params = {'from': bookmark_date, 'to': to_date}

        self.logger.info(f'Querying {table} starting at {bookmark_date}')

        while not done:
            max_date = to_date

            response = self.make_request(params)

            yield self.parse_response(response)

            next_page_token = self.next_page_token(response)
            if next_page_token:
                params.update(next_page_token)
            else:
                done = True
            bookmark_date = max_date

    def make_request(self, params):
        return self.client.make_request(
            url=self.get_url(),
            method=self.API_METHOD,
            params=params
        )

    def next_page_token(self, response: Dict):
        return None

    def parse_response(self, response):
        records = response if not self.parse_response_root else response.get(self.parse_response_root, [])
        return [self.transform_record(r) for r in records]

    def transform_record(self, record):
        return record


class Dashboards(DatadogStream):
    """
    https://docs.datadoghq.com/api/latest/dashboards/#get-all-dashboards
    """
    TABLE = 'dashboards'
    ENTITY = 'dashboard'
    API_METHOD = 'GET'
    SCHEMA = 'dashboards'
    URL_PATH = 'v1/dashboard'

    parse_response_root: Optional[str] = "dashboards"


class Downtimes(DatadogStream):
    """
    https://docs.datadoghq.com/api/latest/downtimes/#get-all-downtimes
    """
    TABLE = 'downtimes'
    ENTITY = 'downtime'
    API_METHOD = 'GET'
    SCHEMA = 'downtimes'
    URL_PATH = 'v1/downtime'


class SyntheticTests(DatadogStream):
    """
    https://docs.datadoghq.com/api/latest/synthetics/#get-the-list-of-all-tests
    """
    TABLE = 'synthetic_tests'
    ENTITY = 'synthetic_test'
    API_METHOD = 'GET'
    SCHEMA = 'synthetics'
    URL_PATH = 'v1/synthetics/tests'

    parse_response_root: Optional[str] = 'tests'


class IncrementalSearchableStream(DatadogStream):
    API_METHOD = 'POST'
    KEY_PROPERTIES = ['id']

    parse_response_root: Optional[str] = "data"

    def __init__(self, config, state, catalog, client: DatadogClient, logger):
        super().__init__(config, state, catalog, client, logger)
        self._cursor_value = ""

    def next_page_token(self, response: Dict) -> Optional[Mapping[str, Any]]:
        cursor = response.get("meta", {}).get("page", {}).get("after")
        if not cursor:
            return {}
        else:
            return {
                'cursor': cursor
            }
        
    def make_request(self, params):
        return self.client.make_request(
            url=self.get_url(),
            method=self.API_METHOD,
            body=self.get_payload(**params)
        )

    def get_payload(self, cursor=None, **kwargs) -> Mapping[str, Any]:
        query = self.config.get('query', {}).get(self.TABLE)
        if query:
            kwargs['query'] = query
        payload = {
            "filter": kwargs,
            "page": {"limit": self.max_records_per_request},
        }
        if cursor:
            payload["page"]["cursor"] = cursor

        return payload


class AuditLogs(IncrementalSearchableStream):
    """
    https://docs.datadoghq.com/api/latest/audit/#search-audit-logs-events
    """
    TABLE = 'audit_logs'
    ENTITY = 'audit_log'
    API_METHOD = 'POST'
    SCHEMA = 'audit_logs'
    URL_PATH = 'v2/audit/events/search'


class Logs(IncrementalSearchableStream):
    """
    https://docs.datadoghq.com/api/latest/logs/#search-logs
    """
    TABLE = 'logs'
    ENTITY = 'log'
    API_METHOD = 'POST'
    SCHEMA = 'logs'
    URL_PATH = 'v2/logs/events/search'


class BasedListStream(DatadogStream):
    API_METHOD = 'GET'
    parse_response_root: Optional[str] = "data"


class Metrics(BasedListStream):
    """
    https://docs.datadoghq.com/api/latest/metrics/#get-a-list-of-metrics
    """
    TABLE = 'metrics'
    ENTITY = 'metric'
    API_METHOD = 'GET'
    SCHEMA = 'metrics'
    URL_PATH = 'v2/metrics?window[seconds]=1209600'  # max value allowed (2 weeks)


class PaginatedBasedListStream(BasedListStream):
    primary_key: Optional[str] = "id"

    def next_page_token(self, response: Dict) -> Optional[Mapping[str, Any]]:
        next_offset = response.get("meta", {}).get("pagination", {}).get("next_offset", -1)
        current_offset = response.get("meta", {}).get("pagination", {}).get("offset", -1)
        next_page_token = {}
        if next_offset != current_offset:
            next_page_token = {"page[offset]": next_offset}
        return next_page_token


class Incidents(PaginatedBasedListStream):
    """
    https://docs.datadoghq.com/api/latest/incidents/#get-a-list-of-incidents
    """
    TABLE = 'incidents'
    ENTITY = 'incident'
    API_METHOD = 'GET'
    SCHEMA = 'incidents'
    URL_PATH = 'v2/incidents'


class IncidentTeams(PaginatedBasedListStream):
    """
    https://docs.datadoghq.com/api/latest/incident-teams/#get-a-list-of-all-incident-teams
    """
    TABLE = 'incident_teams'
    ENTITY = 'incident_team'
    API_METHOD = 'GET'
    SCHEMA = 'incident_teams'
    URL_PATH = 'v2/teams'


class Users(PaginatedBasedListStream):
    """
    https://docs.datadoghq.com/api/latest/users/#list-all-users
    """
    TABLE = 'users'
    ENTITY = 'user'
    API_METHOD = 'GET'
    SCHEMA = 'users'
    URL_PATH = 'v2/users'

    current_page = 0

    def next_page_token(self, response: Dict) -> Optional[Mapping[str, Any]]:
        next_page_token = {}
        if len(response.get("data", [])) > 0:
            self.current_page += 1
            next_page_token = {"page[number]": self.current_page}
        return next_page_token
