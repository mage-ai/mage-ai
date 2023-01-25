from mage_integrations.sources.base import Source, main
from mage_integrations.sources.paystack.client import PaystackClient
from mage_integrations.sources.paystack.streams import STREAMS
from singer.schema import Schema
from typing import Dict, Generator, List


class Paystack(Source):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.client = PaystackClient(self.config or {})

    def load_data(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = {},
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        tap_stream_id = stream.tap_stream_id
        stream_obj = STREAMS[tap_stream_id](
            self.config,
            self.state,
            stream,
            self.client,
            self.logger
        )

        bookmark_properties = self._get_bookmark_properties_for_stream(stream)
        to_date = query.get('_execution_date')
        return stream_obj.load_data(bookmarks, bookmark_properties, to_date)

    def get_forced_replication_method(self, stream_id):
        return STREAMS[stream_id].REPLICATION_METHOD

    def get_table_key_properties(self, stream_id):
        return STREAMS[stream_id].KEY_PROPERTIES

    def get_valid_replication_keys(self, stream_id):
        return STREAMS[stream_id].VALID_REPLICATION_KEYS

if __name__ == '__main__':
    main(Paystack)
