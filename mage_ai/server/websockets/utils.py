import json

from jupyter_client import KernelClient

from mage_ai.api.errors import ApiError
from mage_ai.api.utils import authenticate_client_and_token
from mage_ai.orchestration.db.models.oauth import Oauth2Application
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.server.websockets.constants import MessageType
from mage_ai.server.websockets.models import Error, Message
from mage_ai.settings import (
    DISABLE_NOTEBOOK_EDIT_ACCESS,
    HIDE_ENV_VAR_VALUES,
    REQUIRE_USER_AUTHENTICATION,
    is_disable_pipeline_edit_access,
)
from mage_ai.shared.security import filter_out_env_var_values
from mage_ai.utils.code import reload_all_repo_modules


def prepare_environment(client, custom_code: str) -> None:
    reload_all_repo_modules(custom_code)
    if is_disable_pipeline_edit_access():
        custom_code = None
    initialize_database(client)


def initialize_database(client: KernelClient) -> None:
    # Initialize the db_connection session if it hasn't been initialized yet.
    initialize_db_connection = """
from mage_ai.orchestration.db import db_connection
db_connection.start_session()
"""
    client.execute(initialize_db_connection)


def parse_raw_message(raw_message: str) -> Message:
    message = Message.load(**json.loads(raw_message))
    return filter_out_sensitive_data(message)


def validate_message(message: Message) -> Message:
    if REQUIRE_USER_AUTHENTICATION or DISABLE_NOTEBOOK_EDIT_ACCESS:
        valid = not REQUIRE_USER_AUTHENTICATION

        if message.api_key and message.token:
            oauth_client = Oauth2Application.query.filter(
                Oauth2Application.client_id == message.api_key,
            ).first()
            if oauth_client:
                _oauth_token, valid = authenticate_client_and_token(oauth_client.id, message.token)

        if not valid or DISABLE_NOTEBOOK_EDIT_ACCESS == 1:
            return Message.load(
                data_type=DataType.TEXT_PLAIN,
                error=Error.load(**ApiError.UNAUTHORIZED_ACCESS)
            )

    return message


def filter_out_sensitive_data(message: Message):
    if not message.data or not HIDE_ENV_VAR_VALUES:
        return message
    data = message.data
    if isinstance(data, str):
        data = [data]
    data = [filter_out_env_var_values(data_value) for data_value in data]
    message.data = data
    return message


def should_filter_message(message: Message) -> bool:
    if message.data is None and \
            message.error is None and \
            message.execution_state is None and \
            message.type is None:

        return True

    try:
        # Filter out messages meant for jupyter widgets that we can't render
        if message.msg_type == MessageType.DISPLAY_DATA and \
                ((message.data or [])[0] or '').startswith('FloatProgress'):

            return True
    except IndexError:
        pass

    return False
