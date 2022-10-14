from connections.amplitude import Amplitude as AmplitudeConnection
from datetime import datetime, timedelta
from singer import utils
from sources.amplitude.constants import TABLE_KEY_PROPERTIES, VALID_REPLICATION_KEYS
from sources.base import Source
from sources.constants import REPLICATION_METHOD_INCREMENTAL
from typing import List
from utils.array import find_index
import singer

LOGGER = singer.get_logger()


class Amplitude(Source):
    def load_data(
        self,
        bookmarks: dict = None,
        start_date: datetime = None,
        **kwargs,
    ) -> List[dict]:
        connection = AmplitudeConnection(self.config['api_key'], self.config['secret_key'])
        results = connection.load(
            start_date=datetime.now() - timedelta(days=1),
            end_date=datetime.now(),
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
