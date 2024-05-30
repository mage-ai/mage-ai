import multiprocessing
from multiprocessing.queues import Queue
from typing import Optional, Union

from mage_ai.kernels.magic.process import ProcessWrapper
from mage_ai.shared.array import find


class Manager:
    processes = {}

    def __init__(self, uuid: str):
        self.uuid = uuid

    @classmethod
    def cleanup_processes(cls):
        uuids_to_delete = []
        pids_to_delete = {}
        for uuid, mapping in cls.processes.items():
            pids_to_delete[uuid] = []
            for pid, process in mapping.items():
                if not process.is_alive:
                    pids_to_delete[uuid].append(pid)

        for uuid, arr in pids_to_delete.items():
            for pid in arr:
                del cls.processes[uuid][pid]

        for uuid in uuids_to_delete:
            if not cls.processes[uuid]:
                del cls.processes[uuid]

    @classmethod
    def get_process(cls, pid: Union[int, str]) -> Optional[ProcessWrapper]:
        return find(lambda mapping: pid in mapping, cls.processes.values())

    def start_process(
        self, message: str, queue: Queue, message_request_uuid: Optional[str] = None
    ) -> ProcessWrapper:
        process = ProcessWrapper(
            message,
            queue,
            self.uuid,
            ctx=multiprocessing.get_context('spawn'),
            message_request_uuid=message_request_uuid,
        )
        process.start()

        if self.uuid not in self.processes:
            self.processes[self.uuid] = {}
        self.processes[self.uuid][process.pid] = process

        return process
