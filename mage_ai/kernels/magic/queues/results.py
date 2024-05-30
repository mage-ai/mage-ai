import multiprocessing
from multiprocessing import Queue

# Define the results_queue as None initially
results_queue = None


def get_results_queue() -> Queue:
    # Set the start method globally
    multiprocessing.set_start_method('spawn', force=True)

    global results_queue
    if results_queue is None:
        results_queue = Queue()
    return results_queue


if __name__ == '__main__':
    # Ensure it gets initialized when run directly
    results_queue = get_results_queue()
