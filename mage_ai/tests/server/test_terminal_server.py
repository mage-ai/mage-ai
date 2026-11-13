import collections
import json
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import MagicMock, PropertyMock, patch

from tornado.testing import AsyncHTTPTestCase, gen_test
from tornado.web import Application
from tornado.websocket import WebSocketClosedError, websocket_connect

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


class TerminalAuthenticationTest(AsyncHTTPTestCase):
    def start_patch(self, patcher):
        result = patcher.start()
        self.addCleanup(patcher.stop)
        return result

    def get_app(self):
        self.connections = []
        self.terminal = SimpleNamespace(
            clients=[], read_buffer=collections.deque(['buffered private output']),
            ptyproc=MagicMock(), resize_to_smallest=MagicMock(),
        )
        self.manager = MagicMock()
        self.manager.shell_command = ['bash']
        self.manager.get_terminal.return_value = self.terminal
        return Application([
            (r'/terminal', TerminalWebsocketServer, {'term_manager': self.manager}),
        ])

    async def connect(self):
        connection = await websocket_connect(
            self.get_url('/terminal?term_name=known-terminal').replace('http://', 'ws://'),
        )
        self.connections.append(connection)
        return connection

    def tearDown(self):
        for connection in self.connections:
            connection.close()
        super().tearDown()

    def configure_auth(self, valid=True, editor=True):
        self.start_patch(patch('mage_ai.server.terminal_server.REQUIRE_USER_AUTHENTICATION', True))
        self.start_patch(patch('mage_ai.server.terminal_server.DISABLE_TERMINAL', False))
        self.start_patch(patch(
            'mage_ai.server.terminal_server.is_disable_pipeline_edit_access', return_value=False,
        ))
        client = self.start_patch(patch('mage_ai.server.terminal_server.Oauth2Application'))
        client.query.filter.return_value.first.return_value = SimpleNamespace(id=1)
        self.authentication = self.start_patch(patch(
            'mage_ai.server.terminal_server.authenticate_client_and_token',
            return_value=(SimpleNamespace(user=SimpleNamespace(id=1)), valid),
        ))
        self.start_patch(patch(
            'mage_ai.server.terminal_server.has_at_least_editor_role', return_value=editor,
        ))
        self.start_patch(patch(
            'mage_ai.server.terminal_server.get_project_uuid', return_value='test',
        ))

    @gen_test
    async def test_open_does_not_attach_before_authentication(self):
        self.configure_auth()
        await self.connect()
        self.manager.get_terminal.assert_not_called()
        self.assertEqual(self.terminal.clients, [])

    @gen_test
    async def test_unauthenticated_client_cannot_receive_buffered_output(self):
        self.configure_auth()
        connection = await self.connect()
        connection.write_message(json.dumps({'command': ['stdin', 'secret-command']}))
        response = json.loads(await connection.read_message())
        if response[0] == 'setup':
            response = json.loads(await connection.read_message())
        self.assertEqual(response, ['stdout', 'Unauthorized access to the terminal.'])
        self.assertIsNone(await connection.read_message())
        self.manager.get_terminal.assert_not_called()
        self.assertEqual(self.terminal.clients, [])

    @gen_test
    async def test_invalid_token_cannot_attach(self):
        self.configure_auth(valid=False)
        connection = await self.connect()
        connection.write_message(json.dumps({
            'api_key': 'client', 'token': 'invalid', 'command': ['set_size', 24, 80],
        }))
        response = json.loads(await connection.read_message())
        self.assertIn('Unauthorized', response[1])
        self.manager.get_terminal.assert_not_called()

    @gen_test
    async def test_viewer_cannot_attach(self):
        self.configure_auth(editor=False)
        connection = await self.connect()
        connection.write_message(json.dumps({
            'api_key': 'client', 'token': 'valid', 'command': ['set_size', 24, 80],
        }))
        response = json.loads(await connection.read_message())
        self.assertIn('Unauthorized', response[1])
        self.manager.get_terminal.assert_not_called()

    @gen_test
    async def test_editor_can_attach_and_receive_buffer_after_authentication(self):
        self.configure_auth()
        connection = await self.connect()
        connection.write_message(json.dumps({
            'api_key': 'client', 'token': 'valid', 'command': ['set_size', 24, 80],
        }))
        self.assertEqual(json.loads(await connection.read_message()), ['setup', {}])
        self.assertEqual(json.loads(await connection.read_message()),
                         ['stdout', 'buffered private output'])
        self.manager.get_terminal.assert_called_once_with('known-terminal', cwd=None)
        self.terminal.resize_to_smallest.assert_called()
        self.assertEqual(len(self.terminal.clients), 1)
        self.authentication.return_value = (None, False)
        self.terminal.clients[0]._authorization_valid_until = 0
        self.terminal.clients[0].on_pty_read('new private output')
        self.assertIn('Unauthorized', json.loads(await connection.read_message())[1])
        self.assertIsNone(await connection.read_message())

    @gen_test
    async def test_output_reuses_authorization_for_a_bounded_interval(self):
        self.configure_auth()
        connection = await self.connect()
        connection.write_message(json.dumps({
            'api_key': 'client', 'token': 'valid', 'command': ['set_size', 24, 80],
        }))
        self.assertEqual(json.loads(await connection.read_message()), ['setup', {}])
        self.assertEqual(json.loads(await connection.read_message()),
                         ['stdout', 'buffered private output'])

        authentication_calls = self.authentication.call_count
        client = self.terminal.clients[0]
        client.on_pty_read('first output')
        client.on_pty_read('second output')

        self.assertEqual(json.loads(await connection.read_message()),
                         ['stdout', 'first output'])
        self.assertEqual(json.loads(await connection.read_message()),
                         ['stdout', 'second output'])
        self.assertEqual(self.authentication.call_count, authentication_calls)

    @gen_test
    async def test_disabled_terminal_does_not_spawn_or_replay(self):
        self.configure_auth()
        self.start_patch(patch('mage_ai.server.terminal_server.DISABLE_TERMINAL', True))
        connection = await self.connect()
        connection.write_message(json.dumps({'command': ['stdin', 'ignored']}))
        self.assertIn('Unauthorized', json.loads(await connection.read_message())[1])
        self.manager.get_terminal.assert_not_called()

    @gen_test
    async def test_no_auth_mode_preserves_initial_setup(self):
        self.configure_auth()
        self.start_patch(patch('mage_ai.server.terminal_server.REQUIRE_USER_AUTHENTICATION', False))
        connection = await self.connect()
        self.assertEqual(json.loads(await connection.read_message()), ['setup', {}])
        self.assertEqual(json.loads(await connection.read_message()),
                         ['stdout', 'buffered private output'])
        self.manager.get_terminal.assert_called_once()

    @gen_test
    async def test_pipeline_edit_lock_does_not_spawn_or_replay(self):
        self.configure_auth()
        self.start_patch(patch(
            'mage_ai.server.terminal_server.is_disable_pipeline_edit_access', return_value=True,
        ))
        connection = await self.connect()
        connection.write_message(json.dumps({
            'api_key': 'client', 'token': 'valid', 'command': ['set_size', 24, 80],
        }))
        self.assertIn('Unauthorized', json.loads(await connection.read_message())[1])
        self.manager.get_terminal.assert_not_called()

    @gen_test
    async def test_malformed_message_does_not_spawn(self):
        self.configure_auth()
        connection = await self.connect()
        connection.write_message(json.dumps({'command': []}))
        self.assertIsNone(await connection.read_message())
        self.manager.get_terminal.assert_not_called()
