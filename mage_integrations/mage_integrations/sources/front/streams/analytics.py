from mage_integrations.sources.front.streams.base import BaseStream
from mage_integrations.utils.schema_helpers import extract_selected_columns
from typing import Dict, Generator, List
import datetime
import dateutil
import pytz
import time

MAX_METRIC_JOB_TIME = 1800
METRIC_JOB_POLL_SLEEP = 5


class AnalyticsStream(BaseStream):
    KEY_PROPERTIES = ['start_time']

    URL_PATH = '/accounts'

    def load_data(self, bookmarks: Dict = None) -> Generator[List[Dict], None, None]:
        incremental_range = self.config.get('incremental_range')

        now = datetime.datetime.now()
        start_date = None
        if self.config.get('start_date'):
            start_date = dateutil.parser.parse(self.config.get('start_date'))
        else:
            if incremental_range == 'daily':
                s_d = now.replace(hour=0, minute=0, second=0, microsecond=0)
                start_date = s_d + datetime.timedelta(days=-1, hours=0)
            elif incremental_range == 'hourly':
                s_d = now.replace(minute=0, second=0, microsecond=0)
                start_date = s_d + datetime.timedelta(days=0, hours=-1)
        self.logger.info('start_date: {} '.format(start_date))

        end_date = None
        if self.config.get('end_date'):
            end_date = dateutil.parser.parse(self.config.get('end_date')).replace(tzinfo=pytz.utc)
        else:
            if incremental_range == 'daily':
                end_date = now.replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=pytz.utc)
            elif incremental_range == 'hourly':
                end_date = now.replace(minute=0, second=0, microsecond=0).replace(tzinfo=pytz.utc)
        self.logger.info('end_date: {} '.format(end_date))

        # if the state file has a date_to_resume, we use it as it is.
        # if it doesn't exist, we overwrite by start date
        s_d = start_date.strftime('%Y-%m-%d %H:%M:%S')
        last_date = dateutil.parser.parse((bookmarks or {}).get('start_time', s_d))
        self.logger.info('last_date: {} '.format(last_date))

        # no real reason to assign this other than the naming
        # makes better sense once we go into the loop
        current_date = last_date.replace(tzinfo=pytz.utc)

        columns = extract_selected_columns(self.stream.metadata)
        metrics = [c for c in columns if c not in ['start_time', 'end_time']]

        while current_date < end_date:
            if incremental_range == 'daily':
                next_date = current_date + datetime.timedelta(days=1, hours=0)
            elif incremental_range == 'hourly':
                next_date = current_date + datetime.timedelta(days=0, hours=1)
            yield self.get_metrics(
                metrics,
                current_date,
                next_date,
            )
            current_date = next_date

    def get_metrics(self, metrics: List[str], start_date, end_date):
        ut_start_date = int(start_date.timestamp())
        ut_end_date = int(end_date.timestamp())
        self.logger.info(f'Metrics query - metrics: {metrics} start_date: {start_date} '
                         f'end_date: {end_date} ut_start_date: {ut_start_date} '
                         f'ut_end_date: {ut_end_date}.'
                         )
        response = self.client.post(
            path='/analytics/reports',
            data={
                'start': ut_start_date,
                'end': ut_end_date,
                'metrics': metrics,
            },
        )
        report_link = response['_links']['self']
        start = time.monotonic()
        while True:
            if (time.monotonic() - start) >= MAX_METRIC_JOB_TIME:
                raise Exception(f'Metric job timeout ({MAX_METRIC_JOB_TIME} secs)')
            report = self.client.get(url=report_link)
            progress = report['progress']
            self.logger.info(f'Report progress: {progress}.')
            if progress == 100:
                metrics = {m['id']: m['value'] for m in report['metrics']}
                metrics['start_time'] = start_date
                metrics['end_time'] = end_date
                return [metrics]
            time.sleep(METRIC_JOB_POLL_SLEEP)
