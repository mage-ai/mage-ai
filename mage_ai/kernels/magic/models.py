from dataclasses import dataclass
from typing import Any, Optional

from mage_ai.errors.models import ErrorDetails
from mage_ai.kernels.magic.constants import EventStreamType, ExecutionStatus
from mage_ai.shared.models import BaseDataClass


@dataclass
class ProcessDetails(BaseDataClass):
    exitcode: Optional[int] = None
    is_alive: Optional[bool] = None
    message: Optional[str] = None
    message_uuid: Optional[str] = None
    pid: Optional[int] = None
    timestamp: Optional[int] = None
    uuid: Optional[str] = None


@dataclass
class ExecutionResult(BaseDataClass):
    error: Optional[ErrorDetails] = None
    output: Optional[Any] = None
    process: Optional[ProcessDetails] = None
    status: Optional[ExecutionStatus] = None

    def __post_init__(self):
        self.serialize_attribute_class('error', ErrorDetails)
        self.serialize_attribute_class('process', ProcessDetails)
        self.serialize_attribute_enum('status', ExecutionStatus)


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
