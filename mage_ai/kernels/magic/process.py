import asyncio
from asyncio import Event as AsyncEvent
from datetime import datetime
from multiprocessing import Queue
from multiprocessing.pool import AsyncResult
from typing import Any, Callable, Dict, Iterable, Mapping, Optional, Protocol, Union
from uuid import uuid4

from mage_ai.kernels.magic.execution import execute_code_async
from mage_ai.kernels.magic.models import ProcessContext, ProcessDetails
from mage_ai.shared.environments import is_debug


class PoolProtocol(Protocol):
    def apply_async(  # noqa: E704
        self,
        func: Callable[..., None],
        args: Iterable[Any],
        kwds: Mapping[str, Any],
        callback: Optional[Any] = None,
    ) -> AsyncResult: ...  # noqa: E704


def execute_message(
    uuid: str,
    queue: Queue,
    stop_events: Iterable[AsyncEvent],
    message: str,
    process_details: Dict,
    context: Optional[ProcessContext] = None,
) -> None:
    if is_debug():
        print(f'[Process.execute_code:{uuid}] Executing code: {message}')

    try:
        asyncio.run(
            execute_code_async(
                uuid,
                queue,
                stop_events,
                message,
                process_details,
                context,
            )
        )
    except Exception as err:
        print(f'[Process.execute_code:{uuid}] Error: {err}')


class ProcessBase:
    def __init__(
        self,
        uuid: str,
        message: str,
        *args,
        message_request_uuid: Optional[str] = None,
        **kwargs,
    ):
        self.message = message
        self.message_request_uuid = message_request_uuid
        self.message_uuid = uuid4().hex
        self.result = None
        self.stop_event = None
        self.timestamp = None
        self.uuid = uuid

        if is_debug():
            print(f'[Process.__init__] Initialized process with UUID: {self.uuid}')

    @property
    def exitcode(self) -> Optional[int]:
        return None  # Not applicable when using Pool

    @property
    def is_alive(self) -> Optional[bool]:
        return self.result is not None and not self.result.ready()

    @property
    def pid(self) -> Optional[Union[int, str]]:
        return self.message_uuid  # Not applicable when using Pool

    @property
    def details(self) -> ProcessDetails:
        return ProcessDetails.load(
            exitcode=self.exitcode,
            is_alive=self.is_alive,
            message=self.message,
            message_request_uuid=self.message_request_uuid,
            message_uuid=self.message_uuid,
            pid=self.pid,
            timestamp=self.timestamp,
            uuid=self.uuid,
        )

    def to_dict(self) -> Dict:
        details_dict = self.details.to_dict()
        return details_dict

    def start(
        self,
        pool: PoolProtocol,
        queue: Queue,
        stop_event_pool: AsyncEvent,
        context: Optional[ProcessContext] = None,
        timestamp: Optional[float] = None,
    ):
        self.stop_event = AsyncEvent()
        self.result = pool.apply_async(
            execute_message,
            args=[
                self.uuid,
                queue,
                (stop_event_pool, self.stop_event),
                self.message,
                self.to_dict(),
                context,
            ],
            kwds={},
        )
        now = datetime.utcnow().timestamp()
        self.timestamp = int(now * 1000)

        if is_debug():
            print(f'[Process.start]: {pool}', now - (timestamp or 0))

    def terminate(self):
        if self.stop_event is not None:
            self.stop_event.set()


class Process(ProcessBase):
    pass
