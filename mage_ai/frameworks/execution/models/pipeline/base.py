from typing import List, Optional

from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.frameworks.execution.models.base import BaseExecutionFramework
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework


class PipelineExecutionFramework(BaseExecutionFramework):
    def __init__(
        self,
        *args,
        blocks: Optional[List[BlockExecutionFramework]] = None,
        type: Optional[PipelineType] = PipelineType.EXECUTION_FRAMEWORK,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)
        self.blocks = blocks or []
        self.type = type
