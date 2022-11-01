from datetime import datetime
from mage_integrations.connections.google_search_console import \
    GoogleSearchConsole as GoogleSearchConsoleConnection
from mage_integrations.sources.base import Source, main
from mage_integrations.sources.google_search_console.streams import STREAMS
from mage_integrations.utils.dictionary import merge_dict
from mage_integrations.utils.schema_helpers import extract_selected_columns
from typing import Dict, List
import singer

LOGGER = singer.get_logger()


class GoogleSearchConsole(Source):
    def load_data(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = {},
        **kwargs,
    ) -> List[Dict]:
        stream_name = stream.tap_stream_id

        connection = GoogleSearchConsoleConnection(
            path_to_credentials_json_file=self.config['path_to_credentials_json_file'],
        )
        results = []

        endpoint_config = STREAMS[stream_name]
        body_params = endpoint_config.get('body', {})
        start_date = self.config.get('start_date')
        end_date = datetime.now().strftime('%Y-%m-%d')

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

                body_params['start_date'] = start_date
                body_params['end_date'] = end_date

                rows = connection.load(site, body_params)
                for r in rows:
                    keys = r.pop('keys')
                    r['site_url'] = site
                    results.append(merge_dict(r, zip(dimensions, keys)))
        return results

    def get_forced_replication_method(self, stream_id):
        return STREAMS[stream_id]['replication_method']

    def get_table_key_properties(self, stream_id):
        return STREAMS[stream_id]['key_properties']

    def get_valid_replication_keys(self, stream_id):
        return STREAMS[stream_id].get('replication_keys', [])


if __name__ == '__main__':
    main(GoogleSearchConsole)
