from connections.amplitude import Amplitude as AmplitudeConnection
from datetime import datetime, timedelta
from singer import utils
from sources.base import Source
from typing import List
import singer

LOGGER = singer.get_logger()


class Amplitude(Source):
    def load_data(self, bookmark: str = None, bookmark_column: str = None, **kwargs) -> List[dict]:
        connection = AmplitudeConnection(self.config['api_key'], self.config['secret_key'])
        results = connection.load(
            start_date=datetime.now() - timedelta(days=1),
            end_date=datetime.now(),
        )

        if bookmark and bookmark_column:
            results = filter(lambda x: x[bookmark_column] > bookmark, results)

        return list(results)

    def get_key_properties(self, stream_id: str) -> List[str]:
        return ['amplitude_id']

    def get_valid_replication_keys(self, stream_id: str) -> List[str]:
        return ['amplitude_id']


@utils.handle_top_exception(LOGGER)
def main():
    args = utils.parse_args([])

    source = Amplitude(
        args.config,
        args.state,
        args.catalog,
        discover_mode=args.discover,
        key_properties=['amplitude_id'],
        replication_key='amplitude_id',
    )
    source.process()

if __name__ == '__main__':
    main()
