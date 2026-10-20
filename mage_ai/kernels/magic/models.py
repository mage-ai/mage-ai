import asyncio
from dataclasses import dataclass
from multiprocessing import Lock
from multiprocessing.context import SpawnProcess
from multiprocessing.managers import DictProxy, ListProxy
from typing import Any, Dict, List, Optional

import psutil

from mage_ai.errors.models import ErrorDetails
from mage_ai.kernels.constants import ProcessStatus
from mage_ai.kernels.default.models import KernelProcess
from mage_ai.kernels.default.utils import get_process_info
from mage_ai.kernels.magic.constants import EventStreamType, ExecutionStatus, ResultType
from mage_ai.kernels.models import Kernel as KernelBase
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.shared.models import BaseDataClass


@dataclass
class ProcessDetails(BaseDataClass):
    exitcode: Optional[int] = None
    is_alive: Optional[bool] = None
    message: Optional[str] = None
    message_request_uuid: Optional[str] = None
    message_uuid: Optional[str] = None
    pid: Optional[int] = None
    timestamp: Optional[int] = None
    uuid: Optional[str] = None


@dataclass
class ExecutionResult(BaseDataClass):
    data_type: Optional[DataType] = None
    error: Optional[ErrorDetails] = None
    output: Optional[Any] = None
    process: Optional[ProcessDetails] = None
    status: Optional[ExecutionStatus] = None
    type: Optional[ResultType] = None
    uuid: Optional[str] = None

    def __post_init__(self):
        self.serialize_attribute_class('error', ErrorDetails)
        self.serialize_attribute_class('process', ProcessDetails)
        self.serialize_attribute_enum('data_type', DataType)
        self.serialize_attribute_enum('status', ExecutionStatus)
        self.serialize_attribute_enum('type', ResultType)

    @property
    def output_text(self) -> str:
        return str(self.output)

    def to_dict(self, *args, **kwargs) -> Dict:
        data = super().to_dict(*args, **kwargs)
        data['output_text'] = self.output_text
        return data


@dataclass
class EventStream(BaseDataClass):
    event_uuid: str
    timestamp: int
    uuid: str
    error: Optional[ErrorDetails] = None
    result: Optional[ExecutionResult] = None
    type: Optional[EventStreamType] = None

    def __post_init__(self):
        self.serialize_attribute_class('error', ErrorDetails)
        self.serialize_attribute_class('result', ExecutionResult)
        self.serialize_attribute_enum('type', EventStreamType)


@dataclass
class ProcessContext(BaseDataClass):
    lock: Lock
    shared_dict: DictProxy
    shared_list: ListProxy


class Kernel(KernelBase):
    def __init__(self, *args, kernel_id: Optional[str] = None, **kwargs):
        super().__init__(
            None, *args, kernel_id=kernel_id or 'magic', kernel_name='python3', **kwargs
        )
        self._processes_hydrated = False

    @property
    def processes(self) -> Optional[List[KernelProcess]]:
        if self._processes_hydrated:
            return self._processes

        processes = []
        for process in self._processes or []:
            try:
                info = get_process_info(process.pid) if process.pid else None
                if info is not None:
                    processes.append(KernelProcess.load(process=process, **info))
            except psutil.NoSuchProcess:
                # In case the process ends and no longer exists
                continue
        return processes

    def process_status(self, process: SpawnProcess) -> ProcessStatus:
        if process.is_alive() and process.pid:
            proc = psutil.Process(process.pid)
            if any(
                cpu > 0
                for cpu in [
                    proc.cpu_percent(interval=0.1),
                    proc.cpu_percent(interval=0.3),
                    proc.cpu_percent(interval=0.5),
                ]
            ):
                return ProcessStatus.BUSY
            return ProcessStatus.IDLE
        elif process.is_alive() is False:
            return ProcessStatus.DEAD
        return ProcessStatus.UNKNOWN

    async def process_status_async(self, process: SpawnProcess) -> ProcessStatus:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.process_status, process)

    async def hydrate_processes(self) -> None:
        kernel_processes = self.processes
        if not kernel_processes:
            return

        statuses = await asyncio.gather(*[
            self.process_status_async(kernel_process.process)
            for kernel_process in kernel_processes
        ])
        for process, status in zip(kernel_processes, statuses):
            process.status = ProcessStatus.from_value(status)

        self._processes = kernel_processes
        self._processes_hydrated = True
