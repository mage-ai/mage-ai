import multiprocessing

from faster_fifo import Queue

# Define the results_queue as None initially
results_queue = None


def get_results_queue() -> Queue:
    global results_queue

    if results_queue is not None:
        return results_queue

    # Set the start method globally
    multiprocessing.set_start_method('spawn', force=True)

    if results_queue is None:
        results_queue = Queue()

    return results_queue
