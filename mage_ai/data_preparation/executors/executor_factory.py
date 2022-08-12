from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.data_preparation.executors.ecs_block_executor import EcsBlockExecutor
from mage_ai.data_preparation.executors.k8s_block_executor import K8sBlockExecutor
from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.data_preparation.executors.pyspark_block_executor import PySparkBlockExecutor
from mage_ai.data_preparation.executors.pyspark_pipeline_executor import PySparkPipelineExecutor
from mage_ai.data_preparation.models.constants import ExecutorType, PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline


class ExecutorFactory:
    @classmethod
    def get_pipeline_executor(
        self,
        pipeline: Pipeline,
        executor_type: ExecutorType = None
    ) -> PipelineExecutor:
        if executor_type is None:
            if pipeline.type == PipelineType.PYSPARK:
                executor_type = ExecutorType.PYSPARK
            else:
                executor_type = ExecutorType.LOCAL_PYTHON
        if executor_type == ExecutorType.PYSPARK:
            return PySparkPipelineExecutor(pipeline)
        else:
            return PipelineExecutor(pipeline)

    @classmethod
    def get_block_executor(
        self,
        pipeline: Pipeline,
        block_uuid: str,
        executor_type: ExecutorType = None
    ) -> BlockExecutor:
        if executor_type is None:
            if pipeline.type == PipelineType.PYSPARK:
                executor_type = ExecutorType.PYSPARK
            else:
                executor_type = ExecutorType.LOCAL_PYTHON
        if executor_type == ExecutorType.PYSPARK:
            return PySparkBlockExecutor(pipeline, block_uuid)
        elif executor_type == ExecutorType.ECS:
            return EcsBlockExecutor(pipeline, block_uuid)
        elif executor_type == ExecutorType.K8S:
            return K8sBlockExecutor(pipeline, block_uuid)
        else:
            return BlockExecutor(pipeline, block_uuid)
