import asyncio
import datetime
import os
from queue import Empty
from typing import Any, Dict, List, Optional

import jupyter_client
import psutil


def list_open_files(pid):
    """
    List open files by a process and their last modification time.

    Parameters:
    - pid (int): Process ID.
    """
    proc = psutil.Process(pid)
    for item in proc.open_files():
        file_path = item.path
        try:
            mod_time = os.path.getmtime(file_path)
            print(f'File: {file_path}, Last Mod Time: {datetime.datetime.fromtimestamp(mod_time)}')
        except Exception as e:
            print(f'Could not retrieve modification time for {file_path}: {str(e)}')


def is_cmdline_contains_ipykernel(cmdline, search_term='ipykernel_launcher'):
    """Check if the command line (if exists) contains the specified search term."""
    if cmdline and search_term in ' '.join(cmdline):
        return True
    return False


async def find_ipykernel_launchers_info_async(timeout: int = 5) -> List[Dict]:
    loop = asyncio.get_running_loop()
    try:
        # Run the synchronous function in a separate thread with a timeout
        arr = await asyncio.wait_for(
            loop.run_in_executor(None, lambda: find_ipykernel_launchers_info(True)), timeout
        )
        return arr
    except asyncio.TimeoutError:
        print(f'Operation timed out after {timeout} seconds')
        return []


def find_ipykernel_launchers_info(check_active_status: bool = False) -> List[Dict]:
    """
    ps aux | grep ipykernel_launcher
    """
    arr = []
    for proc in psutil.process_iter(['pid', 'ppid', 'name', 'cmdline', 'memory_info']):
        try:
            # Check if cmdline is available and contains 'ipykernel_launcher'
            cmdline = proc.info['cmdline']
            if cmdline and 'ipykernel_launcher' in ' '.join(proc.info['cmdline']):
                pid = proc.info['pid']
                process = dict(pid=pid)
                process.update(
                    get_process_info(pid, check_active_status=check_active_status) or {}
                )
                arr.append(process)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass  # Process has been terminated or access was denied
    return arr


def get_process_info(pid: int, check_active_status: bool = False) -> Optional[Dict]:
    """
    Retrieves information about a process given its PID.

    Parameters:
    - pid (int): Process ID.

    Returns:
    - dict: A dictionary containing process information, or None if the process does not exist.
    """
    try:
        """
        Most common to refer to the RSS (Resident Set Size) value
        because it most accurately represents the amount of physical memory actually
        occupied by the process
        {
            'memory_info': pmem(
                rss=62554112,
                vms=692289536,
                shared=14155776,
                text=4096,
                lib=0,
                data=130043904,
                dirty=0,
            ),
        }
        """
        process = psutil.Process(int(pid))
        cmdline = process.cmdline()
        proc_info = {
            'pid': process.pid,
            'ppid': process.ppid(),
            'name': process.name(),
            'exe': process.exe(),
            'cmdline': ' '.join(cmdline),
            # If there are more than 1, kill the ones that are "sleeping"
            # Kernels that are busy can still show status as "sleeping"
            # ESTABLISHED
            'status': process.status(),
            'username': process.username(),
            'create_time': process.create_time(),
            'cpu_times': process.cpu_times(),
            'memory_info': process.memory_info(),
            'open_files': process.open_files(),
            'connections': process.connections(),
            'num_threads': process.num_threads(),
        }

        # Extract and add the connection file path
        for arg in cmdline:
            if arg and arg.endswith('.json'):
                proc_info['connection_file'] = arg
                break  # Break after finding the first .json argument

        if check_active_status:
            proc_info['active'] = is_kernel_process_active(pid, proc_info.get('connection_file'))
        return proc_info
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        return None


def terminate_process(pid: int) -> bool:
    """
    Attempt to terminate the process with the given PID.
    """
    try:
        process = psutil.Process(pid)
        process.terminate()  # Requests the process to terminate
        process.wait(timeout=3)  # Wait up to 3 seconds for the process to end
        return True
    except psutil.NoSuchProcess:
        print(f'No process with PID {pid} exists.')
        return False
    except psutil.AccessDenied:
        print(f'Permission denied to terminate process {pid}.')
        return False
    except psutil.TimeoutExpired:
        print(f'Process {pid} did not terminate within the timeout period.')
        # Optionally use process.kill() if you must forcibly stop the process
        # return False
    except Exception as e:
        print(f'An unexpected error occurred: {e}')
        return False
    return False


def is_kernel_process_active(pid: int, connection_file: Any) -> bool:
    if not connection_file:
        return False

    km = jupyter_client.BlockingKernelClient()
    km.load_connection_file(connection_file)

    km.execute('1 + 1', connection_file)
    try:
        km.get_shell_msg(timeout=1)
        return False
    except Empty:
        return True

    return False
