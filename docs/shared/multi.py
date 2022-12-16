from concurrent.futures import ThreadPoolExecutor
from joblib import Parallel, delayed
from threading import Thread

MAX_WORKERS = 16


def execute_parallel(list_of_funcs_and_args, verbose=0):
    parallel = Parallel(n_jobs=-1, prefer='threads', verbose=verbose)
    return parallel(delayed(func)(*args) for func, args in list_of_funcs_and_args)


def start_thread(target, **kwargs):
    thread = Thread(
        target=target,
        kwargs=kwargs,
    )
    thread.start()

    return thread


def parallelize(func, arr):
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        return pool.map(func, arr)


def parallelize_multiple_args(func, arr_args):
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        return pool.map(func, *zip(*arr_args))


def run_parallel_threads(list_of_funcs_and_args_or_kwargs):
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        for func, args in list_of_funcs_and_args_or_kwargs:
            pool.submit(func, *args)


def run_parallel(func, arr_args_1, arr_args_2):
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        return pool.map(func, *arr_args_1, *arr_args_2)


def run_parallel_multiple_args(func, *args):
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        return pool.map(func, *args)
