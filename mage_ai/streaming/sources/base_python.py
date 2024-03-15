from typing import Callable

from mage_ai.streaming.sources.base import BaseSource


class BasePythonSource(BaseSource):
    def __init__(self, **kwargs):
        """
        Not require config in the python source
        """
        super().__init__(None, **kwargs)

    def init_client(self):
        """
        Intialize the client for the source.
        """

    def read(self, handler: Callable):
        """
        Read the message from the source and use handler to process the message.

        This method only needs to be implemented when consume_method is 'READ'.
        """

    def batch_read(self, handler: Callable):
        """
        Batch read the messages from the source and use handler to process the messages.

        This method only needs to be implemented when consume_method is 'BATCH_READ'.
        """
