import uuid
from dataclasses import dataclass
from typing import Dict, List, Union

from jupyter_client import KernelClient

from mage_ai.server.active_kernel import (
    get_active_kernel_client,
    get_active_kernel_name,
    switch_active_kernel,
)
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.server.kernels import DEFAULT_KERNEL_NAME, KernelName
from mage_ai.server.websockets.constants import ExecutionState, MessageType
from mage_ai.shared.models import BaseDataClass


def init_kernel_client(kernel_name: KernelName = None) -> KernelClient:
    kernel_name = kernel_name or DEFAULT_KERNEL_NAME
    if kernel_name != get_active_kernel_name():
        switch_active_kernel(kernel_name)
    return get_active_kernel_client()


@dataclass
class Error(BaseDataClass):
    code: int = None
    error_type: str = None
    errors: List[str] = None
    message: str = None


@dataclass
class Message(BaseDataClass):
    api_key: str = None
    data: Union[List[str], str] = None
    data_type: DataType = None
    error: Error = None
    executed: bool = False
    execution_metadata: Dict = None
    execution_state: ExecutionState = None
    message: str = None
    msg_id: str = None
    msg_type: MessageType = None
    token: str = None
    uuid: str = None

    def __post_init__(self):
        self.serialize_attribute_class('error', Error)
        self.serialize_attribute_enum('data_type', DataType)
        self.serialize_attribute_enum('msg_type', MessageType)
        self.uuid = self.uuid or str(uuid.uuid4())

    @property
    def completed(self) -> bool:
        return ExecutionState.COMPLETED == self.execution_state


@dataclass
class Client(BaseDataClass):
    client = KernelClient = None
    message = Message = None

    def __post_init__(self):
        self.serialize_attribute_class('message', Message)
        self.client = self.client or init_kernel_client()

    def execute(self, custom_code: str = None) -> Message:
        self.message.msg_id = self.client.execute(custom_code or self.message.message)
        self.message.executed = True
        return self.message
