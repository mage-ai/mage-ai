from mage_ai.frameworks.execution.llm.rag.base import RAG
from mage_ai.frameworks.execution.models.enums import ExecutionFrameworkUUID
from mage_ai.frameworks.execution.models.pipeline.base import PipelineExecutionFramework

STANDARD = PipelineExecutionFramework.load(uuid=ExecutionFrameworkUUID.STANDARD)
EXECUTION_FRAMEWORKS = [
    RAG,
    STANDARD,
]

EXECUTION_FRAMEWORKS_BY_UUID = {
    ExecutionFrameworkUUID.RAG: RAG,
    ExecutionFrameworkUUID.STANDARD: STANDARD,
}
