from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
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
            from mage_ai.data_preparation.executors.pyspark_pipeline_executor \
                import PySparkPipelineExecutor
            return PySparkPipelineExecutor(pipeline)
        else:
            return PipelineExecutor(pipeline)

    @classmethod
    def get_block_executor(
        self,
        pipeline: Pipeline,
        block_uuid: str,
        execution_partition: str = None,
        executor_type: ExecutorType = None,
    ) -> BlockExecutor:
        executor_kwargs = dict(
            pipeline=pipeline,
            block_uuid=block_uuid,
            execution_partition=execution_partition,
        )
        if executor_type is None:
            if pipeline.type == PipelineType.PYSPARK:
                executor_type = ExecutorType.PYSPARK
            else:
                executor_type = pipeline.get_block(block_uuid).executor_type
        if executor_type == ExecutorType.PYSPARK:
            from mage_ai.data_preparation.executors.pyspark_block_executor \
                import PySparkBlockExecutor
            return PySparkBlockExecutor(**executor_kwargs)
        elif executor_type == ExecutorType.ECS:
            from mage_ai.data_preparation.executors.ecs_block_executor \
                import EcsBlockExecutor
            return EcsBlockExecutor(**executor_kwargs)
        elif executor_type == ExecutorType.K8S:
            from mage_ai.data_preparation.executors.k8s_block_executor \
                import K8sBlockExecutor
            return K8sBlockExecutor(**executor_kwargs)
        else:
            return BlockExecutor(**executor_kwargs)
