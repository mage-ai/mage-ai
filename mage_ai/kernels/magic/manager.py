import threading
from datetime import datetime
from multiprocessing import Pool, Queue
from multiprocessing.managers import SyncManager
from threading import Thread
from typing import List, Optional, Union

from faster_fifo import Queue as FasterQueue

from mage_ai.kernels.magic.models import Kernel, ProcessContext
from mage_ai.kernels.magic.process import Process
from mage_ai.shared.array import find
from mage_ai.shared.environments import is_debug


class Manager:
    _instance = None
    _lock = threading.Lock()
    processes = {}
    shared_context = {}
    active = False
    stopping = False

    @staticmethod
    def pre_initialize_components():
        context_manager = SyncManager()
        context_manager.start()
        # These need to go before starting the thread.
        Manager.shared_context = dict(
            context_manager=context_manager,
            process_queue=context_manager.Queue(),
            shared_dict=context_manager.dict(),
            shared_list=context_manager.list(),
            lock=context_manager.Lock(),
        )
        if is_debug():
            print('[Manager.pre_initialize_components] Components initialized')

    def __init__(
        self,
        queue: FasterQueue,
        num_processes: int = 4,
        timestamp: Optional[float] = None,
    ):
        if not Manager.shared_context:
            Manager.pre_initialize_components()

        if not Manager.active:
            # A way to create shared objects that can be accessed and modified by multiple processes
            # safely. This includes objects like dictionaries, lists, and other data structures that
            # need to be manipulated across different processes with proper synchronization handled
            # by the manager.
            self.pool = Pool(processes=num_processes)
            self.process_queue = Manager.shared_context['process_queue']

            # Reader thread to read and forward results
            self.reader_thread = Thread(
                target=self.read_and_forward_results, args=(queue,), daemon=True
            )
            self.reader_thread.start()

            self.shared_dict = Manager.shared_context['shared_dict']
            self.shared_list = Manager.shared_context['shared_list']
            self.lock = Manager.shared_context['lock']

            Manager.active = True

            if is_debug():
                now = datetime.utcnow().timestamp()
                print('[Manager.__init__]', now - (timestamp or 0))

    @classmethod
    def get_kernels(cls) -> List[Kernel]:
        kernels = []
        for uuid, mapping in cls.processes.items():
            kernels.append(
                Kernel(
                    active_kernels=list(mapping.values()),
                    kernel_id=uuid,
                ),
            )

        if len(kernels) == 0:
            kernels.append(Kernel())

        return kernels

    @classmethod
    def get_instance(
        cls,
        queue: FasterQueue,
        num_processes: int = 4,
        timestamp: Optional[float] = None,
    ):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls(queue, num_processes=num_processes, timestamp=timestamp)
                if is_debug():
                    print('[Manager.get_instance] New instance created')

            if is_debug():
                print('[Manager.get_instance] Returning existing instance')

            return cls._instance

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

    def read_and_forward_results(self, results_queue: Queue):
        while not self.stopping:
            try:
                result = self.process_queue.get()
                if result is None:
                    if is_debug():
                        print('[Manager.read_and_forward_results] Stopping thread')
                    continue

                if is_debug():
                    print(f'[Manager.read_and_forward_results] Got result from queue: {result}')
                results_queue.put(result)

                if is_debug():
                    print(f'[Manager.read_and_forward_results] Put result into queue: {result}')
            except Exception as e:
                if is_debug():
                    print(f'[Manager.read_and_forward_results] Error: {e}')

    @classmethod
    def get_process(cls, pid: Union[int, str]) -> Optional[Process]:
        return find(lambda mapping: pid in mapping, cls.processes.values())

    def stop_reader(self):
        self.stopping = True
        self.process_queue.put(None)  # Sentinel to stop the reader thread

    def create_process(
        self,
        uuid: str,
        message: str,
        message_request_uuid: Optional[str] = None,
        timestamp: Optional[float] = None,
    ) -> Process:
        process = Process(
            message,
            self.process_queue,
            uuid,
            message_request_uuid=message_request_uuid,
        )

        if is_debug():
            now = datetime.utcnow().timestamp()
            print('[Manager.create_process]', now - (timestamp or 0))

        return process

    def start_processes(self, processes: List[Process], timestamp: Optional[float] = None) -> None:
        now = datetime.utcnow().timestamp()

        if is_debug():
            print('[Manager.start_processes]', now - (timestamp or 0))

        for process in processes:
            process.start(
                self.pool,
                context=ProcessContext(
                    lock=self.lock,
                    shared_dict=self.shared_dict,
                    shared_list=self.shared_list,
                ),
                timestamp=now,
            )

            if process.uuid not in self.processes:
                self.processes[process.uuid] = {}
            self.processes[process.uuid][process.pid] = process

    def stop(self):
        for uuid in self.processes:
            for process in self.processes[uuid].values():
                process.stop()  # Attempt to stop each process

        if self.pool:
            self.pool.close()
            self.pool.terminate()
            self.pool.join()
