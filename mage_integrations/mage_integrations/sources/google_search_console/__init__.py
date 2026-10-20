from datetime import datetime, timedelta
from mage_integrations.connections.google_search_console import \
    GoogleSearchConsole as GoogleSearchConsoleConnection
from mage_integrations.sources.base import Source, main
from mage_integrations.sources.google_search_console.streams import STREAMS
from mage_integrations.utils.dictionary import merge_dict
from mage_integrations.utils.schema_helpers import extract_selected_columns
from typing import Dict, Generator, List
import singer

LOGGER = singer.get_logger()


class GoogleSearchConsole(Source):
    DATE_FORMAT = '%Y-%m-%d'
    ROW_LIMIT = 1000

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.connection = GoogleSearchConsoleConnection(
            email=self.config.get('email'),
            path_to_credentials_json_file=self.config['path_to_credentials_json_file'],
        )

    def load_data(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = {},
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        stream_name = stream.tap_stream_id

        endpoint_config = STREAMS[stream_name]
        body_params = endpoint_config.get('body', {})

        start_date = self.config.get('start_date')
        if bookmarks is not None and bookmarks.get('date') is not None:
            start_date = datetime.strptime(bookmarks.get('date'), self.DATE_FORMAT)
            start_date += timedelta(days=1)
            start_date = start_date.strftime(self.DATE_FORMAT)

        end_date = datetime.now().strftime(self.DATE_FORMAT)

        site_list = self.config['site_urls'].replace(' ', '').split(',')
        for site in site_list:
            # Skip/ignore sitemaps for domain property sites
            # Reference issue: https://github.com/googleapis/google-api-php-client/issues/1607
            #   "...sitemaps API does not support domain property urls at this time."
            if stream_name == 'sitemaps' and site[0:9] == 'sc-domain':
                LOGGER.info('Skipping Site: {}'.format(site))
                LOGGER.info('  Sitemaps API does not support domain property urls at this time.')

            else:
                # Not sitemaps and sites = sc-domain
                LOGGER.info('STARTED Syncing: {}, Site: {}'.format(stream_name, site))

                columns = extract_selected_columns(stream.metadata)
                dimensions_all = ['date', 'country', 'device', 'page', 'query']
                dimensions = [c for c in columns if c in dimensions_all]
                body_params['dimensions'] = dimensions
                LOGGER.info('stream: {}, dimensions_list: {}'.format(stream_name, dimensions))

                body_params['startDate'] = start_date
                body_params['endDate'] = end_date
                start_row = 0
                body_params['startRow'] = start_row
                body_params['rowLimit'] = self.ROW_LIMIT

                while True:
                    rows_raw = self.connection.load(site, body_params)
                    rows = []
                    if rows_raw is None:
                        break
                    for r in rows_raw:
                        keys = r.pop('keys')
                        r['site_url'] = site
                        rows.append(merge_dict(r, zip(dimensions, keys)))
                    start_row += self.ROW_LIMIT
                    body_params['startRow'] = start_row

                    yield rows

    def get_forced_replication_method(self, stream_id):
        return STREAMS[stream_id]['replication_method']

    def get_table_key_properties(self, stream_id):
        return STREAMS[stream_id]['key_properties']

    def get_valid_replication_keys(self, stream_id):
        return STREAMS[stream_id].get('replication_keys', [])

    def test_connection(self):
        self.connection.connect()


if __name__ == '__main__':
    main(GoogleSearchConsole)
