from mage_ai.streaming.sources.base_python import BasePythonSource
from typing import Callable

if 'streaming_source' not in globals():
    from mage_ai.data_preparation.decorators import streaming_source


@streaming_source
class CustomSource(BasePythonSource):
    def init_client(self):
        """
        Implement the logic of initializing the client.
        """

    def batch_read(self, handler: Callable):
        """
        Batch read the messages from the source and use handler to process the messages.
        """
        while True:
            records = []
            # Implement the logic of fetching the records
            if len(records) > 0:
                handler(records)
