import asyncio
from datetime import datetime
from multiprocessing import Pool, Queue
from typing import Any, Dict, Optional, Union
from uuid import uuid4

from mage_ai.kernels.magic.execution import execute_code_async
from mage_ai.kernels.magic.models import ProcessContext, ProcessDetails
from mage_ai.shared.environments import is_debug, is_test


def execute_code(
    uuid: str,
    queue: Queue,
    main_queue: Queue,
    message: str,
    process_details: Dict,
    context: ProcessContext,
):
    if is_debug():
        print(f'[Process.execute_code:{uuid}] Executing code: {message}')
    try:
        asyncio.run(
            execute_code_async(
                uuid,
                queue,
                main_queue,
                message,
                process_details,
                context,
            )
        )
    except Exception as err:
        print(f'[Process.execute_code:{uuid}] Error: {err}')


class Process:
    def __init__(
        self,
        uuid: str,
        queue: Union[Any, Queue],
        main_queue: Union[Any, Queue],
        message: str,
        message_request_uuid: Optional[str] = None,
    ):
        """
        1. Fork: Fast process creation, but only available on Unix-based systems.
        Copies the parent process memory space,
        which can cause issues if the parent has a large state or open resources.

        2. Spawn: More compatible across platforms (including Windows).
        Ensures a fresh interpreter state, avoiding side effects from the parent process's state.

        3. Forkserver: Helps in avoiding issues related to forking by using a server process
        that forks new processes upon request.
        This can be more secure but slightly more complex to set up and use.
        """
        self.main_queue = main_queue
        self.message = message
        self.message_request_uuid = message_request_uuid
        self.message_uuid = uuid4().hex
        self.queue = queue
        self.result = None
        self.timestamp = None
        self.uuid = uuid

        if is_debug():
            print(f'[Process.__init__] Initialized process with UUID: {self.uuid}')

    def start(
        self,
        pool: Union[Any, Pool],
        context: ProcessContext,
        timestamp: Optional[float] = None,
    ):
        self.result = pool.apply_async(
            execute_code,
            args=(
                self.uuid,
                self.queue,
                self.main_queue,
                self.message,
                self.to_dict(),
                context,
            ),
        )
        now = datetime.utcnow().timestamp()
        self.timestamp = int(now * 1000)

        if is_debug():
            print(f'[Process.start]: {pool}', now - (timestamp or 0))

        if is_test():
            # Mimic result production for testing purposes
            pool.apply_async(self.mock_result_production)

    def mock_result_production(self):
        # Mock result to mimic producing a result as a placeholder
        result = {'message': self.message, 'uuid': self.uuid, 'timestamp': self.timestamp}
        print(f'[Process.mock_result_production] Placing result into process queue: {result}')
        self.queue.put(result)

    def stop(self):
        if self.result and not self.result.ready():
            self.result.cancel()

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
