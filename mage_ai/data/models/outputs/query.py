from functools import reduce
from typing import Any, List, Optional

from pandas.core.internals.managers import Callable

from mage_ai.data.models.outputs.models import BlockOutput
from mage_ai.data.tabular.models import BatchSettings
from mage_ai.data.variables.constants import GLOBAL_DIRECTORY_NAME
from mage_ai.data_preparation.models.block.dynamic.utils import (
    uuid_for_output_variables,
)
from mage_ai.data_preparation.models.block.settings.variables.models import (
    ChunkKeyTypeUnion,
)
from mage_ai.data_preparation.models.interfaces import BlockInterface, PipelineInterface
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.data_preparation.variable_manager import VariableManager


class BaseOutputQuery:
    pass


class BlockOutputQuery(BaseOutputQuery):
    def __init__(
        self,
        batch_settings: Optional[BatchSettings] = None,
        block: Optional[BlockInterface] = None,
        block_uuid: Optional[str] = None,
        chunks: Optional[List[ChunkKeyTypeUnion]] = None,
        pipeline: Optional[PipelineInterface] = None,
        spark: Optional[Any] = None,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(*args, **kwargs)

        self.batch_settings = batch_settings
        self.chunks = chunks

        self._block_uuid = block_uuid
        self._block = block
        self._pipeline = pipeline
        self._spark = spark

    @property
    def block(self) -> Optional[BlockInterface]:
        if not self._block and self.block_uuid and self.pipeline:
            self._block = self.pipeline.get_block(self.block_uuid)
        return self._block

    @property
    def block_uuid(self) -> Optional[str]:
        return self._block_uuid or (self.block.uuid if self.block else None)

    @property
    def pipeline(self) -> Optional[PipelineInterface]:
        if not self._pipeline and self.block:
            self._pipeline = self.block.pipeline
        return self._pipeline

    @property
    def variable_manager(self) -> VariableManager:
        if self.pipeline is None:
            raise Exception(
                'Variable manager doesn’t exist for block '
                f'{self.block_uuid or self.block.uuid if self.block else "UUID missing"}'
            )
        return self.pipeline.variable_manager

    @property
    def spark(self) -> Optional[Any]:
        if not self._spark and self.block:
            self._spark = self.block.get_spark_session()
        return self._spark

    def find(
        self,
        variable_uuid: str,
        # Dynamic blocks
        dynamic_block_index: Optional[int] = None,
        dynamic_block_uuid: Optional[str] = None,
        partition: Optional[str] = None,
        pipeline_uuid: Optional[str] = None,
        limit: Optional[int] = None,  # sample_count
        raise_exception: Optional[bool] = None,
    ) -> BlockOutput:
        """
        block.get_variable_object -> get_variable(read_data=False): variable model

        block.output_variable_objects: variable models
        block.variable_object: variable model
        """

        """
        Methods that use this:
            block.get_variables_by_block
            block.get_variable
            block.get_variable_object

        Methods that DON’T use this:
            block.output_variable_objects: variable models
            block.variable_object: variable model
        """
        block_uuid, block_uuid_changed = uuid_for_output_variables(
            self.block,
            block_uuid=self.block_uuid,
            dynamic_block_index=dynamic_block_index,
            dynamic_block_uuid=dynamic_block_uuid,
        )

        # Need the logic of
        # if spark is not None and variable_type == VariableType.DATAFRAME:
        #     variable_type = VariableType.SPARK_DATAFRAME
        #
        # save_outputs_async
        # input_variable_objects -> R block = -8.3144598
        # output_variable_objects -> ChartDataSourceBlock
        # variable_object( -> R
        variable = Variable(
            variable_uuid,
            self.variable_manager.pipeline_path(
                pipeline_uuid or self.pipeline.uuid if self.pipeline else None
            ),
            block_uuid or GLOBAL_DIRECTORY_NAME,
            clean_block_uuid=not block_uuid_changed,
            partition=partition,
            read_batch_settings=self.batch_settings,
            read_chunks=self.chunks,
            spark=self.spark,
            storage=self.variable_manager.storage,
            # variable_type=variable_type,
        )

        return BlockOutput(block=self.block, variable=variable)

    def fetch(
        self,
        clean_block_uuid: bool = True,
        dynamic_block_index: Optional[int] = None,
        dynamic_block_uuid: Optional[str] = None,
        limit: Optional[int] = None,  # sample_count
        load_filter: Optional[Callable[[BlockOutput], bool]] = None,
        partition: Optional[str] = None,
        pipeline_uuid: Optional[str] = None,
        raise_exception: Optional[bool] = None,
        scan: Optional[bool] = None,
        scan_filter: Optional[Callable[[str], bool]] = None,
        sort: Optional[Callable[[BlockOutput], Any]] = None,
    ) -> List[BlockOutput]:
        """
        From: fetch_output_variables

        block.get_outputs: data loaded from disk
        block.get_outputs_async: data loaded from disk
        block.get_raw_outputs
            -> pipeline.get_block_variable: data loaded from disk
                -> block.get_variable: data loaded from disk
        block.get_variable: data loaded from disk
        pipeline.get_block_variable
            -> block.get_variable: data loaded from disk
        """

        variables_with_uuid = self.variable_manager.get_variable_uuids(
            block_uuid=self.block.uuid if self.block else None,
            max_results=limit,
            partition=partition,
            pipeline_uuid=pipeline_uuid,
        )

        if scan_filter:
            variables_with_uuid = [
                variable for variable in variables_with_uuid if scan_filter(variable.uuid)
            ]

        if scan:
            return [
                BlockOutput(block=self.block, variable=variable)
                for variable in variables_with_uuid
            ]

        def __load_output(
            acc: List[BlockOutput],
            variable: Variable,
            load_filter=load_filter,
            pipeline_uuid=pipeline_uuid,
        ) -> List[BlockOutput]:
            block_output = self.find(
                variable.uuid,
                # Dynamic blocks
                dynamic_block_index=dynamic_block_index,
                dynamic_block_uuid=dynamic_block_uuid,
                limit=limit,
                partition=partition,
                pipeline_uuid=pipeline_uuid,
                raise_exception=raise_exception,
            )

            if not load_filter or load_filter(block_output):
                acc.append(block_output)

            return acc

        block_outputs = reduce(__load_output, variables_with_uuid, [])
        if sort:
            block_outputs = sorted(block_outputs, key=sort)
        return block_outputs
