from typing import List, Optional, Union

from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.base import BaseExecutionFramework
from mage_ai.frameworks.execution.models.block.models import Configuration
from mage_ai.frameworks.execution.models.enums import ExecutionFrameworkUUID, GroupUUID


class BlockExecutionFramework(BaseExecutionFramework):
    def __init__(
        self,
        *args,
        configuration: Optional[Configuration] = None,
        downstream_blocks: Optional[List[Union[GroupUUID, ExecutionFrameworkUUID]]] = None,
        type: Optional[BlockType] = BlockType.GROUP,
        upstream_blocks: Optional[List[Union[GroupUUID, ExecutionFrameworkUUID]]] = None,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)
        self.configuration = configuration
        self.downstream_blocks = downstream_blocks
        self.type = type
        self.upstream_blocks = upstream_blocks
