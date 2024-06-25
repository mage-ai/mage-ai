from typing import List, Optional, Union

from mage_ai.frameworks.execution.models.enums import ExecutionFrameworkUUID, GroupUUID


class BaseExecutionFramework:
    def __init__(
        self,
        uuid: Union[GroupUUID, ExecutionFrameworkUUID],
        execution_framework: Optional[ExecutionFrameworkUUID] = None,
        groups: Optional[List[Union[GroupUUID, ExecutionFrameworkUUID]]] = None,
        name: Optional[str] = None,
    ):
        self.execution_framework = execution_framework
        self.groups = groups
        self.name = name
        self.uuid = uuid
