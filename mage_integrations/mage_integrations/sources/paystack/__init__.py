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
            self.client
        )

        return stream_obj.load_data()

    def get_forced_replication_method(self, stream_id):
        return STREAMS[stream_id].REPLICATION_METHOD

    def get_table_key_properties(self, stream_id):
        return STREAMS[stream_id].KEY_PROPERTIES

    def get_valid_replication_keys(self, stream_id):
        return STREAMS[stream_id].VALID_REPLICATION_KEYS

    def load_schemas_from_folder(self) -> Dict:
        available_streams = STREAMS.values()
        return {
            stream.TABLE: Schema.from_dict(
                stream(self.config, self.state, None, None).get_schema())
            for stream in available_streams
        }

if __name__ == '__main__':
    main(Paystack)
