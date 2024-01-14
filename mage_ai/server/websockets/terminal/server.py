from mage_ai.server.terminal_server import TerminalWebsocketServer
from mage_ai.server.websockets.base import BaseHandler
from mage_ai.server.websockets.constants import Channel


class Terminal(TerminalWebsocketServer, BaseHandler):
    channel = Channel.TERMINAL
