from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.data_preparation.models.constants import (
    BlockType,
    ExecutorType,
    PipelineType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.shared.code import is_pyspark_code
from typing import Union


class ExecutorFactory:
    @classmethod
    def get_pipeline_executor(
        self,
        pipeline: Pipeline,
        execution_partition: Union[str, None] = None,
    ) -> PipelineExecutor:
        if pipeline.type == PipelineType.PYSPARK:
            from mage_ai.data_preparation.executors.pyspark_pipeline_executor import (
                PySparkPipelineExecutor,
            )
            return PySparkPipelineExecutor(pipeline)
        elif pipeline.type == PipelineType.STREAMING:
            from mage_ai.data_preparation.executors.streaming_pipeline_executor import (
                StreamingPipelineExecutor,
            )
            return StreamingPipelineExecutor(pipeline, execution_partition=execution_partition)
        else:
            return PipelineExecutor(pipeline)

    @classmethod
    def get_block_executor(
        self,
        pipeline: Pipeline,
        block_uuid: str,
        execution_partition: Union[str, None] = None,
        executor_type: Union[ExecutorType, str, None] = None,
    ) -> BlockExecutor:
        executor_kwargs = dict(
            pipeline=pipeline,
            block_uuid=block_uuid,
            execution_partition=execution_partition,
        )
        if executor_type is None:
            block = pipeline.get_block(block_uuid, check_template=True)
            if pipeline.type == PipelineType.PYSPARK and (
                block.type != BlockType.SENSOR or is_pyspark_code(block.content)
            ):
                executor_type = ExecutorType.PYSPARK
            else:
                executor_type = block.executor_type
        if executor_type == ExecutorType.PYSPARK:
            from mage_ai.data_preparation.executors.pyspark_block_executor import (
                PySparkBlockExecutor,
            )
            return PySparkBlockExecutor(**executor_kwargs)
        elif executor_type == ExecutorType.ECS:
            from mage_ai.data_preparation.executors.ecs_block_executor import (
                EcsBlockExecutor,
            )
            return EcsBlockExecutor(**executor_kwargs)
        elif executor_type == ExecutorType.GCP_CLOUD_RUN:
            from mage_ai.data_preparation.executors.gcp_cloud_run_block_executor import (
                GcpCloudRunBlockExecutor,
            )
            return GcpCloudRunBlockExecutor(**executor_kwargs)
        elif executor_type == ExecutorType.K8S:
            from mage_ai.data_preparation.executors.k8s_block_executor import (
                K8sBlockExecutor,
            )
            return K8sBlockExecutor(**executor_kwargs)
        else:
            return BlockExecutor(**executor_kwargs)
