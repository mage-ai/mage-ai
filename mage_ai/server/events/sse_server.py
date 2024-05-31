import asyncio
from collections import defaultdict
from datetime import datetime
from uuid import uuid4

import simplejson
from faster_fifo import Empty
from tornado.iostream import StreamClosedError

from mage_ai.errors.models import ErrorDetails
from mage_ai.kernels.magic.constants import EventStreamType
from mage_ai.kernels.magic.manager import Manager
from mage_ai.kernels.magic.models import EventStream, ExecutionResult
from mage_ai.kernels.magic.queues.results import get_results_queue
from mage_ai.server.api.base import BaseHandler
from mage_ai.shared.environments import is_debug
from mage_ai.shared.parsers import encode_complex

active_connections = defaultdict(list)


class ServerSentEventHandler(BaseHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.uuid = None

    async def get(self, uuid):
        self.set_header('Content-Type', 'text/event-stream')
        self.set_header('Cache-Control', 'no-cache')
        self.set_header('Connection', 'keep-alive')

        self.uuid = uuid

        if uuid not in active_connections:
            active_connections[uuid] = []
        active_connections[uuid].append(self)

        await self.flush()

        event_stream = None
        result = None
        client_queues = get_results_queue()
        queue = client_queues[uuid]

        try:
            while True:
                if queue is None:
                    if is_debug():
                        print(f'[ServerSentEventHandler:{uuid}] Queue is None, sleeping briefly.')
                    await asyncio.sleep(0.1)
                    continue

                if is_debug():
                    print(f'[StreamEvent:{uuid}] Checking for results in queue...')

                try:
                    result = queue.get_nowait()  # Non-blocking get
                    if result is not None and result.uuid == uuid:
                        if is_debug():
                            print(
                                f'[ServerSentEventHandler:{uuid}] Retrieved from queue: '
                                f'{result}',
                            )

                        event_stream = self.__build_event_stream(uuid, result)
                        await self.send_event(event_stream)
                except Empty:
                    await asyncio.sleep(0.05)
                except StreamClosedError as err:
                    print(f'[WARNING:{uuid}] Stream closed error: {err}')
                    break
                except Exception as err:
                    if is_debug():
                        print(f'[ERROR:{uuid}] Exception during processing: {err}')

                    event_stream = self.__build_event_stream(
                        uuid,
                        ExecutionResult.load(error=ErrorDetails.from_current_error(err)),
                    )
                    await self.send_event(event_stream)
            await asyncio.sleep(0.05)
        except Exception as err:
            print(f'[ERROR:{uuid}] ServerSentEventHandler connection error: {err}')
        finally:
            self.handle_disconnect()

    async def send_event(self, event_stream: EventStream):
        uuid = event_stream.uuid

        event_stream_json = simplejson.dumps(
            event_stream,
            default=encode_complex,
            ignore_nan=True,
        )
        self.write(f'data: {event_stream_json}\n\n')

        if is_debug():
            print(f'[StreamEvent:{uuid}] Sent: {event_stream_json}')

        try:
            await self.flush()
        except StreamClosedError as err:
            print(f'[WARNING:{uuid}] Stream closed during flush: {err}')

    def on_connection_close(self):
        # Call the handle_disconnect method when the connection is closed
        self.handle_disconnect()
        super().on_connection_close()

    def handle_disconnect(self):
        # Your disconnect handling logic here
        uuid = self.uuid or self.get_argument('uuid', None)
        if uuid:
            print(f'[ServerSentEventHandler:{uuid}] Client disconnected.')
            if uuid in active_connections:
                active_connections[uuid].remove(self)
                if not active_connections[uuid]:
                    del active_connections[uuid]
                    del get_results_queue()[uuid]

            Manager.cleanup_resources(uuid=uuid)
        else:
            print('[ServerSentEventHandler] No UUID for handler to disconnect from.')

    def __build_event_stream(self, uuid: str, result: ExecutionResult) -> EventStream:
        return EventStream.load(
            event_uuid=uuid4().hex,
            result=result,
            timestamp=datetime.utcnow().timestamp() * 1000,
            type=EventStreamType.EXECUTION,
            uuid=uuid,
        )
