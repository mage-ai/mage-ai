from queue import Empty
from typing import Any, Dict, List, Tuple

import jupyter_client

from mage_ai.kernels.utils import find_ipykernel_launchers_info, terminate_process


def kill_inactive_kernel_processes() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    free -h
    jupyter --paths
    jupyter --runtime-dir
    lsof -p 16167
    ps -ef | grep ipykernel_launcher
    ps aux --sort=-%mem | head
    """
    kernel_processes = find_ipykernel_launchers_info()
    inactive_processes = []
    active_processes = []

    for process in kernel_processes:
        pid = process.get('pid')
        connection_file = process.get('connection_file')
        if not connection_file:
            continue

        km = jupyter_client.BlockingKernelClient()
        km.load_connection_file(connection_file)

        km.execute("print('Hello')", connection_file)
        try:
            km.get_shell_msg(timeout=1)
            print(f'Killing inactive process {pid}')
            inactive_processes.append(process)
            terminate_process(pid)
        except Empty:
            print(f'Active process: {pid}')
            active_processes.append(process)

    return active_processes, inactive_processes
