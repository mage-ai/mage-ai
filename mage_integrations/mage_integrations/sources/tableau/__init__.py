from datetime import datetime
from typing import Dict, Generator, List

import singer

from mage_integrations.sources.base import Source, main
from mage_integrations.sources.constants import REPLICATION_METHOD_INCREMENTAL
from mage_integrations.sources.tableau.client import TableauClient
from mage_integrations.sources.tableau.streams import STREAMS


class Tableau(Source):
    def load_data(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = None,
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        if query is None:
            query = {}

        access_token = self.config.get("access_token")
        base_url = self.config.get("base_url")
        client = TableauClient(
            self.logger,
            access_token,
            base_url,
            self.config.get("request_timeout"),
            self.config.get("user_agent"),
        )
        tap_stream_id = stream.tap_stream_id
        stream_obj = STREAMS[tap_stream_id](client, logger=self.logger)

        bookmarks = bookmarks or dict()
        if REPLICATION_METHOD_INCREMENTAL == stream.replication_method:
            bookmark_datetime = bookmarks.get(
                "updated_at", self.config.get("start_date")
            )
        else:
            bookmark_datetime = None
        if bookmark_datetime is not None:
            if type(bookmark_datetime) is int:
                bookmark_datetime = datetime.fromtimestamp(bookmark_datetime)
            else:
                bookmark_datetime = singer.utils.strptime_to_utc(bookmark_datetime)
        for record in stream_obj.get_records(bookmark_datetime=bookmark_datetime):
            yield [record]

    def get_forced_replication_method(self, stream_id):
        return STREAMS[stream_id].replication_method

    def get_table_key_properties(self, stream_id):
        return STREAMS[stream_id].key_properties

    def get_valid_replication_keys(self, stream_id):
        return STREAMS[stream_id].valid_replication_keys

    def test_connection(self) -> None:
        client = TableauClient(
            self.logger,
            self.config.get("access_token"),
            self.config.get("base_url"),
            self.config.get("request_timeout"),
            self.config.get("user_agent"),
        )
        client.check_access_token()


if __name__ == "__main__":
    main(Tableau)
