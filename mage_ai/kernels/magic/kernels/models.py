import asyncio
from asyncio import Event as AsyncEvent
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from multiprocessing import Event, Pool, Queue
from multiprocessing.managers import SyncManager
from queue import Empty
from typing import List, Optional, cast

from mage_ai.kernels.magic.models import Kernel as KernelDetails
from mage_ai.kernels.magic.models import ProcessContext
from mage_ai.kernels.magic.process import Process, ProcessBase
from mage_ai.kernels.magic.threads.reader import ReaderThread
from mage_ai.shared.environments import is_debug
from mage_ai.shared.queues import Queue as FasterQueue

DEFAULT_NUM_PROCESSES = 1


class Kernel:
    def __init__(self, uuid: str, write_queue: FasterQueue, num_processes: Optional[int] = None):
        self.active = False
        self.write_queue = write_queue
        self.uuid = uuid

        self.context_manager = None
        self.lock = None
        self.num_processes = None
        self.pool = None
        self.processes = []
        self.read_queue = None
        self.reader_thread = None
        self.shared_dict = None
        self.shared_list = None
        self.stop_event = None
        self.stop_event_pool = None

        self.__initialize_kernel(num_processes=num_processes)

        self.active = True

    def __initialize_kernel(self, num_processes: Optional[int] = None) -> None:
        self.executor = ThreadPoolExecutor()
        self.num_processes = num_processes or DEFAULT_NUM_PROCESSES

        # These need to go before starting the thread.
        self.pool = Pool(processes=self.num_processes)
        self.context_manager = SyncManager()
        self.context_manager.start()

        self.read_queue = cast(Queue, self.context_manager.Queue())

        # Track active processes
        self.processes: List[Process] = []

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

    @property
    def details(self) -> KernelDetails:
        return KernelDetails(
            kernel_id=self.uuid,
            processes=getattr(self.pool, '_pool', []) if self.pool is not None else [],
        )

    def force_terminate(self):
        if self.pool is not None:
            try:
                for process in getattr(self.pool, '_pool', []):
                    process.terminate()  # Forcefully terminate the process
                self.pool.terminate()
                self.pool = None
            except Exception as e:
                print(f'[Kernel] Error during force termination: {e}')

    def run(
        self,
        message: str,
        message_request_uuid: Optional[str] = None,
        timestamp: Optional[float] = None,
    ) -> ProcessBase:
        now = datetime.utcnow().timestamp()

        if is_debug():
            print('[Manager.start_processes]', now - (timestamp or 0))

        process = Process(self.uuid, message, message_request_uuid=message_request_uuid)
        if (
            self.pool is not None
            and self.read_queue is not None
            and self.stop_event_pool is not None
        ):
            process.start(
                self.pool,
                self.read_queue,
                self.stop_event_pool,
                context=ProcessContext(
                    lock=self.lock,
                    shared_dict=self.shared_dict,
                    shared_list=self.shared_list,
                )
                if self.shared_dict and self.shared_list
                else None,
                timestamp=now,
            )
            self.processes.append(process)

        return process

    async def terminate_async(self) -> None:
        await self.__stop_async()

        if self.reader_thread is not None:
            await asyncio.get_event_loop().run_in_executor(self.executor, self.reader_thread.join)
            await self.__cleanup_resources_async()

    async def interrupt_async(self):
        await self.__stop_async()
        await self.__drain_queues()
        self.__initialize_kernel(num_processes=self.num_processes)

    async def retart_async(self, num_processes: Optional[int] = None) -> None:
        await self.terminate_async()
        self.__initialize_kernel(num_processes=num_processes)

    async def __cleanup_resources_async(self) -> None:
        if self.shared_dict is not None:
            self.shared_dict.clear()
        if self.shared_list is not None:
            self.shared_list.clear()

        self.__clear_lock()

        await self.__drain_queues()

        if self.pool is not None:
            await asyncio.get_event_loop().run_in_executor(self.executor, self.pool.close)
            await asyncio.get_event_loop().run_in_executor(self.executor, self.pool.join)

        # Reset everything except uuid and write_queue
        self.active = False
        self.context_manager = None
        self.executor = None
        self.num_processes = None
        self.pool = None
        self.processes = []
        self.read_queue = None
        self.reader_thread = None
        self.shared_dict = None
        self.shared_list = None
        self.stop_event = None
        self.stop_event_pool = None

    def __drain_read_queue(self):
        if self.read_queue is not None:
            try:
                while True:
                    self.read_queue.get_nowait()
            except Empty:
                pass
        self.read_queue = None

    def __drain_write_queue(self):
        if self.write_queue is not None:
            temp_queue = []
            try:
                while True:
                    msg = self.write_queue.get_nowait()
                    if msg.uuid != self.uuid:
                        temp_queue.append(msg)
            except Empty:
                pass
            # Push back the messages that are not to be discarded
            for msg in temp_queue:
                self.write_queue.put(msg)

    def __clear_lock(self) -> None:
        if self.lock is not None:
            acquired = self.lock.acquire(blocking=False)
            if acquired:
                try:
                    self.lock.release()
                except RuntimeError as err:
                    print(f'[Kernel.__clear_lock] Error releasing lock: {err}')
        self.lock = None

    async def __drain_queues(self) -> None:
        # Using loop.run_in_executor to ensure non-blocking
        await asyncio.get_event_loop().run_in_executor(self.executor, self.__drain_read_queue)
        await asyncio.get_event_loop().run_in_executor(self.executor, self.__drain_write_queue)

    async def __stop_async(self) -> None:
        if self.stop_event is not None:
            self.stop_event.set()
        if self.stop_event_pool is not None:
            self.stop_event_pool.set()
        if self.pool is not None:
            await asyncio.get_event_loop().run_in_executor(self.executor, self.pool.terminate)
            await asyncio.get_event_loop().run_in_executor(self.executor, self.pool.join)
