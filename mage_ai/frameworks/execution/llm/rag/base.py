from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.frameworks.execution.llm.rag.pipelines.data_preparation import (
    DATA_PREPARATION,
)
from mage_ai.frameworks.execution.llm.rag.pipelines.inference import INFERENCE
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.enums import ExecutionFrameworkUUID
from mage_ai.frameworks.execution.models.pipeline.base import PipelineExecutionFramework

RAG = PipelineExecutionFramework(
    uuid=ExecutionFrameworkUUID.RAG,
    blocks=[
        BlockExecutionFramework(uuid=DATA_PREPARATION.uuid, type=BlockType.PIPELINE),
        BlockExecutionFramework(uuid=INFERENCE.uuid, type=BlockType.PIPELINE),
    ],
)
