from __future__ import annotations

from dataclasses import dataclass
from inspect import isawaitable
from typing import Dict, List, Optional

from mage_ai.kernels.utils import (
    find_ipykernel_launchers_info,
    is_kernel_process_active,
    terminate_process,
)
from mage_ai.shared.models import BaseDataClass


@dataclass
class PCPUTimes(BaseDataClass):
    user: Optional[float] = None
    system: Optional[float] = None
    children_user: Optional[float] = None
    children_system: Optional[float] = None
    iowait: Optional[float] = None


@dataclass
class PMemoryInfo(BaseDataClass):
    rss: Optional[int] = None
    vms: Optional[int] = None
    shared: Optional[int] = None
    text: Optional[int] = None
    lib: Optional[int] = None
    data: Optional[int] = None
    dirty: Optional[int] = None


@dataclass
class POpenFile(BaseDataClass):
    path: Optional[str] = None
    fd: Optional[int] = None
    position: Optional[int] = None
    mode: Optional[str] = None
    flags: Optional[int] = None


@dataclass
class Addr(BaseDataClass):
    ip: Optional[str] = None
    port: Optional[int] = None


@dataclass
class PConn(BaseDataClass):
    fd: Optional[int] = None
    family: Optional[str] = None
    type: Optional[str] = None
    laddr: Optional[Addr] = None
    raddr: Optional[Addr] = None
    status: Optional[str] = None


@dataclass
class KernelProcess(BaseDataClass):
    active: Optional[bool] = None
    cmdline: Optional[str] = None
    connection_file: Optional[str] = None
    connections: Optional[List[PConn]] = None
    cpu: Optional[float] = None
    cpu_times: Optional[PCPUTimes] = None
    create_time: Optional[float] = None
    exe: Optional[str] = None
    memory: Optional[float] = None
    memory_info: Optional[PMemoryInfo] = None
    name: Optional[str] = None
    num_threads: Optional[str] = None
    open_files: Optional[List[POpenFile]] = None
    pid: Optional[int] = None
    ppid: Optional[int] = None
    status: Optional[str] = None
    username: Optional[str] = None

    def __post_init__(self):
        self.serialize_attribute_class('memory_info', PMemoryInfo)
        self.serialize_attribute_classes('connections', PConn)
        self.serialize_attribute_classes('cpu_times', PCPUTimes)
        self.serialize_attribute_classes('open_files', POpenFile)

        self.cpu = (
            sum(
                [
                    float(val) if val is not None else 0
                    for val in [self.cpu_times.user, self.cpu_times.system]
                ]
            )
            if self.cpu_times
            else 0
        )
        self.memory = int(self.memory_info.rss) if self.memory_info and self.memory_info.rss else 0

    @classmethod
    def load_all(cls, check_active_status: bool = False) -> List['KernelProcess']:
        return [
            cls.load(**d)
            for d in find_ipykernel_launchers_info(check_active_status=check_active_status)
        ]

    @classmethod
    def terminate_inactive(cls) -> None:
        for kernel_process in cls.load_all(check_active_status=True):
            if not kernel_process.active:
                kernel_process.terminate()

    def check_active_status(self) -> bool:
        if not self.pid or not self.connection_file:
            return False

        self.active = is_kernel_process_active(self.pid, self.connection_file) or False
        return self.active

    def terminate(self) -> bool:
        return self.pid is not None and terminate_process(self.pid)


class KernelWrapper:
    def __init__(self, kernel):
        self.kernel = kernel
        self.usage = None
        self.active_kernels = None
        self.inactive_kernels = None

    async def prepare_usage(self):
        try:
            client = self.kernel.client()
            session = self.kernel.session
            control_channel = client.control_channel
            usage_request = session.msg('usage_request', {})

            control_channel.send(usage_request)
            res = client.control_channel.get_msg(timeout=3)
            if isawaitable(res):
                # control_channel.get_msg may return a Future,
                # depending on configured KernelManager class
                res = await res
            self.usage = res.get('content')
            control_channel.stop()
        except Exception:
            pass

    def is_ready(self) -> bool:
        return self.usage is not None

    def is_alive(self):
        return self.kernel.is_alive()

    @property
    def kernel_id(self) -> str:
        return self.kernel.kernel_id

    @property
    def kernel_name(self) -> str:
        return self.kernel.kernel_name

    def to_dict(self) -> Dict:
        return {
            'alive': self.is_alive(),
            'id': self.kernel_id,
            'name': self.kernel_name,
            'usage': self.usage,
        }
