
import asyncio

import singer
import requests
import urllib
from singer.bookmarks import write_bookmark, get_bookmark
from datetime import datetime
import time
from dateutil.relativedelta import *

LOGGER = singer.get_logger()

class DatadogAuthentication(requests.auth.AuthBase):
    def __init__(self, api_token: str, application_key: str):
        self.api_token = api_token
        self.application_token = application_key


class DatadogClient:

    def __init__(self, auth: DatadogAuthentication, url="https://api.datadoghq.com/api/v1/usage/"):
        self._base_url = url
        self._auth = auth
        self._session = None

    @property
    def session(self):
        if not self._session:
            self._session = requests.Session()
            self._session.headers.update({"Accept": "application/json"})
            self._session.headers.update({"DD-API-KEY": self._auth.api_token})
            self._session.headers.update({"DD-APPLICATION-KEY": self._auth.application_token})

        return self._session

    def _get(self, path, params=None, data=None):
        for _ in range(0, 3):  # 3 attempts
            url = self._base_url + path
            response = self.session.get(url, params=data)
            if response.status_code == 429:
                time_to_reset = response.headers.get('X-RateLimit-Reset', time.time() + 60)
                time.sleep(float(time_to_reset ) + 60)
                continue
            else:
                response.raise_for_status()
                return response

    def hourly_request(self, state, config, query, stream): # manage start date condition if more than 2 months
        try:
            bookmark = get_bookmark(state, stream, "since")
            if bookmark:
                start_date = bookmark
            else:
                start_date = config['start_hour']

            # date can't be more than two months otherwise datadog fail
            min_date = (datetime.today() + relativedelta(months=-2) + relativedelta(days=1)).strftime('%Y-%m-%dT%H')
            if start_date < min_date:
                start_date = min_date
            # also being too current get some partial data for the days, so we always have to go back a little bit to refresh
            max_date = (datetime.today() + relativedelta(days=-5)).strftime('%Y-%m-%dT%H')
            if start_date > max_date:
                start_date = max_date

            if start_date != datetime.utcnow().strftime('%Y-%m-%dT%H'):
                data = {'start_hr': start_date, 'end_hr': datetime.utcnow().strftime('%Y-%m-%dT%H')}
                traces = self._get(query,  data=data)
                return traces.json()
            else:
                return None
        except Exception as error:
            LOGGER.error(error)
            return None

            

    def top_avg_metrics(self, start_date):
        try:
            data = {'month': start_date}
            query = f"top_avg_metrics" 
            metrics = self._get(query,  data=data)
            return metrics.json()
        except:
            return None
        

class DatadogSync:
    def __init__(self, client: DatadogClient, state={}, config={}):
        self._client = client
        self._state = state
        self._config = config

    @property
    def client(self):
        return self._client

    @property
    def state(self):
        return self._state

    @property
    def config(self):
        return self._config

    @state.setter
    def state(self, value):
        singer.write_state(value)
        self._state = value

    def sync(self, stream, schema):
        func = getattr(self, f"sync_{stream}")
        return func(schema)

    async def sync_logs(self, schema):
        """Get hourly usage for logs."""
        stream = "logs"
        loop = asyncio.get_event_loop()
        singer.write_schema(stream, schema, ["hour", "account"])
        logs = await loop.run_in_executor(None, self.client.hourly_request, self.state, self.config, f"logs", stream)
        if logs:
            for log in logs['usage']:
                log['account'] = self.config['account']
                singer.write_record(stream, log)
            if logs['usage'] is not None and len(logs['usage'])>0:
                self.state = write_bookmark(self.state, stream, "since", logs['usage'][len(logs['usage'])-1]['hour'])

    async def sync_custom_usage(self, schema):
        """Get hourly usage for custom metric."""
        stream = "custom_usage"
        loop = asyncio.get_event_loop()
        singer.write_schema(stream, schema, ["hour", "account"])
        custom_usage = await loop.run_in_executor(None, self.client.hourly_request, self.state, self.config, f"timeseries", stream)
        if custom_usage:
            for c in custom_usage['usage']:
                c['account'] = self.config['account']
                singer.write_record(stream, c)
            if custom_usage['usage'] is not None and len(custom_usage['usage'])>0:
                self.state = write_bookmark(self.state, stream, "since", custom_usage['usage'][len(custom_usage['usage'])-1]['hour'])

    async def sync_fargate(self, schema):
        stream = "fargate"
        loop = asyncio.get_event_loop()
        singer.write_schema(stream, schema, ["hour", "account"])
        fargates = await loop.run_in_executor(None, self.client.hourly_request, self.state, self.config, f"fargate", stream)
        if fargates:
            for fargate in fargates['usage']:
                fargate['account'] = self.config['account']
                singer.write_record(stream, fargate)
            if fargates['usage'] is not None and len(fargates['usage'])>0:
                self.state = write_bookmark(self.state, stream, "since", fargates['usage'][len(fargates['usage'])-1]['hour'])

    async def sync_hosts_and_containers(self, schema):
        stream = "hosts_and_containers"
        loop = asyncio.get_event_loop()
        singer.write_schema(stream, schema, ["hour", "account"])
        hosts = await loop.run_in_executor(None, self.client.hourly_request, self.state, self.config, f"hosts", stream)
        if hosts:
            for host in hosts['usage']:
                host['account'] = self.config['account']
                singer.write_record(stream, host)
            if hosts['usage'] is not None and len(hosts['usage'])>0:
                self.state = write_bookmark(self.state, stream, "since", hosts['usage'][len(hosts['usage'])-1]['hour'])

    async def sync_synthetics(self, schema):
        stream = "synthetics"
        loop = asyncio.get_event_loop()
        singer.write_schema(stream, schema, ["hour", "account"])
        synthetics = await loop.run_in_executor(None, self.client.hourly_request, self.state, self.config, f"synthetics", stream)
        if synthetics:
            for synthetic in synthetics['usage']:
                synthetic['account'] = self.config['account']
                singer.write_record(stream, synthetic)
            if synthetics['usage'] is not None and len(synthetics['usage']) > 0:
                self.state = write_bookmark(self.state, stream, "since", synthetics['usage'][len(synthetics['usage'])-1]['hour'])

    async def sync_top_average_metrics(self, schema):
        stream = "top_average_metrics"
        loop = asyncio.get_event_loop()
        bookmark = get_bookmark(self.state, "top_average_metrics", "since")
        if bookmark:
            start_date = urllib.parse.quote(bookmark)
        else:
            start_date = self.config['start_month']
        today = datetime.today()
        end_date = datetime(today.year, today.month, 1)
        month_data = datetime.strptime(start_date, '%Y-%m')
        singer.write_schema(stream, schema, ["month", "metric_name", "account"])
        while month_data <= end_date:
            month_str =datetime.strftime(month_data, '%Y-%m')
            date_str =datetime.strftime(month_data, '%Y-%m-%d')
            top_average_metrics = await loop.run_in_executor(None, self.client.top_avg_metrics, month_str)
            if top_average_metrics:
                for t in top_average_metrics['usage']:
                    t["month"] = date_str
                    t['account'] = self.config['account']
                    singer.write_record(stream, t)
                self.state = write_bookmark(self.state, stream, "since", month_str)
                month_data = month_data + relativedelta(months=+1)                

    async def sync_trace_search(self, schema):
        stream = "trace_search"
        loop = asyncio.get_event_loop()
        singer.write_schema(stream, schema, ["hour", "account"])
        trace_search = await loop.run_in_executor(None, self.client.hourly_request, self.state, self.config, f"traces", stream)
        if trace_search:
            for trace in trace_search['usage']:
                trace['account'] = self.config['account']
                singer.write_record(stream, trace)

            if trace_search['usage'] is not None and len(trace_search['usage']) > 0:
                self.state = write_bookmark(self.state, stream, "since", trace_search['usage'][len(trace_search['usage'])-1]['hour'])

