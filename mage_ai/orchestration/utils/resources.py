from typing import Tuple
import os
import psutil


def get_compute() -> Tuple[float, float, float, float]:
    # Getting loadover15 minutes
    load1, load5, load15 = psutil.getloadavg()
    cpu_count = os.cpu_count()

    return load1, load5, load15, cpu_count


def get_memory() -> Tuple[float, float, float]:
    free_memory = None
    total_memory = None
    used_memory = None

    try:
        total_memory, used_memory, free_memory = map(
            int,
            os.popen('free -t -m').readlines()[-1].split()[1:],
        )
    except Exception as err:
        print(err)

    return free_memory, used_memory, total_memory
