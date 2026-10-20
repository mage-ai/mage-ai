from mage_ai.frameworks.execution.llm.rag.base import RAG
from mage_ai.frameworks.execution.models.enums import ExecutionFrameworkUUID

EXECUTION_FRAMEWORKS = [
    RAG,
]

EXECUTION_FRAMEWORKS_BY_UUID = {
    ExecutionFrameworkUUID.RAG: RAG,
}
