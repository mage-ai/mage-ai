from multiprocessing import Event, Queue
from queue import Empty
from threading import Thread
from typing import Optional, Tuple, cast

from mage_ai.kernels.magic.models import ExecutionResult
from mage_ai.shared.environments import is_debug
from mage_ai.shared.queues import Queue as FasterQueue


def read_queue_and_forward_results(read_queue: Queue, write_queue: FasterQueue, stop_event: Event):
    while not stop_event.is_set():
        try:
            result = cast(Optional[ExecutionResult], read_queue.get())
            if result is not None:
                uuid = result.uuid
                message_uuid = result.process.message_uuid if result.process else None

                if is_debug():
                    print(
                        f'[ReaderThread:{uuid}] Result dequeued: {message_uuid}',
                    )

                write_queue.put(result)

                if is_debug():
                    print(
                        f'[ReaderThread:{uuid}] Result enqueued for EventStream: {message_uuid}',
                    )
            elif is_debug():
                print('[ReaderThread] No result found in queue.')
        except Empty:
            pass
        except Exception as err:
            if is_debug():
                print(f'[ReaderThread] ERROR: {err}')


class ReaderThread:
    def __init__(
        self,
        args: Tuple[
            Queue,
            FasterQueue,
            Event,
        ],
        start: Optional[bool] = None,
    ):
        self.thread = Thread(target=read_queue_and_forward_results, args=args, daemon=True)
        if start:
            self.thread.start()

    def join(self) -> None:
        self.thread.join()
