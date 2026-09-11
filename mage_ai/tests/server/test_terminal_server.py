from unittest import TestCase
from unittest.mock import MagicMock, PropertyMock, patch

from tornado.websocket import WebSocketClosedError

from mage_ai.server.terminal_server import TerminalWebsocketServer


class TerminalWebsocketServerTest(TestCase):
    @patch.object(TerminalWebsocketServer, 'term_command', new_callable=PropertyMock)
    def test_on_pty_read_ignores_closed_websocket(self, term_command):
        term_command.return_value = 'bash'
        server = MagicMock(spec=TerminalWebsocketServer)
        server.send_json_message.side_effect = WebSocketClosedError()

        TerminalWebsocketServer.on_pty_read(server, 'output')

        server.send_json_message.assert_called_once_with(['stdout', 'output'])

    @patch.object(TerminalWebsocketServer, 'term_command', new_callable=PropertyMock)
    def test_on_pty_read_propagates_other_errors(self, term_command):
        term_command.return_value = 'bash'
        server = MagicMock(spec=TerminalWebsocketServer)
        server.send_json_message.side_effect = RuntimeError('send failed')

        with self.assertRaisesRegex(RuntimeError, 'send failed'):
            TerminalWebsocketServer.on_pty_read(server, 'output')
