import functools
import gc
import os
import sys
import tracemalloc
from multiprocessing import Process, Queue
from typing import Any, Dict, List, Tuple

import psutil


def track_usage(queue):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            process_id = os.getpid()
            # Memory usage before
            proc = psutil.Process(process_id)
            mem_before = proc.memory_info().rss

            # Track objects before the function call
            objects_before = set(id(obj) for obj in gc.get_objects())

            result = func(*args, **kwargs)  # Call the original function

            objects_after = set(id(obj) for obj in gc.get_objects())
            new_objects = [
                [str(type(obj)), sys.getsizeof(obj)]
                for obj in gc.get_objects()
                if id(obj) in objects_after - objects_before
            ]

            # Memory usage after
            mem_after = proc.memory_info().rss
            print(
                f'[{func.__name__}] Memory Usage: '
                f'Before={mem_before} After={mem_after} Difference={mem_after - mem_before} bytes'
            )

            # Put tracking object/details into the queue
            print(len(new_objects))
            memory_usage_info = {
                'function_name': func.__name__,
                'memory_used': mem_after - mem_before,
                'process_id': process_id,
                'uncollected_objects': new_objects,
            }
            queue.put(memory_usage_info)
            print('Added to queue')

            return result

        return wrapper

    return decorator


def wrapped_func(queue, code_string, func_name, *args, **kwargs):
    # Prepare a namespace dict where the executed code will live
    namespace = (
        globals().copy()
    )  # This copies the current global symbols to the namespace

    # Execute the code_string within the namespace
    exec(
        code_string, namespace, namespace
    )  # Now both global and local scopes are the same

    # Now, retrieve the function from this namespace
    actual_function = namespace.get(func_name)

    decorated_func = track_usage(queue)(actual_function)

    try:
        return decorated_func(*args, **kwargs)
    except Exception as e:
        queue.put({'error': str(e)})
    finally:
        # Signal that this process is done
        queue.put(None)


def begin_working(jobs: List[Tuple[str, str, List[Any], Dict[str, Any]]]):
    gc.collect()  # Force a collection to start from a clean slate

    queue = Queue()

    tracemalloc.start()

    # Take a snapshot before the function call
    snapshot_before = tracemalloc.take_snapshot()

    num_processes = 0
    for file_path, func_name, args, kwargs in jobs:
        print(f'Processing {func_name} in {file_path}')
        with open(file_path, 'r') as file:
            code_string = file.read()

        p = Process(
            target=wrapped_func,
            args=(
                queue,
                code_string,
                func_name,
                *args,
            ),
            kwargs=kwargs,
        )
        p.start()
        num_processes += 1
        p.join(timeout=10 * 60)  # Adjust the timeout as needed
        if p.is_alive():
            print(f'Process {p.name} did not terminate as expected.')
            p.terminate()  # Forcefully terminate

    # Retrieve and print memory usage information
    uncollected_objects = []
    func_names = []
    process_ids = []
    memory_uses = []

    sentinel_count = 0
    while sentinel_count < num_processes:
        memory_usage_info = queue.get()
        if memory_usage_info is None:
            sentinel_count += 1
            continue  # Skip the rest of the loop
        # Existing code to process non-sentinel items...

        if 'error' in memory_usage_info:
            raise Exception(memory_usage_info['error'])

        memory_uses.append(memory_usage_info.get('memory_used'))
        func_names.append(memory_usage_info.get('function_name'))
        process_ids.append(memory_usage_info.get('process_id'))
        uncollected_objects.extend(memory_usage_info.get('uncollected_objects') or [])

    print(f'Total memory used: {sum(memory_uses)} bytes across:')
    for func_name, process_id in zip(func_names, process_ids):
        print(f'\t{func_name} (PID={process_id}): {memory_uses.pop(0)} bytes')

    print('\n')

    sizes_by_type = {}
    # Find new objects created during the function call
    for obj_type, obj_size in uncollected_objects:
        if obj_type not in sizes_by_type:
            sizes_by_type[obj_type] = 0
        sizes_by_type[obj_type] += obj_size

    print(
        f'Objects created that wasn’t uncollected: {len(uncollected_objects)} '
        f'({sum(list(sizes_by_type.values()))})'
    )
    for k, v in sizes_by_type.items():
        print(f'\t{k}: {v} bytes')

    del uncollected_objects
    del func_names
    del process_ids
    del memory_uses
    del sizes_by_type

    # Take another snapshot after
    snapshot_after = tracemalloc.take_snapshot()

    # Compare the two snapshots to see what has been allocated in between
    """
    This comparison highlights allocations, not necessarily what's "still in use" because it
    doesn't track deallocations directly. If an object is allocated and then deallocated between
    the snapshots, it won't appear. However, if there's a positive `size_diff`,
    it suggests memory allocated during the snapshot window hasn't been released by the time of
    the second snapshot.
    """
    stats = snapshot_after.compare_to(snapshot_before, 'lineno')

    # A more focused approach to filtering the stats
    for stat in stats:
        trace = stat.traceback.format()
        # Check if any line in the traceback belongs to your function's code file
        if any('worker' in line for line in trace):
            for line in trace:
                print(line)
            print(stat)
            """
            For understanding "memory still being used," you're mainly concerned with `size_diff`
            and allocations (`size` and `count`) not countered by deallocations within the
            window of your snapshots.
            """
            # print('\t', stat.traceback.format())
            # print('\t', stat.count)
            # print('\t', stat.count_diff)
            # print('\t', stat.size)
            print('\t', stat.size_diff)
            print('\n')

    gc.collect()  # Force a collection to start from a clean slate


if __name__ == '__main__':
    begin_working(
        [
            (
                '/Users/dangerous/Code/materia/mage-ai/mage_ai/system/memory/samples.py',
                'worker',
                [1],
                dict(another_arg=2),
            ),
            (
                '/Users/dangerous/Code/materia/mage-ai/mage_ai/system/memory/samples.py',
                'create_objects_example',
                [1000],
                dict(),
            ),
        ]
    )
