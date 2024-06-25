import asyncio
from asyncio import Event as AsyncEvent
from datetime import datetime
from multiprocessing import Queue
from multiprocessing.pool import CLOSE, INIT, RUN, TERMINATE, AsyncResult
from typing import Any, Callable, Dict, Iterable, Mapping, Optional, Protocol, Union
from uuid import uuid4

import psutil

from mage_ai.kernels.magic.environments.models import OutputManager
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
    main_queue: Optional[Any] = None,
    **kwargs,
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
                main_queue,
                **kwargs,
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
        kernel_uuid: Optional[str] = None,
        message_request_uuid: Optional[str] = None,
        output_manager: Optional[OutputManager] = None,
        source: Optional[str] = None,
        stream: Optional[str] = None,
        **kwargs,
    ):
        self.internal_state = INIT
        self.kernel_uuid = kernel_uuid
        self.message = message
        self.message_request_uuid = message_request_uuid
        self.message_uuid = uuid4().hex
        self.output_manager = output_manager
        self.result = None
        self.source = source
        self.stream = stream
        self.stop_event = None
        self.timestamp = None
        self.timestamp_end = None
        self.uuid = uuid

        self.callback = kwargs.get('callback')
        self.execution_options = kwargs.get('execution_options')

        self._pid = None
        self._pid_data = []

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
            data=self._pid_data,
            exitcode=self.exitcode,
            internal_state=self.internal_state,
            is_alive=self.is_alive,
            kernel_uuid=self.kernel_uuid,
            message=self.message,
            message_request_uuid=self.message_request_uuid,
            message_uuid=self.message_uuid,
            output_manager=self.output_manager,
            pid=self.pid,
            pid_spawn=self._pid,
            source=self.source,
            stream=self.stream,
            timestamp=self.timestamp,
            timestamp_end=self.timestamp_end,
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

        def process_apply_async_callback(*args, **kwargs):
            self.timestamp_end = datetime.utcnow().timestamp() * 1000
            self.internal_state = CLOSE
            self._pid_data.append(psutil.Process(self._pid).as_dict())

            if self.callback:
                self.callback(self)

        pids0 = [pr.pid for pr in pool._pool]
        self.result = pool.apply_async(
            execute_message,
            args=[
                self.uuid,
                queue,
                (stop_event_pool, self.stop_event),
                self.message,
                self.to_dict(),
                context,
                None,
            ],
            kwds={
                **dict(
                    output_manager=self.output_manager.to_dict() if self.output_manager else None,
                ),
                **(self.execution_options or {}),
            },
            callback=process_apply_async_callback,
        )
        pids1 = [pr.pid for pr in pool._pool if pr.pid not in pids0]
        self._pid = (pids1 + pids0)[0]

        if self._pid:
            self._pid_data.append(psutil.Process(self._pid).as_dict())

        self.internal_state = RUN

        now = datetime.utcnow().timestamp()
        self.timestamp = int(now * 1000)

        if is_debug():
            print(f'[Process.start]: {pool}', now - (timestamp or 0))

    def terminate(self):
        if self.stop_event is not None:
            self.stop_event.set()
            self.timestamp_end = datetime.utcnow().timestamp() * 1000
            self.internal_state = TERMINATE


class Process(ProcessBase):
    pass
