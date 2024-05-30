from multiprocessing import Pool, Queue
from multiprocessing.managers import SyncManager
from threading import Thread
from typing import List, Optional, Union

from faster_fifo import Queue as FasterQueue

from mage_ai.kernels.magic.models import ProcessContext
from mage_ai.kernels.magic.process import Process
from mage_ai.shared.array import find


class Manager:
    processes = {}

    def __init__(self, uuid: str, queue: FasterQueue, num_processes: int = 4):
        self.pool = Pool(processes=num_processes)
        # A way to create shared objects that can be accessed and modified by multiple processes
        # safely. This includes objects like dictionaries, lists, and other data structures that
        # need to be manipulated across different processes with proper synchronization handled
        # by the manager.

        # These need to go before starting the thread.
        self.context_manager = SyncManager()
        self.context_manager.start()
        self.process_queue = self.context_manager.Queue()  # Initialize a Queue through Manager

        # print('Starting thread to read and forward results from managed queue')
        self.reader_thread = Thread(
            target=self.read_and_forward_results, args=(queue,), daemon=True
        )
        self.reader_thread.start()

        self.uuid = uuid

        self.shared_dict = self.context_manager.dict()  # Shared dictionary
        self.shared_list = self.context_manager.list()  # Shared list
        self.lock = self.context_manager.Lock()  # Lock for synchronization

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
    def get_process(cls, pid: Union[int, str]) -> Optional[Process]:
        return find(lambda mapping: pid in mapping, cls.processes.values())

    def create_process(self, message: str, message_request_uuid: Optional[str] = None) -> Process:
        return Process(
            message,
            self.process_queue,
            self.uuid,
            message_request_uuid=message_request_uuid,
        )

    async def start_processes(self, processes: List[Process]) -> None:
        for process in processes:
            # print(f'Adding process {process.message_uuid} to start')
            await process.start(
                self.pool,
                context=ProcessContext(
                    lock=self.lock,
                    shared_dict=self.shared_dict,
                    shared_list=self.shared_list,
                ),
            )

            if self.uuid not in self.processes:
                self.processes[self.uuid] = {}
            self.processes[self.uuid][process.pid] = process

    def stop(self):
        for uuid in self.processes:
            for process in self.processes[uuid].values():
                process.stop()  # Attempt to stop each process

        if self.pool:
            self.pool.close()
            self.pool.terminate()
            self.pool.join()

    def read_and_forward_results(self, results_queue: Queue):
        while True:
            result = self.process_queue.get()
            if result is None:  # Sentinel to stop processing
                break
            # print(f'Received result from managed queue: {result}')
            results_queue.put(result)
