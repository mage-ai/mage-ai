from mage_integrations.sources.base import Source, main
from mage_integrations.sources.front.client import Client
from mage_integrations.sources.front.schemas import STREAMS
# from mage_integrations.sources.front.streams import fetch_data
from typing import Dict, Generator, List


class Front(Source):
    """
    Front API doc: https://dev.frontapp.com/reference/introduction
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
        stream_id = stream.tap_stream_id
        return STREAMS[stream_id](
            self.client,
            self.config,
            stream,
            self.logger,
        ).load_data(bookmarks)

    def get_table_key_properties(self, stream_id: str) -> List[str]:
        return STREAMS[stream_id].KEY_PROPERTIES

    def get_valid_replication_keys(self, stream_id: str) -> List[str]:
        return STREAMS[stream_id].KEY_PROPERTIES

    def test_connection(self):
        pass


if __name__ == '__main__':
    main(Front)
