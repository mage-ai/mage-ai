import json
import terminado
from tornado import gen
from mage_ai.orchestration.db.models.oauth import Oauth2Application
from mage_ai.api.utils import (
    authenticate_client_and_token,
    has_at_least_editor_role,
)

from mage_ai.settings import (
    DISABLE_NOTEBOOK_EDIT_ACCESS,
    REQUIRE_USER_AUTHENTICATION,
)


class TerminalWebsocketServer(terminado.TermSocket):
    def check_origin(self, origin):
        return True

    def open(self, url_component=None):
        super().open(url_component)

        # Turn enable-bracketed-paste off since it can mess up the output.
        self.terminal.ptyproc.write(
            "bind 'set enable-bracketed-paste off' # Mage terminal settings command\r")
        self.terminal.read_buffer.clear()

    @gen.coroutine
    def on_message(self, message):
        api_key = message.get('api_key')
        token = message.get('token')

        if REQUIRE_USER_AUTHENTICATION:
            if api_key and token:
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
        

        # """Handle incoming websocket message

        # We send JSON arrays, where the first element is a string indicating
        # what kind of message this is. Data associated with the message follows.
        # """
        # command = json.loads(message)
        # msg_type = command[0]
        # assert self.terminal is not None
        # if msg_type == "stdin":
        #     yield self.stdin_to_ptyproc(command[1])
        #     if self._enable_output_logging:
        #         if command[1] == "\r":
        #             self.log_terminal_output(f"STDIN: {self._user_command}")
        #             self._user_command = ""
        #         else:
        #             self._user_command += command[1]
        # elif msg_type == "set_size":
        #     self.size = command[1:3]
        #     self.terminal.resize_to_smallest()