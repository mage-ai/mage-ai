import json

import tornado.escape
import tornado.web

from mage_ai.lsp.server import get_server
from mage_ai.server.api.base import BaseHandler


class LSPHandler(BaseHandler):
    async def post(self, *args, **kwargs):
        server = get_server()
        payload = tornado.escape.json_decode(self.request.body)
        response = await server.lsp.dispatch_request(payload)
        self.write(json.dumps(response))

    async def get(self, *args, **kwargs):
        server = get_server()
        capabilities = server.feature_capabilities
        self.write(json.dumps(capabilities))
