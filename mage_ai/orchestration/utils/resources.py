import os
import subprocess
from typing import Tuple

import psutil

# Threshold value for cgroup memory limit indicating no limit is set
NO_LIMIT_THRESHOLD = 9e18


def get_compute() -> Tuple[float, float, float, float]:
    # Getting loadover15 minutes
    load1, load5, load15 = psutil.getloadavg()
    cpu_count = os.cpu_count()

    return load1, load5, load15, cpu_count


def get_memory() -> Tuple[float, float, float]:
    """
    Get memory usage information.

    For containerized environments (e.g., Google Cloud Run), this reads from cgroup files
    which provide accurate container-specific memory limits and usage.

    For non-containerized environments, falls back to the 'free' command.

    Returns:
        Tuple[float, float, float]: (free_memory, used_memory, total_memory) in MB
    """
    free_memory = None
    total_memory = None
    used_memory = None

    # Skip checking the memory in Windows
    if os.name == 'nt':
        return free_memory, used_memory, total_memory

    # Try to read from cgroup files first (for containerized environments)
    try:
        # Define MB conversion factor (1024 * 1024)
        mb_factor = 1024 * 1024

        # Try cgroup v1 paths first
        usage_path = "/sys/fs/cgroup/memory/memory.usage_in_bytes"
        limit_path = "/sys/fs/cgroup/memory/memory.limit_in_bytes"

        # Check if cgroup v2 is being used (single unified hierarchy)
        if not os.path.exists(usage_path):
            usage_path = "/sys/fs/cgroup/memory.current"
            limit_path = "/sys/fs/cgroup/memory.max"

        # Read memory usage
        if os.path.exists(usage_path):
            with open(usage_path, "r") as f:
                usage_bytes = int(f.read().strip())
                used_memory = usage_bytes / mb_factor

        # Read memory limit
        if os.path.exists(limit_path):
            with open(limit_path, "r") as f:
                limit_value = f.read().strip()
                # Handle cgroup v2 "max" value or v1 very large limit (no limit set)
                if limit_value != "max":
                    limit_bytes = int(limit_value)
                    # A value of 9223372036854771712 or greater indicates no limit set
                    if limit_bytes < NO_LIMIT_THRESHOLD:
                        total_memory = limit_bytes / mb_factor
        # If we successfully read both values, calculate free memory
        if used_memory is not None and total_memory is not None:
            free_memory = total_memory - used_memory
            return free_memory, used_memory, total_memory
    except (FileNotFoundError, ValueError, PermissionError):
        # Cgroup files not available or unreadable, will fall back to 'free' command
        pass

    # Fallback to 'free' command for non-containerized environments
    try:
        output = subprocess.check_output('free -t -m', shell=True).decode('utf-8')
        values = output.splitlines()[-1].split()[1:]
        total_memory, used_memory, free_memory = map(float, values)
    except Exception as err:
        print(err)

    return free_memory, used_memory, total_memory
