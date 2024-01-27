import json

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
)
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.security import filter_out_env_var_values


def parse_raw_message(raw_message: str) -> Message:
    try:
        message = Message.load(**json.loads(raw_message))
        return filter_out_sensitive_data(message)
    except json.decoder.JSONDecodeError as err:
        return Message.load(
            data_type=DataType.TEXT_PLAIN,
            error=Error.load(**merge_dict(ApiError.RESOURCE_ERROR, dict(
                errors=[
                    str(err),
                ]
            ))),
        )


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
                error=Error.load(**merge_dict(ApiError.UNAUTHORIZED_ACCESS, dict(
                    errors=[
                        'You are unauthenticated or unauthorized to execute this code.',
                    ],
                )))
            )

    return message


def filter_out_sensitive_data(message: Message) -> Message:
    if not message.data or not HIDE_ENV_VAR_VALUES:
        return message

    data = message.data
    if isinstance(data, str):
        data = [data]

    data = [filter_out_env_var_values(data_value) for data_value in data]
    message.data = data
    return message


def should_filter_message(message: Message) -> bool:
    if not message:
        return False

    if isinstance(message, Message):
        message = message.to_dict()

    if message.get('data') is None and \
            message.get('error') is None and \
            message.get('execution_state') is None and \
            message.get('type') is None:

        return True

    try:
        # Filter out messages meant for jupyter widgets that we can't render
        if message.get('msg_type') == MessageType.DISPLAY_DATA and \
                ((message.get('data') or [])[0] or '').startswith('FloatProgress'):

            return True
    except IndexError:
        pass

    return False
