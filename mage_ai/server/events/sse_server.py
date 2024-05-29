import asyncio
import json
import random
from datetime import datetime
from uuid import uuid4

from tornado.iostream import StreamClosedError

from mage_ai.server.api.base import BaseHandler


class ServerSentEventHandler(BaseHandler):
    async def get(self, uuid: str):
        self.set_header('Content-Type', 'text/event-stream')
        self.set_header('Cache-Control', 'no-cache')
        self.set_header('Connection', 'keep-alive')

        try:
            while True:
                event = json.dumps({
                    'data': random.randint(1, 100),
                    'event_id': uuid4().hex,
                    'type': 'event',
                    'timestamp': datetime.utcnow().timestamp() * 1000,
                    'uuid': uuid,
                })
                self.write(f'data: {event}\n\n')
                await self.flush()
                await asyncio.sleep(1)
        except StreamClosedError:
            pass  # Client disconnected, stop the loop
