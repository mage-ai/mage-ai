import asyncio
from collections import defaultdict
from datetime import datetime
from uuid import uuid4

import simplejson
from faster_fifo import Empty
from faster_fifo import Queue as FasterQueue
from tornado.iostream import StreamClosedError

from mage_ai.errors.models import ErrorDetails
from mage_ai.kernels.magic.constants import EventStreamType
from mage_ai.kernels.magic.kernels.manager import KernelManager
from mage_ai.kernels.magic.models import EventStream, ExecutionResult
from mage_ai.kernels.magic.queues.manager import get_execution_result_queue
from mage_ai.server.api.base import BaseHandler
from mage_ai.shared.environments import is_debug
from mage_ai.shared.parsers import encode_complex

SLEEP_SECONDS = 0.05


class EventStreamHandler(BaseHandler):
    active_connections = defaultdict(list)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.uuid = None

    async def get(self, uuid: str) -> None:
        self.__setup(uuid)
        self.__set_headers()

        await self.flush()

        try:
            while True:
                if await self.__invalid_queue():
                    continue

                await self.__dequeue_and_publish_event()
        except StreamClosedError as err:
            print(f'[EventStream:{self.uuid}] Connection closed error: {err}')
        except Exception as err:
            print(f'[EventStream:{self.uuid}] Error: {err}')
        finally:
            self.__handle_disconnect()

    def on_connection_close(self):
        # Call the __handle_disconnect method when the connection is closed
        self.__handle_disconnect()
        super().on_connection_close()

    @property
    def __queue(self) -> FasterQueue:
        return get_execution_result_queue(self.uuid)

    async def __invalid_queue(self) -> bool:
        if self.__queue is None:
            if is_debug():
                print(f'[EventStream:{self.uuid}] Queue is None, sleeping...')

            await asyncio.sleep(SLEEP_SECONDS)
            return True
        return False

    async def __dequeue_and_publish_event(self) -> None:
        if is_debug() and int(datetime.utcnow().timestamp() % 60 == 0):
            print(f'[EventStream:{self.uuid}] Dequeuing messages...')

        try:
            result = self.__queue.get_nowait()  # Non-blocking get
            if result is not None:
                await self.__send_event(result)
                if is_debug():
                    print(f'[EventStream:{self.uuid}] Message dequeued: {result}')
        except Empty:
            await asyncio.sleep(SLEEP_SECONDS)
        except StreamClosedError as err:
            raise err
        except Exception as err:
            await self.__send_event(
                ExecutionResult.load(error=ErrorDetails.from_current_error(err))
            )
            if is_debug():
                print(f'[ERROR:{self.uuid}] Exception during processing: {err}')

    async def __send_event(self, result: ExecutionResult):
        event_stream = self.__build_event_stream(result)
        event_stream_json = simplejson.dumps(
            event_stream,
            default=encode_complex,
            ignore_nan=True,
        )
        self.write(f'data: {event_stream_json}\n\n')

        if is_debug():
            print(f'[StreamEvent:{self.uuid}] Sent: {event_stream_json}')

        try:
            await self.flush()
        except StreamClosedError as err:
            print(f'[WARNING:{self.uuid}] Stream closed during flush: {err}')
        await asyncio.sleep(SLEEP_SECONDS)

    def __build_event_stream(self, result: ExecutionResult) -> EventStream:
        return EventStream.load(
            event_uuid=uuid4().hex,
            result=result,
            timestamp=datetime.utcnow().timestamp() * 1000,
            type=EventStreamType.EXECUTION,
            uuid=self.uuid,
        )

    def __set_headers(self):
        self.set_header('Content-Type', 'text/event-stream')
        self.set_header('Cache-Control', 'no-cache')
        self.set_header('Connection', 'keep-alive')

    def __setup(self, uuid: str) -> None:
        self.uuid = uuid
        self.active_connections[self.uuid].append(self)

    def __handle_disconnect(self):
        if self.uuid is not None and self.uuid in self.active_connections:
            self.active_connections[self.uuid].remove(self)
            if not self.active_connections[self.uuid]:
                del self.active_connections[self.uuid]
                del get_execution_result_queue()[self.uuid]

            KernelManager.terminate_kernel(self.uuid)

            if is_debug():
                print(f'[EventStream:{self.uuid}] Client disconnected.')
        else:
            print('[EventStream] ERROR: Missing UUID on disconnect.')
