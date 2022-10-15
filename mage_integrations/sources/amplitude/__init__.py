from datetime import datetime, timedelta
from mage_integrations.connections.amplitude import Amplitude as AmplitudeConnection
from mage_integrations.sources.amplitude.constants import TABLE_KEY_PROPERTIES, VALID_REPLICATION_KEYS
from mage_integrations.sources.base import Source
from mage_integrations.sources.constants import REPLICATION_METHOD_INCREMENTAL
from mage_integrations.sources.query import (
    get_end_date,
    get_execution_date,
    get_execution_partition,
    get_start_date,
)
from mage_integrations.utils.array import find_index
from singer import utils
from typing import Dict, List
import dateutil.parser
import singer

LOGGER = singer.get_logger()


class Amplitude(Source):
    def load_data(
        self,
        bookmarks: Dict = None,
        query: Dict = {},
        **kwargs,
    ) -> List[Dict]:
        connection = AmplitudeConnection(
            self.config['api_key'],
            self.config['secret_key'],
        )

        today = datetime.utcnow()
        start_date = today - timedelta(days=1)
        end_date = today

        start_date_string = query.get('start_date') or get_start_date(query)
        if start_date_string:
            start_date = dateutil.parser.parse(start_date_string)

        end_date_string = query.get('end_date') or get_end_date(query)
        if end_date_string:
            end_date = dateutil.parser.parse(end_date_string)

        results = connection.load(
            start_date=start_date,
            end_date=end_date,
        )

        if bookmarks:
            index = find_index(
                lambda x: all([str(x[col]) == str(val) for col, val in bookmarks.items()]),
                results,
            )
            if index >= 0:
                results = results[index + 1:]

        return list(results)

    def get_forced_replication_method(self, stream_id):
        return REPLICATION_METHOD_INCREMENTAL

    def get_table_key_properties(self, stream_id):
        return TABLE_KEY_PROPERTIES[stream_id]

    def get_valid_replication_keys(self, stream_id):
        return VALID_REPLICATION_KEYS[stream_id]

@utils.handle_top_exception(LOGGER)
def main():
    source = Amplitude()
    source.process()

if __name__ == '__main__':
    main()
