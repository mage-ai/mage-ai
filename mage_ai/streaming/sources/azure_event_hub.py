from azure.eventhub import EventHubConsumerClient
from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sources.base import BaseSource


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

    def read(self):
        try:
            def on_event(partition_context, event):
                print("Received event from partition: {}.".format(partition_context.partition_id))
                yield event

            with self.consumer_client:
                self.consumer_client.receive(
                    on_event=on_event,
                    on_partition_initialize=self.on_partition_initialize,
                    on_partition_close=self.on_partition_close,
                    on_error=self.on_error,
                    starting_position="-1",  # "-1" is from the beginning of the partition.
                )
        except KeyboardInterrupt:
            print('Stopped receiving.')

    def batch_read(self):
        def on_event_batch(partition_context, event_batch):
            print("Partition {}, Received count: {}".format(partition_context.partition_id, len(event_batch)))
            # put your code here
            yield event_batch
            partition_context.update_checkpoint()

        with self.consumer_client:
            self.consumer_client.receive_batch(
                on_event_batch=on_event_batch,
                max_batch_size=100,
                starting_position="-1",  # "-1" is from the beginning of the partition.
            )

    def test_connection(self):
        return True

    def on_partition_initialize(partition_context):
        # Put your code here.
        print("Partition: {} has been initialized.".format(partition_context.partition_id))

    def on_partition_close(partition_context, reason):
        # Put your code here.
        print("Partition: {} has been closed, reason for closing: {}.".format(
            partition_context.partition_id,
            reason
        ))

    def on_error(partition_context, error):
        # Put your code here. partition_context can be None in the on_error callback.
        if partition_context:
            print("An exception: {} occurred during receiving from Partition: {}.".format(
                partition_context.partition_id,
                error
            ))
        else:
            print("An exception: {} occurred during the load balance process.".format(error))
