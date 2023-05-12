import os
from typing import Union

from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.data_preparation.models.constants import (
    BlockType,
    ExecutorType,
    PipelineType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.shared.code import is_pyspark_code


class ExecutorFactory:
    @classmethod
    def get_default_executor_type(self):
        executor_type = os.getenv('DEFAULT_EXECUTOR_TYPE', ExecutorType.LOCAL_PYTHON)
        if ExecutorType.is_valid_type(executor_type):
            return executor_type
        return ExecutorType.LOCAL_PYTHON

    @classmethod
    def get_pipeline_executor_type(
        self,
        pipeline: Pipeline,
        executor_type: Union[ExecutorType, str, None] = None,
    ):
        if executor_type is None:
            if pipeline.type == PipelineType.PYSPARK:
                executor_type = ExecutorType.PYSPARK
            else:
                executor_type = pipeline.executor_type
                if executor_type == ExecutorType.LOCAL_PYTHON or executor_type is None:
                    # Use default executor type
                    executor_type = self.get_default_executor_type()
        return executor_type

    @classmethod
    def get_pipeline_executor(
        self,
        pipeline: Pipeline,
        execution_partition: Union[str, None] = None,
        executor_type: Union[ExecutorType, str, None] = None,
    ) -> PipelineExecutor:
        """Get the pipeline executor based on pipeline type or pipeline executor_type.
        If the executor_type is not specified in the method. Infer the executor_type with the
        following rules:
        1. If the pipeline type is PYSPARK, then use PYSPARK executor.
        2. If the pipeline executor_type is LOCAL_PYTHON (default one) or None, and the
            "DEFAULT_EXECUTOR_TYPE" environment variable is set, use the executor type from
            "DEFAULT_EXECUTOR_TYPE" environment variable. Otherwise, use the executor type from
            pipeline's executor_type.
            a. If the executor_type is "k8s", use K8sPipelineExecutor.
            b. If the pipeline type is STREAMING, use StreamingPipelineExecutor.
            c. Otherwise, use default PipelineExecutor.

        TODO: Add pipeline executor for ECS, GCP_CLOUD_RUN executor_type

        Args:
            pipeline (Pipeline): The pipeline to be executed.
            execution_partition (Union[str, None], optional): The execution partition of the
                pipeline run.
            executor_type (Union[ExecutorType, str, None], optional): If the executor_type is
                specified. Use this executor_type directly.        """

        executor_type = self.get_pipeline_executor_type(pipeline, executor_type=executor_type)
        if executor_type == ExecutorType.PYSPARK:
            from mage_ai.data_preparation.executors.pyspark_pipeline_executor import (
                PySparkPipelineExecutor,
            )

            # Run pipeline on EMR cluster
            return PySparkPipelineExecutor(pipeline)
        elif executor_type == ExecutorType.K8S:
            from mage_ai.data_preparation.executors.k8s_pipeline_executor import (
                K8sPipelineExecutor,
            )
            return K8sPipelineExecutor(pipeline, execution_partition=execution_partition)
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
        """Get the block executor based on block executor_type.
        If the executor_type is not specified in the method. Infer the executor_type with the
        following rules:
        1. If the pipeline type is PYSPARK and block code contains "spark", then use
            PYSPARK executor.
        2. If the block executor_type is LOCAL_PYTHON (default one) and the "DEFAULT_EXECUTOR_TYPE"
            environment variable is set, use the executor type from "DEFAULT_EXECUTOR_TYPE"
            environment variable.
        3. Otherwise, use the executor type from block's executor_type.

        Args:
            pipeline (Pipeline): Pipeline object.
            block_uuid (str): The uuid of the block to be executed.
            execution_partition (Union[str, None], optional): The execution partition of the
                block run.
            executor_type (Union[ExecutorType, str, None], optional): If the executor_type is
                specified. Use this executor_type directly.
        """
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
                if executor_type == ExecutorType.LOCAL_PYTHON:
                    # Use default executor type
                    executor_type = self.get_default_executor_type()
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
