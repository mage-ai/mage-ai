import multiprocessing
from collections import defaultdict
from typing import Dict, Optional

from mage_ai.shared.queues import Queue as FasterQueue

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


execution_result_queue = None


def get_execution_result_queue(uuid: Optional[str] = None) -> FasterQueue:
    global execution_result_queue

    if execution_result_queue is None:
        multiprocessing.set_start_method('spawn', force=True)  # Set the start method globally
        execution_result_queue = defaultdict(FasterQueue)

    return execution_result_queue[uuid] if uuid else execution_result_queue


async def get_execution_result_queue_async() -> Dict[str, FasterQueue]:
    global execution_result_queue

    if execution_result_queue is None:
        multiprocessing.set_start_method('spawn', force=True)  # Set the start method globally
        execution_result_queue = defaultdict(FasterQueue)

    return execution_result_queue
