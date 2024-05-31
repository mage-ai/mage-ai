from asyncio import Event as AsyncEvent
from datetime import datetime
from multiprocessing import Event, Pool, Queue
from multiprocessing.managers import SyncManager
from queue import Empty
from typing import List, Optional, cast

from faster_fifo import Queue as FasterQueue

from mage_ai.kernels.magic.models import ProcessContext
from mage_ai.kernels.magic.process import PoolProcess, ProcessBase
from mage_ai.kernels.magic.threads.reader import ReaderThread
from mage_ai.shared.environments import is_debug

DEFAULT_NUM_PROCESSES = 1


class Kernel:
    def __init__(self, uuid: str, write_queue: FasterQueue, num_processes: Optional[int] = None):
        self.active = False
        self.uuid = uuid

        self.write_queue = write_queue

        self.__initialize_kernel(num_processes=num_processes)

        self.active = True

    def __initialize_kernel(self, num_processes: Optional[int] = None) -> None:
        self.num_processes = num_processes or DEFAULT_NUM_PROCESSES

        # These need to go before starting the thread.
        self.pool = Pool(processes=self.num_processes)
        self.context_manager = SyncManager()
        self.context_manager.start()

        self.read_queue: Queue = cast(Queue, self.context_manager.Queue())

        # Track active processes
        self.active_processes: List[PoolProcess] = []

        self.shared_dict = self.context_manager.dict()
        self.shared_list = self.context_manager.list()
        self.lock = self.context_manager.Lock()

        self.stop_event = Event()
        self.stop_event_pool = AsyncEvent()

        # Initialize a queue using the SyncManager so that it can be serialized and deserialized
        # or else it will throw an error when trying to pass it to a process.
        # Thread to read and forward results from read queue to write queue.
        self.reader_thread = ReaderThread(
            args=(self.read_queue, self.write_queue, self.stop_event), start=True
        )

    def run(
        self,
        message: str,
        message_request_uuid: Optional[str] = None,
        timestamp: Optional[float] = None,
    ) -> ProcessBase:
        now = datetime.utcnow().timestamp()

        if is_debug():
            print('[Manager.start_processes]', now - (timestamp or 0))

        process = PoolProcess(self.uuid, message, message_request_uuid=message_request_uuid)
        process.start(
            self.pool,
            self.read_queue,
            self.stop_event_pool,
            context=ProcessContext(
                lock=self.lock,
                shared_dict=self.shared_dict,
                shared_list=self.shared_list,
            ),
            timestamp=now,
        )

        # Track the process
        self.active_processes.append(process)
        return process

    def terminate(self) -> None:
        self.interrupt()
        self.reader_thread.join()
        self.__cleanup_resources()

    def interrupt(self):
        # Signal any other ongoing form of work to stop
        self.stop_event.set()
        self.stop_event_pool.set()
        # Terminate the pool
        self.pool.terminate()
        self.pool.join()

    def restart(self, num_processes: Optional[int] = None) -> None:
        # Step 1: Interrupt and clean up existing processes
        self.interrupt()

        if is_debug():
            print('[Kernel.restart] Kernel interrupted and resources cleaned up')

        # Step 2: Re-initialize the kernel
        self.__initialize_kernel(num_processes=num_processes)

        self.active = True

        if is_debug():
            print('[Kernel.restart] Kernel reinitialized and ready')

    def __cleanup_resources(self) -> None:
        self.shared_dict.clear()
        self.shared_list.clear()
        self.__clear_lock()

        try:
            while True:
                self.read_queue.get_nowait()
        except Empty:
            pass

        self.pool.close()
        self.pool.join()

        self.active = False
        self.context_manager = None

    def __clear_lock(self) -> None:
        if self.lock is not None:
            acquired = self.lock.acquire(blocking=False)
            if acquired:
                try:
                    self.lock.release()
                except RuntimeError:
                    pass  # Lock was not held
        self.lock = None
