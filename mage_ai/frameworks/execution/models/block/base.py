from dataclasses import dataclass
from typing import List, Optional, Union

from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.models.base import BaseExecutionFramework
from mage_ai.frameworks.execution.models.block.models import Configuration
from mage_ai.frameworks.execution.models.enums import ExecutionFrameworkUUID, GroupUUID


@dataclass
class BlockExecutionFramework(BaseExecutionFramework):
    configuration: Optional[Configuration] = None
    downstream_blocks: Optional[List[Union[GroupUUID, ExecutionFrameworkUUID]]] = None
    type: Optional[BlockType] = BlockType.GROUP
    upstream_blocks: Optional[List[Union[GroupUUID, ExecutionFrameworkUUID]]] = None

    def __post_init__(self):
        self.serialize_attribute_class('configuration', Configuration)
        self.serialize_attribute_enums('downstream_blocks', [GroupUUID, ExecutionFrameworkUUID])
        self.serialize_attribute_enums('upstream_blocks', [GroupUUID, ExecutionFrameworkUUID])
        self.serialize_attribute_enum('type', BlockType)
