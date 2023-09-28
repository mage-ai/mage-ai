from azure.eventhub import EventHubConsumerClient
from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sources.base import BaseSource
from typing import Callable, List
import traceback


@dataclass
class AzureEventHubConfig(BaseConfig):
    connection_str: str
    eventhub_name: str
    consumer_group: str = '$Default'


class AzureEventHubSource(BaseSource):
    config_class = AzureEventHubConfig

    def init_client(self):
        self.consumer_client = EventHubConsumerClient.from_connection_string(
            conn_str=self.config.connection_str,
            consumer_group=self.config.consumer_group,
            eventhub_name=self.config.eventhub_name,
        )

    def read(self, handler: Callable):
        try:
            def on_event(partition_context, event):
                self._print(f'Received event from partition: {partition_context.partition_id}.')
                self._print(f'Event: {event}')

                handler(dict(data=event.body_as_str()))

            with self.consumer_client:
                self.consumer_client.receive(
                    on_event=on_event,
                    on_partition_initialize=self.on_partition_initialize,
                    on_partition_close=self.on_partition_close,
                    on_error=self.on_error,
                    starting_position='-1',  # '-1' is from the beginning of the partition.
                )
        except KeyboardInterrupt:
            self._print('Stopped receiving.')

    def batch_read(self, handler: Callable):
        try:
            def on_event_batch(partition_context, event_batch: List):
                if len(event_batch) == 0:
                    return
                self._print(f'Partition {partition_context.partition_id},'
                            f'Received count: {len(event_batch)}')
                self._print(f'Sample event: {event_batch[0]}')

                # Handle events
                try:
                    handler([dict(data=e.body_as_str()) for e in event_batch])
                except Exception as e:
                    traceback.print_exc()
                    raise e

                partition_context.update_checkpoint()

            with self.consumer_client:
                self.consumer_client.receive_batch(
                    on_event_batch=on_event_batch,
                    max_batch_size=100,
                    on_partition_initialize=self.on_partition_initialize,
                    on_partition_close=self.on_partition_close,
                    on_error=self.on_error,
                    starting_position='-1',  # '-1' is from the beginning of the partition.
                )
        except KeyboardInterrupt:
            self._print('Stopped receiving.')

    def test_connection(self):
        return True

    def on_partition_initialize(self, partition_context):
        self._print(f'Partition: {partition_context.partition_id} has been initialized.')

    def on_partition_close(self, partition_context, reason):
        self._print(f'Partition: {partition_context.partition_id} has been closed, '
                    f'reason for closing: {reason}.')

    def on_error(self, partition_context, error):
        if partition_context:
            self._print(f'An exception: {partition_context.partition_id} occurred during'
                        f' receiving from Partition: {error}.')
        else:
            self._print(f'An exception: {error} occurred during the load balance process.')
