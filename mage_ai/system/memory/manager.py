# import gc  # For manually triggering garbage collection
# import os
# import time
# import tracemalloc
# from typing import Any, Callable

# import psutil
# from memory_profiler import memory_usage


# # Utility Function: Gets current memory usage of the process
# def get_current_memory_usage() -> int:
#     process = psutil.Process(os.getpid())
#     return process.memory_info().rss


# class EnhancedMemoryUsage:
#     """
#     Usage example with EnhancedMemoryUsage class for enhanced memory usage tracking:

#     def run_operations():
#         # Simulating memory usage scenario
#         a = [1] * (10**6)
#         time.sleep(1)  # Simulate time delay
#         b = [2] * (10**6)
#         del a  # Manual deletion to potentially influence memory usage metrics

#     with EnhancedMemoryUsage() as emu:
#         result = emu.profile_memory(run_operations)
#     print(emu.report())
#     """

#     def __enter__(self):
#         tracemalloc.start()
#         self.before_memory = get_current_memory_usage()  # Memory before block execution
#         return self

#     def __exit__(self, exc_type, exc_val, exc_tb):
#         self.after_memory = get_current_memory_usage()  # Memory after block execution
#         self.current, self.peak = tracemalloc.get_traced_memory()
#         tracemalloc.stop()  # Stop tracemalloc tracking
#         gc.collect()  # Manual garbage collection

#     def profile_memory(self, func: Callable, *args, **kwargs) -> Any:
#          def profiled_function(func, *args, **kwargs):
#             # Now, directly use memory_profiler functionalities here
#             memory_usage_before = memory_usage(-1, interval=.1, timeout=1)


#             result = func(*args, **kwargs)
#             memory_usage_after = memory_usage(-1, interval=.1, timeout=1)
#             print(f"Memory before: {memory_usage_before}, Memory after: {memory_usage_after}")
#             # This prints the memory usage before and after the function call
#             return result

#         return memory_usage(
#             (func, args, kwargs),
#             retval=True,
#             timestamps=True,
#             include_children=True,
#             multiprocess=True,
#             # stream=
#             backend='psutil_uss',
#             # backend='tracemalloc',
#         )

#          # Directly call the profiled version of the function
#          return profiled_function(func, *args, **kwargs)

#     def report(self):
#         return (
#             f'Memory used: {self.after_memory - self.before_memory} bytes (According to psutil)\n'
#             f'Tracemalloc Current Memory: {self.current / 1024} KB; Peak: {self.peak / 1024} KB'
#         )
