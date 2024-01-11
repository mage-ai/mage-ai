from mage_ai.server.websockets.base import BaseHandler
from mage_ai.server.websockets.constants import Channel


class HandlerOne(BaseHandler):
    channel = Channel.TERMINAl
