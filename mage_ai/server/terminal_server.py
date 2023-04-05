from mage_ai.api.utils import authenticate_client_and_token
from mage_ai.orchestration.db.models.oauth import Oauth2Application
from mage_ai.settings import REQUIRE_USER_AUTHENTICATION
import terminado
import tornado.websocket


class TerminalWebsocketServer(terminado.TermSocket):
    def check_origin(self, origin):
        return True

    def open(self, *args, **kwargs):
        """Websocket connection opened.

        Call our terminal manager to get a terminal, and connect to it as a
        client.
        """
        # Jupyter has a mixin to ping websockets and keep connections through
        # proxies alive. Call super() to allow that to set up:
        tornado.websocket.WebSocketHandler.open(self, *args, **kwargs)

        api_key = self.get_argument('api_key', None, True)
        token = self.get_argument('token', None, True)

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

        self.term_name = "tty"
        if user:
            self.term_name = f'terminal_{user.id}'

        self._logger.info("TermSocket.open: %s", self.term_name)

        self.terminal = self.term_manager.get_terminal(self.term_name)
        self.terminal.clients.append(self)
        self.__initiate_terminal(self.terminal)

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
        terminal.ptyproc.write(
            "bind 'set enable-bracketed-paste off' # Mage terminal settings command\r")
        terminal.read_buffer.clear()
