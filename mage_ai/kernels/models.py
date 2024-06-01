from __future__ import annotations

from dataclasses import dataclass
from inspect import isawaitable
from multiprocessing import Process
from typing import Any, Dict, List, Optional, Tuple, Union

from mage_ai.kernels.constants import ProcessStatus
from mage_ai.shared.hash import ignore_keys
from mage_ai.shared.models import BaseDataClass, Delegator


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


class KernelBase:
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

    def is_alive(self) -> bool:
        pass

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


@dataclass
class KernelProcess(BaseDataClass, Delegator):
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
    process: Optional[Process] = None
    status: Optional[Union[ProcessStatus, str]] = None
    username: Optional[str] = None

    def __post_init__(self):
        self.serialize_attribute_class('memory_info', PMemoryInfo)
        self.serialize_attribute_classes('connections', PConn)
        self.serialize_attribute_classes('cpu_times', PCPUTimes)
        self.serialize_attribute_classes('open_files', POpenFile)

        if self.status:
            self.status = ProcessStatus.from_value(self.status) or self.status

        self.cpu = (
            sum([
                float(val) if val is not None else 0
                for val in [self.cpu_times.user, self.cpu_times.system]
            ])
            if self.cpu_times
            else 0
        )
        self.memory = int(self.memory_info.rss) if self.memory_info and self.memory_info.rss else 0

        if self.process is not None:
            self.target = self.process

    @classmethod
    def load_all(cls, check_active_status: bool = False) -> List['KernelProcess']:
        return []

    @classmethod
    def terminate_inactive(
        cls,
        process_dicts: Optional[List[Dict]] = None,
    ) -> Tuple[int, int]:
        return 0, 0

    def check_active_status(self) -> bool:
        return False

    def terminate(self) -> bool:
        return False

    def to_dict(self, *args, **kwargs) -> Dict:
        return ignore_keys(super().to_dict(*args, **kwargs), ['process', 'target'])


class Kernel:
    def __init__(
        self,
        kernel: Any,
        active_kernels: Optional[List[Any]] = None,
        kernel_id: Optional[str] = None,
        kernel_name: Optional[str] = None,
        processes: Optional[List[KernelProcess]] = None,
    ):
        self.active_kernels = active_kernels
        self.kernel = kernel
        self.inactive_kernels = None
        self.usage = None

        self._kernel_id = kernel_id
        self._kernel_name = kernel_name
        self._processes = processes

    @property
    def kernel_id(self) -> Optional[str]:
        return self._kernel_id

    @kernel_id.setter
    def kernel_id(self, value: str):
        self._kernel_id = value

    @property
    def kernel_name(self) -> Optional[str]:
        return self._kernel_name

    @kernel_name.setter
    def kernel_name(self, value: str):
        self._kernel_name = value

    @property
    def processes(self) -> Optional[List[KernelProcess]]:
        return []

    async def prepare_usage(self):
        pass

    def is_ready(self) -> bool:
        return True

    def is_alive(self) -> bool:
        return True

    def interrupt(self) -> bool:
        return True

    def restart(self) -> bool:
        return True

    def start(self) -> bool:
        return True

    def to_dict(self) -> Dict:
        return dict(
            alive=self.is_alive(),
            id=self.kernel_id,
            name=self.kernel_name,
            processes=self.processes,
            usage=self.usage,
        )
