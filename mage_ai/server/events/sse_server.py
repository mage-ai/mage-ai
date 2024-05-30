import asyncio
from datetime import datetime
from uuid import uuid4

import simplejson
from tornado.iostream import StreamClosedError

from mage_ai.errors.models import ErrorDetails
from mage_ai.kernels.magic.constants import EventStreamType
from mage_ai.kernels.magic.models import EventStream, ExecutionResult
from mage_ai.kernels.magic.queues.results import get_results_queue
from mage_ai.server.api.base import BaseHandler
from mage_ai.shared.environments import is_debug
from mage_ai.shared.parsers import encode_complex


class ServerSentEventHandler(BaseHandler):
    async def get(self, uuid):
        self.set_header('Content-Type', 'text/event-stream')
        self.set_header('Cache-Control', 'no-cache')
        self.set_header('Connection', 'keep-alive')

        await self.flush()

        queue = get_results_queue()

        while True:
            event_stream = None
            try:
                execution_result = None
                if not queue.empty():
                    execution_result = queue.get()
                    if is_debug():
                        print(f'Retrieved from queue: {execution_result}')

                if execution_result:
                    event_stream = self.__build_event_stream(execution_result, uuid)
            except StreamClosedError as err:
                print(f'[ERROR] ServerSentEventHandler Stream closed error: {err}')
                break
            except Exception as err:
                event_stream = self.__build_event_stream(
                    ExecutionResult.load(error=ErrorDetails.from_current_error(err)), uuid
                )

            if event_stream is not None:
                event_stream_json = simplejson.dumps(
                    event_stream,
                    default=encode_complex,
                    ignore_nan=True,
                )

                self.write(f'data: {event_stream_json}\n\n')
                await self.flush()

                if is_debug():
                    print(f'Sent event: {event_stream_json}')

            await asyncio.sleep(0)

    def __build_event_stream(self, execution_result: ExecutionResult, uuid: str) -> EventStream:
        return EventStream.load(
            event_uuid=uuid4().hex,
            result=execution_result,
            timestamp=datetime.utcnow().timestamp() * 1000,
            type=EventStreamType.EXECUTION,
            uuid=uuid,
        )
