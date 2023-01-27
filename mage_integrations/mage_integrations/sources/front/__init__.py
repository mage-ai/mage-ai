from mage_integrations.sources.base import Source, main
from mage_integrations.sources.front.client import Client
from mage_integrations.sources.front.schemas import PK_FIELDS
from mage_integrations.sources.front.streams import fetch_data
from typing import Dict, Generator, List
import datetime
import dateutil


class Front(Source):
    """
    Front API doc: https://dev.frontapp.com/docs
    Analytics API updates: https://dev.frontapp.com/changelog/core-api-analytics-and-exports-updates
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.client = Client(self.config, self.logger)

    def load_data(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = {},
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        metric = stream.tap_stream_id
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
            end_date = dateutil.parser.parse(self.config.get('end_date'))
        else:
            if incremental_range == 'daily':
                end_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif incremental_range == 'hourly':
                end_date = now.replace(minute=0, second=0, microsecond=0)
        self.logger.info('end_date: {} '.format(end_date))

        # if the state file has a date_to_resume, we use it as it is.
        # if it doesn't exist, we overwrite by start date
        s_d = start_date.strftime('%Y-%m-%d %H:%M:%S')
        last_date = dateutil.parser.parse((bookmarks or {}).get('date_to_resume', s_d))
        self.logger.info('last_date: {} '.format(last_date))

        # no real reason to assign this other than the naming
        # makes better sense once we go into the loop
        current_date = last_date

        while current_date <= end_date:
            if incremental_range == 'daily':
                next_date = current_date + datetime.timedelta(days=1, hours=0)
            elif incremental_range == 'hourly':
                next_date = current_date + datetime.timedelta(days=0, hours=1)

            ut_current_date = int(current_date.timestamp())
            self.logger.info('ut_current_date: {} '.format(ut_current_date))
            ut_next_date = int(next_date.timestamp())
            self.logger.info('ut_next_date: {} '.format(ut_next_date))
            yield fetch_data(
                self.client,
                metric,
                incremental_range,
                ut_current_date,
                ut_next_date,
                self.logger,
            )
            current_date = next_date

    def get_table_key_properties(self, stream_id: str) -> List[str]:
        return PK_FIELDS[stream_id]

    def get_valid_replication_keys(self, stream_id: str) -> List[str]:
        return PK_FIELDS[stream_id]

    def test_connection(self):
        pass


if __name__ == '__main__':
    main(Front)
