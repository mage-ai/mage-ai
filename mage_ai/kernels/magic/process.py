import asyncio
from datetime import datetime
from multiprocessing import Queue
from multiprocessing.context import BaseContext
from typing import Dict, Optional
from uuid import uuid4

from mage_ai.kernels.magic.execution import execute_code_async
from mage_ai.kernels.magic.models import ProcessDetails


def execute_code(message: str, queue: Queue, uuid: str, process_dict: Dict):
    asyncio.run(execute_code_async(message, queue, uuid, process_dict))


class ProcessWrapper:
    def __init__(
        self,
        message: str,
        queue: Queue,
        uuid: str,
        ctx: Optional[BaseContext] = None,
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
        self.ctx = ctx
        self.message = message
        self.message_request_uuid = message_request_uuid
        self.message_uuid = uuid4().hex
        self.process = None
        self.queue = queue
        self.timestamp = None
        self.uuid = uuid

    def start(self):
        self.process = self.ctx.Process(
            target=execute_code,
            args=(
                self.message,
                self.queue,
                self.uuid,
                self.to_dict(),
            ),
        )
        self.process.start()
        self.timestamp = int(datetime.utcnow().timestamp() * 1000)

    def stop(self):
        if self.process is not None and self.is_alive:
            self.process.terminate()
            self.process.join()

    @property
    def exitcode(self) -> Optional[int]:
        if self.process is None:
            return

        return self.process.exitcode

    @property
    def is_alive(self) -> Optional[bool]:
        if self.process is None:
            return

        return self.process.is_alive()

    @property
    def pid(self) -> Optional[int]:
        if self.process is None:
            return

        return self.process.pid

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
        return self.details.to_dict()
