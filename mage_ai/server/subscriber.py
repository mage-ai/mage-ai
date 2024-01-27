import traceback
from datetime import datetime
from typing import Callable, List, Tuple

from mage_ai.api.errors import ApiError
from mage_ai.server.active_kernel import get_active_kernel_client
from mage_ai.server.logger import Logger
from mage_ai.server.websockets.code.server import Code as CodeWebSocketServer
from mage_ai.server.websockets.models import Error, Message
from mage_ai.server.websockets.uuids import contains_msg_id
from mage_ai.shared.hash import merge_dict

logger = Logger().new_server_logger(__name__)


def get_messages(subscribers: List[Tuple[Callable, Callable, Callable]]):
    # Every variable must be in the while loop or else it accumulates.
    while True:
        try:
            now = datetime.utcnow()
            owners = []
            client = get_active_kernel_client()
            message = client.get_iopub_msg(timeout=1)
            msg_id = message['parent_header']['msg_id']

            for get_mapping, callback, on_failure in subscribers:
                if contains_msg_id(get_mapping(), msg_id):
                    owners.append((get_mapping, callback, on_failure))

            orphan = False
            if len(owners) == 0:
                logger.info(f'[{now}] WebSocket: no subscribers for {msg_id}')
                for get_mapping, callback, on_failure in subscribers:
                    if get_mapping is CodeWebSocketServer:
                        continue
                    owners.append((get_mapping, callback, on_failure))
                orphan = True

            for get_mapping, callback, on_failure in owners:
                if message.get('content'):
                    if callback:
                        callback(merge_dict(message, dict(
                            type='orphan',
                        ) if orphan else {}))
                    else:
                        logger.warn(f'[{now}] No callback for message: {message}')
        except Exception as err:
            if str(err):
                for get_mapping, _callback, on_failure in owners:
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
