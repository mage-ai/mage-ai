import re
import traceback
from datetime import datetime
from typing import Callable, Dict, List, Tuple

from tornado.websocket import WebSocketHandler

from mage_ai.api.errors import ApiError
from mage_ai.server.active_kernel import get_active_kernel_client
from mage_ai.server.logger import Logger
from mage_ai.server.websockets.models import Error, Message
from mage_ai.shared.hash import merge_dict

logger = Logger().new_server_logger(__name__)

MSG_ID_REGEX = re.compile(r'_[\d]+_[\d]+$')


def contains_msg_id(mapping: Dict[str, str], msg_id: str) -> str:
    # msg_id = 'f59e1913-80fc7db2b112bfbdc12e21b3_1_1'
    msg_ids = [MSG_ID_REGEX.sub('', m) for m in mapping.keys()]
    print(
        MSG_ID_REGEX.sub('', msg_id) in msg_ids,
        MSG_ID_REGEX.sub('', msg_id),
        msg_ids,
    )
    return MSG_ID_REGEX.sub('', msg_id) in msg_ids


def get_messages(subscribers: List[Tuple[WebSocketHandler, Callable, Callable]]):
    # Every variable must be in the while loop or else it accumulates.
    while True:
        try:
            now = datetime.utcnow()
            owners = []
            client = get_active_kernel_client()
            message = client.get_iopub_msg(timeout=1)
            msg_id = message['parent_header']['msg_id']

            for subscriber, callback, on_failure in subscribers:
                if contains_msg_id(subscriber.running_executions_mapping, msg_id):
                    owners.append((subscriber, callback, on_failure))

            orphan = False
            if len(owners) == 0:
                logger.error(f'[{now}] WebSocket: no subscribers for {msg_id}')
                owners.extend(subscribers)
                orphan = True

            for subscriber, callback, on_failure in owners:
                if message.get('content'):
                    if callback:
                        callback(merge_dict(message, dict(
                            type='orphan',
                        ) if orphan else {}))
                    else:
                        logger.warn(f'[{now}] No callback for message: {message}')
        except Exception as err:
            if str(err):
                for subscriber, _callback, on_failure in owners:
                    if on_failure:
                        on_failure(Message.load(
                            error=Error.load(**merge_dict(ApiError.RESOURCE_ERROR, dict(
                                message=err,
                                errors=[
                                    *traceback.format_exc().split('\n'),
                                ],
                            ))),
                        ))
                logger.error(f'[{now}] WebSocket: {err}\n{traceback.format_exc()}')

            pass
