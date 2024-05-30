import asyncio
import json
from datetime import datetime
from uuid import uuid4

from tornado.iostream import StreamClosedError

from mage_ai.kernels.magic.queues.results import get_results_queue
from mage_ai.server.api.base import BaseHandler


class ServerSentEventHandler(BaseHandler):
    async def get(self, uuid):
        self.set_header('Content-Type', 'text/event-stream')
        self.set_header('Cache-Control', 'no-cache')
        self.set_header('Connection', 'keep-alive')

        queue = get_results_queue()

        try:
            while True:
                result = None
                if not queue.empty():
                    result = queue.get()
                    print(f'Retrieved from queue: {result}')

                if result:
                    event = json.dumps({
                        'data': result,
                        'event_id': uuid4().hex,
                        'type': 'event',
                        'timestamp': datetime.utcnow().timestamp() * 1000,
                        'uuid': uuid,
                    })
                    self.write(f'data: {event}\n\n')
                    print(f'Sent event: {event}')
                await self.flush()
                await asyncio.sleep(1)
        except StreamClosedError:
            print('Stream closed by client.')
        except Exception as e:
            print(f'Unexpected error: {e}')
