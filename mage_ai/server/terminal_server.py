import json
import os
import re

import terminado
from tornado import gen
from tornado.websocket import WebSocketClosedError

from mage_ai.api.utils import authenticate_client_and_token, has_at_least_editor_role
from mage_ai.data_preparation.models.errors import FileNotInProjectError
from mage_ai.data_preparation.models.file import ensure_file_is_in_project
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db.models.oauth import Oauth2Application
from mage_ai.settings import (
    DISABLE_TERMINAL,
    REQUIRE_USER_AUTHENTICATION,
    is_disable_pipeline_edit_access,
)
from mage_ai.shared.array import find_index


class MageTermManager(terminado.NamedTermManager):
    def get_terminal(self, term_name: str, **kwargs):
        assert term_name is not None

        if term_name in self.terminals:
            return self.terminals[term_name]

        if self.max_terminals and len(self.terminals) >= self.max_terminals:
            raise terminado.management.MaxTerminalsReached(self.max_terminals)

        # Create new terminal
        self.log.info("New terminal with specified name: %s", term_name)
        term = self.new_terminal(**kwargs)
        term.term_name = term_name
        self.terminals[term_name] = term
        self.start_reading(term)
        return term


class MageUniqueTermManager(terminado.UniqueTermManager):
    def get_terminal(self, url_component=None, **kwargs):
        if self.max_terminals and len(self.ptys_by_fd) >= self.max_terminals:
            raise terminado.management.MaxTerminalsReached(self.max_terminals)

        term = self.new_terminal(**kwargs)
        self.start_reading(term)
        return term


class TerminalWebsocketServer(terminado.TermSocket):
    @property
    def term_command(self):
        return next(iter(self.term_manager.shell_command))

    def check_origin(self, origin):
        return True

    def on_pty_read(self, text):
        """Data read from pty; send to frontend"""
        if not self._is_authorized():
            self._reject_access()
            return
        updated_text = text
        if self.term_command == 'cmd':
            xterm_escape = re.compile(r'(?:\x1B\]0;).*\x07')
            updated_text = xterm_escape.sub('', text)
        try:
            self.send_json_message(["stdout", updated_text])
        except WebSocketClosedError:
            # The PTY can produce output after the terminal websocket disconnects.
            # This is an expected race during tab closes and network interruptions.
            pass

    def open(self, url_component=None):
        """Websocket connection opened.

        Call our terminal manager to get a terminal, and connect to it as a
        client.
        """
        # Jupyter has a mixin to ping websockets and keep connections through
        # proxies alive. Call super() to allow that to set up:
        super(terminado.TermSocket, self).open(url_component)

        cwd = self.get_argument('cwd', None, True)
        if cwd:
            try:
                ensure_file_is_in_project(cwd)
                if not os.path.exists(cwd):
                    self._logger.warning(
                        f'The specified path {cwd} does not exist in the project directory.')
                    cwd = None
            except FileNotInProjectError:
                self._logger.warning(f'The specified path {cwd} is not in the project directory.')
                cwd = None
            if cwd is None:
                self._logger.warning('Using default path for terminal cwd...')

        term_name = self.get_argument('term_name', None, True)
        term_name = term_name if term_name else 'tty'
        self._logger.info("TermSocket.open: %s", term_name)

        self._requested_term_name = term_name
        self._requested_cwd = cwd
        self._oauth_client_id = None
        self._oauth_token_value = None
        # Clients send credentials in their first message. Do not attach to a PTY or
        # replay its buffer until those credentials have been checked.
        if self._is_authorized():
            self.__initialize_terminal(term_name, cwd=cwd)

    def _is_authorized(self):
        if DISABLE_TERMINAL or is_disable_pipeline_edit_access():
            return False
        if not REQUIRE_USER_AUTHENTICATION:
            return True
        if not self._oauth_client_id or not self._oauth_token_value:
            return False
        oauth_token, valid = authenticate_client_and_token(
            self._oauth_client_id, self._oauth_token_value,
        )
        return bool(
            valid and oauth_token and oauth_token.user and has_at_least_editor_role(
                oauth_token.user, Entity.PROJECT, get_project_uuid(),
            )
        )

    def _reject_access(self):
        try:
            self.send_json_message(['stdout', 'Unauthorized access to the terminal.'])
        except WebSocketClosedError:
            pass
        self.close(code=1008, reason='Unauthorized terminal access')

    @gen.coroutine
    def on_message(self, raw_message):
        try:
            message = json.loads(raw_message)
        except (ValueError, TypeError):
            self.close(code=1008, reason='Invalid terminal message')
            return
        command = message.get('command') if isinstance(message, dict) else None
        if not isinstance(command, list) or len(command) < 2:
            self.close(code=1008, reason='Invalid terminal message')
            return

        # Resolve only the client identifier here; credentials and permissions are
        # checked before terminal creation, attachment, buffer replay, or input.
        api_key = message.get('api_key')
        token = message.get('token')
        self._oauth_client_id = None
        self._oauth_token_value = None
        if REQUIRE_USER_AUTHENTICATION and isinstance(api_key, str) and isinstance(token, str):
            oauth_client = Oauth2Application.query.filter(
                Oauth2Application.client_id == api_key,
            ).first()
            if oauth_client:
                self._oauth_client_id = oauth_client.id
                self._oauth_token_value = token
        if not self._is_authorized():
            self._reject_access()
            return

        if self.terminal is None:
            self.__initialize_terminal(self._requested_term_name, cwd=self._requested_cwd)

        index = find_index(lambda x: x == '__CLEAR_OUTPUT__', command)
        if index >= 0:
            command[index] = r"clear -x && history -c && history -w && clear -x"
        return terminado.TermSocket.on_message(self, json.dumps(command))

    def __initialize_terminal(self, term_name: str, cwd: str = None):
        self.terminal = self.term_manager.get_terminal(term_name, cwd=cwd)
        self.terminal.clients.append(self)

        self.send_json_message(["setup", {}])
        self._logger.info("TermSocket.open: Opened %s", term_name)
        # Now drain the preopen buffer, if reconnect.
        buffered = ""
        preopen_buffer = self.terminal.read_buffer.copy()
        while True:
            if not preopen_buffer:
                break
            s = preopen_buffer.popleft()
            buffered += s
        if buffered:
            self.on_pty_read(buffered)

        # Turn enable-bracketed-paste off since it can mess up the output.
        if self.term_command == 'bash':
            self.terminal.ptyproc.write(
                "bind 'set enable-bracketed-paste off' # Mage terminal settings command\r")
