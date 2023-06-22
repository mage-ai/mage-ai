import json
import re

import terminado
from tornado import gen

from mage_ai.api.utils import authenticate_client_and_token, has_at_least_editor_role
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.orchestration.db.models.oauth import Oauth2Application, Permission
from mage_ai.settings import (
    REQUIRE_USER_AUTHENTICATION,
    is_disable_pipeline_edit_access,
)


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
        updated_text = text
        if self.term_command == 'cmd':
            xterm_escape = re.compile(r'(?:\x1B\]0;).*\x07')
            updated_text = xterm_escape.sub('', text)
        self.send_json_message(["stdout", updated_text])

    def open(self, url_component=None):
        """Websocket connection opened.

        Call our terminal manager to get a terminal, and connect to it as a
        client.
        """
        # Jupyter has a mixin to ping websockets and keep connections through
        # proxies alive. Call super() to allow that to set up:
        super(terminado.TermSocket, self).open(url_component)
        api_key = self.get_argument('api_key', None, True)
        token = self.get_argument('token', None, True)

        cwd = self.get_argument('cwd', None, True)
        term_name = self.get_argument('term_name', None, True)

        user = None
        if REQUIRE_USER_AUTHENTICATION and api_key and token:
            oauth_client = Oauth2Application.query.filter(
                Oauth2Application.client_id == api_key,
            ).first()
            if oauth_client:
                oauth_token, valid = authenticate_client_and_token(oauth_client.id, token)
                valid = valid and \
                    oauth_token and \
                    oauth_token.user
                if valid:
                    user = oauth_token.user

        self.term_name = term_name if term_name else 'tty'
        if user:
            self.term_name = f'{self.term_name}_{user.id}'

        self._logger.info("TermSocket.open: %s", self.term_name)

        self.terminal = self.term_manager.get_terminal(self.term_name, cwd=cwd)
        self.terminal.clients.append(self)
        self.__initiate_terminal(self.terminal)

    @gen.coroutine
    def on_message(self, raw_message):
        message = json.loads(raw_message)

        api_key = message.get('api_key')
        token = message.get('token')
        command = message.get('command')

        if REQUIRE_USER_AUTHENTICATION or is_disable_pipeline_edit_access():
            valid = False

            if api_key and token:
                oauth_client = Oauth2Application.query.filter(
                    Oauth2Application.client_id == api_key,
                ).first()
                if oauth_client:
                    oauth_token, valid = authenticate_client_and_token(oauth_client.id, token)
                    if valid and oauth_token and oauth_token.user:
                        valid = has_at_least_editor_role(
                            oauth_token.user,
                            Permission.Entity.PROJECT,
                            get_project_uuid(),
                        )
            if not valid or is_disable_pipeline_edit_access():
                return self.send_json_message(
                    ['stdout', f'{command[1]}\nUnauthorized access to the terminal.'])

        return terminado.TermSocket.on_message(self, json.dumps(command))

    def __initiate_terminal(self, terminal):
        self.send_json_message(["setup", {}])
        self._logger.info("TermSocket.open: Opened %s", self.term_name)
        # Now drain the preopen buffer, if reconnect.
        buffered = ""
        preopen_buffer = terminal.read_buffer.copy()
        while True:
            if not preopen_buffer:
                break
            s = preopen_buffer.popleft()
            buffered += s
        if buffered:
            self.on_pty_read(buffered)

        # Turn enable-bracketed-paste off since it can mess up the output.
        if self.term_command == 'bash':
            terminal.ptyproc.write(
                "bind 'set enable-bracketed-paste off' # Mage terminal settings command\r")
        terminal.read_buffer.clear()
