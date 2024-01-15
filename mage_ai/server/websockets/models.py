import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Union

from jupyter_client import KernelClient

from mage_ai.api.errors import ApiError
from mage_ai.server.active_kernel import (
    get_active_kernel_client,
    get_active_kernel_name,
    switch_active_kernel,
)
from mage_ai.server.kernels import DEFAULT_KERNEL_NAME, KernelName
from mage_ai.server.websockets.constants import ExecutionState
from mage_ai.settings import is_disable_pipeline_edit_access
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.models import BaseDataClass
from mage_ai.utils.code import reload_all_repo_modules


def init_kernel_client(kernel_name: KernelName = None) -> KernelClient:
    kernel_name = kernel_name or DEFAULT_KERNEL_NAME
    if kernel_name != get_active_kernel_name():
        switch_active_kernel(kernel_name)
    return get_active_kernel_client()


def initialize_database(client: KernelClient) -> None:
    # Initialize the db_connection session if it hasn't been initialized yet.
    initialize_db_connection = """
from mage_ai.orchestration.db import db_connection
db_connection.start_session()
"""
    client.execute(initialize_db_connection)


def prepare_environment(
    client,
    custom_code: str,
    reload_modules: bool = False,
    **kwargs,
) -> None:
    if reload_modules and custom_code:
        reload_all_repo_modules(custom_code)

    if is_disable_pipeline_edit_access():
        custom_code = None

    if kwargs.get('initialize_database'):
        initialize_database(client)


@dataclass
class Error(BaseDataClass):
    code: int = None
    errors: List[str] = None
    message: str = None
    type: str = None


@dataclass
class ExecutionMetadata(BaseDataClass):
    date: datetime = None
    initialize_database: bool = False
    execution_count: int = None
    metadata: Dict = None
    reload_modules: bool = False
    session: str = None
    username: str = None
    version: str = None


@dataclass
class ParentMessage(BaseDataClass):
    api_key: str = None
    buffers: List[str] = None
    code: str = None
    content: Dict = None
    data: Union[List[str], str] = None
    data_type: str = None  # DataType
    data_types: List[str] = None  # List[DataType]
    error: Error = None
    executed: bool = False
    execution_metadata: ExecutionMetadata = None
    execution_state: str = None
    parent_message: Dict = None
    message: str = None
    msg_id: str = None
    msg_type: str = None  # execute_input, execute_result, stream, idle
    token: str = None
    type: str = None  # orphan (msg_id doesn’t belong to any subscriber)
    uuid: str = None

    def __post_init__(self):
        self.serialize_attribute_class('error', Error)
        self.serialize_attribute_class('execution_metadata', ExecutionMetadata)
        self.uuid = self.uuid or str(uuid.uuid4())

    def to_dict(self, **kwargs) -> Dict:
        return dict(
            buffers=[str(v) for v in (self.buffers or [])],
            content=self.content,
            data=self.data,
            data_type=self.data_type,
            data_types=self.data_types,
            error=self.error.to_dict() if self.error else None,
            executed=self.executed,
            execution_metadata=(
                self.execution_metadata.to_dict() if self.execution_metadata else None
            ),
            execution_state=self.execution_state if self.execution_state else None,
            parent_message=self.parent_message,
            message=self.message,
            msg_id=self.msg_id,
            msg_type=self.msg_type,
            type=self.type,
            uuid=self.uuid,
        )


@dataclass
class Message(ParentMessage):
    parent_message: ParentMessage = None

    def __post_init__(self):
        super().__post_init__()
        self.serialize_attribute_class('parent_message', ParentMessage)

    @classmethod
    def load_from_publisher_message(self, **kwargs) -> 'Message':
        """
        {
          "header": {
            "msg_type": "execute_input",
            "msg_type": "execute_result"
          },
          "content": {
            "data": {
              "text/plain": "2"
            }
            "code": "1 + 1",
            "execution_count": 2
          }
        }
        """
        buffers = kwargs.get('buffers') or []
        content = kwargs.get('content') or {}
        header = kwargs.get('header') or {}
        metadata = kwargs.get('metadata', {}) or {}
        msg_id = kwargs.get('msg_id') or None
        msg_type = kwargs.get('msg_type') or None
        parent_header = kwargs.get('parent_header') or {}

        code = None
        data = []
        data_type = None
        data_types = []
        execution_count = None
        execution_state = None

        if 'code' in content:
            code = content.get('code')
        if 'data' in content:
            for d_type, data_output in (content.get('data') or {}).items():
                data.append(data_output)
                data_type = d_type
                data_types.append(d_type)
        if 'execution_count' in content:
            execution_count = content.get('execution_count')
        if 'execution_state' in content:
            execution_state = content.get('execution_state')
        if 'name' in content:
            data_types.append(content.get('name'))
        if 'text' in content:
            data.append(content.get('text'))
        if 'metadata' in content:
            metadata.update(content.get('metadata'))

        return Message.load(
            buffers=buffers,
            code=code,
            content=content,
            data=data,
            data_type=data_type,
            data_types=data_types,
            executed=msg_type == 'execute_result',
            execution_state=execution_state,
            execution_metadata=ExecutionMetadata.load(
                date=header.get('date'),
                execution_count=execution_count,
                metadata=metadata,
                session=header.get('session'),
                username=header.get('username'),
                version=header.get('version'),
            ),
            msg_id=msg_id,
            msg_type=msg_type,
            parent_message=Message.load(
                execution_metadata=ExecutionMetadata.load(
                    date=parent_header.get('date'),
                    session=parent_header.get('session'),
                    username=parent_header.get('username'),
                    version=parent_header.get('version'),
                ),
                msg_id=parent_header.get('msg_id'),
                msg_type=parent_header.get('msg_type'),
            ),
            type=kwargs.get('type'),
        )

    @property
    def completed(self) -> bool:
        return ExecutionState.COMPLETED == self.execution_state

    def to_dict(self, **kwargs) -> Dict:
        return merge_dict(super().to_dict(**kwargs), dict(
            parent_message=self.parent_message.to_dict() if self.parent_message else None,
        ))


@dataclass
class Client(BaseDataClass):
    client = KernelClient = None
    message = Message = None

    def __post_init__(self):
        self.serialize_attribute_class('message', Message)
        self.client = self.client or init_kernel_client()

    def execute(self, code: str = None) -> Message:
        self.__preprocess()
        code = code or self.message.message

        if code:
            prepare_environment(
                self.client,
                code,
                initialize_database=(
                    self.message.execution_metadata.initialize_database
                    if self.message.execution_metadata else False
                ),
                reload_modules=(
                    self.message.execution_metadata.reload_modules
                    if self.message.execution_metadata else False
                ),
            )

            self.message.msg_id = self.client.execute(code)
            self.message.executed = True
        else:
            self.message.error = Error.load(**merge_dict(ApiError.RESOURCE_INVALID, dict(
                errors=[
                    'There is no code to execute.',
                ],
            )))

        return self.message

    def __preprocess(self) -> None:
        if isinstance(self.message, dict):
            self.message = Message.load(**self.message)
