from dataclasses import dataclass
from multiprocessing import Lock
from multiprocessing.managers import DictProxy, ListProxy
from typing import Any, Dict, Optional

from mage_ai.errors.models import ErrorDetails
from mage_ai.kernels.magic.constants import EventStreamType, ExecutionStatus, ResultType
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
