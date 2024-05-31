import multiprocessing
from collections import defaultdict

from faster_fifo import Queue as FasterQueue

results_queue = None


def get_results_queue() -> FasterQueue:
    global results_queue

    if results_queue is not None:
        return results_queue

    # Set the start method globally
    multiprocessing.set_start_method('spawn', force=True)

    if results_queue is None:
        results_queue = defaultdict(FasterQueue)

    return results_queue
