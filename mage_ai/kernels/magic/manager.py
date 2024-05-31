import threading
from datetime import datetime
from multiprocessing import Pool, Queue
from multiprocessing.managers import SyncManager
from threading import Thread
from typing import Dict, List, Optional

import psutil
from faster_fifo import Empty

from mage_ai.kernels.default.utils import get_process_info
from mage_ai.kernels.magic.models import Kernel, ProcessContext
from mage_ai.kernels.magic.process import Process
from mage_ai.kernels.magic.queues.results import get_results_queue
from mage_ai.kernels.models import KernelProcess
from mage_ai.shared.environments import is_debug


class Manager:
    _instance = None
    _lock = threading.Lock()
    active = False
    main_queue: Optional[Queue] = None
    pools: Dict[str, Pool] = {}
    process_queues: Dict[str, Queue] = {}
    shared_context = {}
    stopping = False

    @staticmethod
    def pre_initialize_components():
        context_manager = SyncManager()
        context_manager.start()
        # These need to go before starting the thread.
        Manager.shared_context = dict(
            context_manager=context_manager,
            shared_dict=context_manager.dict(),
            shared_list=context_manager.list(),
            lock=context_manager.Lock(),
        )
        if is_debug():
            print('[Manager.pre_initialize_components] Components initialized')

    def __init__(self, timestamp: Optional[float] = None):
        if not Manager.shared_context:
            Manager.pre_initialize_components()

        if not Manager.active:
            Manager.main_queue = Manager.shared_context['context_manager'].Queue()

            # Reader thread to read and forward results
            self.reader_thread = Thread(
                target=self.read_queues,
                args=(
                    Manager.main_queue,
                    Manager.process_queues,
                ),
                daemon=True,
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
    def get_instance(
        cls,
        uuid: str,
        num_processes: int = 4,
        timestamp: Optional[float] = None,
    ):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls(timestamp=timestamp)

                if is_debug():
                    print('[Manager.get_instance] New instance created')

            if is_debug():
                print('[Manager.get_instance] Returning existing instance')

            # Initialize pool for this UUID if it doesn't exist
            if uuid not in cls.pools:
                cls.pools[uuid] = Pool(processes=num_processes)

                if is_debug():
                    now = datetime.utcnow().timestamp()
                    print(
                        f'[Manager.__init__] Pool created for UUID: {uuid}',
                        now - (timestamp or 0),
                    )

            if uuid not in cls.process_queues:
                cls.process_queues[uuid] = cls.shared_context['context_manager'].Queue()

                if is_debug():
                    now = datetime.utcnow().timestamp()
                    print(
                        f'[Manager.__init__] Process queue created for UUID: {uuid}',
                        now - (timestamp or 0),
                    )

            return cls._instance

    @classmethod
    def shutdown(cls):
        with cls._lock:
            if cls._instance:
                cls.main_queue.put(None)  # Sentinel to stop the reader thread

                cls._instance.reader_thread.join()
                cls._instance.stopping = True
                cls._instance = None
                cls.active = False

                cls.cleanup_resources(clear=True)
                cls.shared_context = {}

    @classmethod
    def cleanup_resources(cls, clear: Optional[bool] = None, uuid: Optional[str] = None) -> None:
        cls.__cleanup_pools(clear=clear, uuid=uuid)
        cls.__cleanup_queues(clear=clear, uuid=uuid)

    @classmethod
    def __cleanup_pools(cls, clear: Optional[bool] = None, uuid: Optional[str] = None) -> None:
        keys_to_delete = []

        for uuid_key, pool in cls.pools.items():
            if uuid is not None and uuid_key != uuid:
                continue

            print(f'[Manager.cleanup_pools:{uuid_key}] Pool state: {pool._state}')
            if pool._state != 'RUN':
                pool.close()
                pool.join()

                if uuid_key in cls.pools:
                    keys_to_delete.append(uuid_key)

        for uuid_key in keys_to_delete:
            del cls.pools[uuid_key]

            if is_debug():
                print(f'[Manager.cleanup_pools:{uuid_key}] Pool cleaned up')

        if clear:
            cls.pools.clear()

    @classmethod
    def __cleanup_queues(cls, clear: Optional[bool] = None, uuid: Optional[str] = None) -> None:
        keys_to_delete = []

        for uuid_key, queue in cls.process_queues.items():
            if uuid is not None and uuid_key != uuid:
                continue

            try:
                while True:
                    queue.get_nowait()
            except Empty:
                pass

            if queue.empty():
                keys_to_delete.append(uuid_key)

        for uuid_key in keys_to_delete:
            if uuid_key in cls.process_queues:
                del cls.process_queues[uuid_key]

            if is_debug():
                print(f'[Manager.cleanup_queues:{uuid_key}] Process queues cleaned up.')

        if clear:
            cls.process_queues.clear()

    @classmethod
    def get_kernels(cls) -> List[Kernel]:
        kernels = []

        for uuid, pool in cls.pools.items():
            processes = []
            for process in pool._pool:
                try:
                    info = get_process_info(process.pid)
                    if info:
                        processes.append(KernelProcess.load(**info))
                except psutil.NoSuchProcess:
                    # In case the process ends and no longer exists
                    continue
            kernels.append(
                Kernel(
                    kernel_id=uuid,
                    processes=processes,
                )
            )

        if len(kernels) == 0:
            kernels.append(Kernel())

        return kernels

    def read_queues(self, main_queue, process_queues):
        uuid = None
        while not self.stopping:
            try:
                uuid = main_queue.get(timeout=0.05)
                if uuid is None:
                    if is_debug():
                        print(
                            '[Manager.read_queues] No UUID in main queue, stopping thread.',
                        )
                    break

                result = process_queues[uuid].get()
                if result is None:
                    if is_debug():
                        print(f'[Manager.read_queues:{uuid}] End of output.')
                    continue

                if is_debug():
                    print(
                        f'[Manager.read_queues:{uuid}] Result output dequeued: {result.output}',
                    )

                results_queue = get_results_queue().get(result.uuid)
                if results_queue is not None:
                    results_queue.put(result)

                    if is_debug():
                        print(f'[Manager.read_queues:{uuid}] Result enqueued: {result}')
            except Empty:
                pass
            except Exception as err:
                print(f'[Manager.read_queues:{uuid}] Error: {err}')

    def create_process(
        self,
        uuid: str,
        message: str,
        message_request_uuid: Optional[str] = None,
        timestamp: Optional[float] = None,
    ) -> Process:
        queue = self.process_queues[uuid]
        process = Process(
            uuid,
            queue,
            Manager.main_queue,
            message,
            message_request_uuid=message_request_uuid,
        )

        if is_debug():
            now = datetime.utcnow().timestamp()
            print(f'[Manager.create_process:{uuid}]', now - (timestamp or 0))

        return process

    def start_processes(
        self, uuid: str, processes: List[Process], timestamp: Optional[float] = None
    ) -> None:
        now = datetime.utcnow().timestamp()

        for process in processes:
            pool = Manager.pools[uuid]

            process.start(
                pool,
                context=ProcessContext(
                    lock=self.lock,
                    shared_dict=self.shared_dict,
                    shared_list=self.shared_list,
                ),
                timestamp=now,
            )

            if is_debug():
                print(f'[Manager.start_processes:{uuid}]', now - (timestamp or 0))
