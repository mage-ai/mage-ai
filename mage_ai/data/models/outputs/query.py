import os
from functools import reduce
from typing import Any, List, Optional

from pandas.core.internals.managers import Callable

from mage_ai.data.constants import ChunkKeyTypeUnion
from mage_ai.data.models.generator import DataGenerator
from mage_ai.data.models.outputs.models import BlockOutput, BlockOutputManager
from mage_ai.data.tabular.models import BatchSettings
from mage_ai.data.variables.constants import GLOBAL_DIRECTORY_NAME
from mage_ai.data_preparation.models.block.utils import is_output_variable
from mage_ai.data_preparation.models.interfaces import BlockInterface, PipelineInterface
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.data_preparation.variable_manager import VariableManager
from mage_ai.shared.strings import to_ordinal_integers


class BaseOutputQuery:
    def __init__(
        self,
        batch_settings: Optional[BatchSettings] = None,
        chunks: Optional[List[ChunkKeyTypeUnion]] = None,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(*args, **kwargs)

        self.batch_settings = batch_settings
        self.chunks = chunks


class BlockOutputQueryMixin:
    def __init__(
        self,
        block: Optional[BlockInterface] = None,
        block_uuid: Optional[str] = None,
        pipeline: Optional[PipelineInterface] = None,
        spark: Optional[Any] = None,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(*args, **kwargs)

        self._block_uuid = block_uuid
        self._block = block
        self._pipeline = pipeline
        self._spark = spark

    @property
    def block(self) -> BlockInterface:
        if not self._block and self.block_uuid and self.pipeline:
            self._block = self.pipeline.get_block(self.block_uuid)
        if not self._block:
            raise Exception(
                'Block doesn’t exist for block '
                f'{self.block_uuid or self.block.uuid if self.block else "UUID missing"}'
            )
        return self._block

    @property
    def block_uuid(self) -> str:
        return self._block_uuid or self.block.uuid

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


class BlockOutputQuery(BlockOutputQueryMixin, BaseOutputQuery):
    @property
    def spark(self) -> Optional[Any]:
        if not self._spark and self.block:
            self._spark = self.block.get_spark_session()
        return self._spark

    def find(
        self,
        variable_uuid: str,
        block_uuid: Optional[str] = None,  # Allow clients to pass in a block_uuid
        clean_block_uuid: bool = True,
        partition: Optional[str] = None,
        pipeline_uuid: Optional[str] = None,
        raise_exception: Optional[bool] = None,
        # dynamic_block_index: Optional[int] = None,
        # dynamic_block_uuid: Optional[str] = None,
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
        from mage_ai.data_preparation.models.block.dynamic.utils import (
            uuid_for_output_variables,
        )

        # No need for this anymore
        # block_uuid, block_uuid_changed = uuid_for_output_variables(
        #     self.block,
        #     block_uuid=block_uuid,
        #     dynamic_block_index=dynamic_block_index,
        #     dynamic_block_uuid=dynamic_block_uuid,
        # )
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
            block_uuid=block_uuid or self.block_uuid,
            clean_block_uuid=clean_block_uuid,
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
        block_uuid: Optional[str] = None,
        clean_block_uuid: bool = True,
        limit: Optional[int] = None,
        load_filter: Optional[Callable[[BlockOutput], bool]] = None,
        partition: Optional[str] = None,
        pipeline_uuid: Optional[str] = None,
        raise_exception: Optional[bool] = None,
        scan: Optional[bool] = None,
        scan_filter: Optional[Callable[[str], bool]] = None,
        sort: Optional[Callable[[BlockOutput], Any]] = None,
    ) -> BlockOutputManager:
        """
        From: fetch_output_variables

        block.get_outputs: data loaded from disk
        block.get_outputs_for_dynamic_child: data loaded from disk
        block.get_raw_outputs
            -> pipeline.get_block_variable: data loaded from disk
                -> block.get_variable: data loaded from disk
        block.get_variable: data loaded from disk
        pipeline.get_block_variable
            -> block.get_variable: data loaded from disk
        """

        def __load_output(
            acc: List[BlockOutput],
            variable: Variable,
            block_uuid=block_uuid,
            clean_block_uuid=clean_block_uuid,
            load_filter=load_filter,
            pipeline_uuid=pipeline_uuid,
        ) -> List[BlockOutput]:
            block_output = self.find(
                variable.uuid,
                block_uuid=block_uuid,
                clean_block_uuid=clean_block_uuid,
                partition=partition,
                pipeline_uuid=pipeline_uuid,
                raise_exception=raise_exception,
            )

            if not load_filter or load_filter(block_output):
                acc.append(block_output)

            return acc

        variables_with_uuid = self.variable_manager.get_variable_uuids(
            block_uuid=block_uuid or self.block_uuid,
            clean_block_uuid=clean_block_uuid,
            max_results=limit,
            partition=partition,
            pipeline_uuid=pipeline_uuid,
        )

        if scan_filter:
            variables_with_uuid = [
                variable for variable in variables_with_uuid if scan_filter(variable.uuid)
            ]

        if scan:
            block_outputs = [
                BlockOutput(block=self.block, variable=variable)
                for variable in variables_with_uuid
            ]
        else:
            block_outputs = reduce(__load_output, variables_with_uuid, [])

        if sort:
            block_outputs = sorted(block_outputs, key=sort)

        return BlockOutputManager(data=block_outputs, block=self.block)


class DynamicBlockOutputQuery(BlockOutputQueryMixin, BaseOutputQuery):
    @property
    def dynamic(self) -> bool:
        from mage_ai.data_preparation.models.block.dynamic.utils import is_dynamic_block

        return is_dynamic_block(self.block)

    @property
    def dynamic_child(self) -> bool:
        from mage_ai.data_preparation.models.block.dynamic.utils import (
            is_dynamic_block_child,
        )

        return is_dynamic_block_child(self.block)

    def fetch(
        self,
        dynamic_block_index: Optional[int] = None,
        limit: Optional[int] = None,
        partition: Optional[str] = None,
    ) -> BlockOutputManager:
        """
        If dynamic_block_index, get the folder names in the nested folder named after the
        dynamic_block_index (e.g. 0):
            0/
                output_0/
                output_1/

        Or else:
            output_0/
            output_1/
        """

        """
        If block is a dynamic child block, get the variable objects specifically in the directory
        named after the dynamic_block_index:
            0/
                output_0/
        """

        def __sort(block_output: BlockOutput):
            if block_output is None or block_output.variable is None:
                return -96, -96

            return (
                to_ordinal_integers(block_output.variable.block_dir_name)[0],
                block_output.variable.uuid,
            )

        block_outputs = []

        block_uuid = self.block_uuid
        if self.dynamic_child and dynamic_block_index is not None:
            block_uuid = os.path.join(self.block_uuid, str(dynamic_block_index))

        output_query = BlockOutputQuery(
            block=self.block, block_uuid=block_uuid, pipeline=self.block.pipeline
        )

        if self.dynamic_child and dynamic_block_index is None:
            """
            This method will get the nested outputs (output_0) in every numeric folder
            named after the dynamic_block_index (e.g. 0/).
            """
            dir_path = self.variable_manager.variable_dir_path(
                block_uuid=block_uuid,
                partition=partition,
            )

            dynamic_block_indexes = self.variable_manager.storage.listdir(
                dir_path,
                max_results=limit,
            )
            dynamic_block_indexes = [
                dirname for dirname in dynamic_block_indexes if dirname.isdigit()
            ]
            dynamic_block_indexes = sorted(dynamic_block_indexes, key=lambda x: int(x))

            for d_index in dynamic_block_indexes:
                """
                block_uuid:
                    load_data/

                    d_index:
                        0/
                        1/
                """
                variable_uuids = self.variable_manager.storage.listdir(
                    os.path.join(dir_path, str(d_index))
                )
                variable_uuids = [
                    variable_uuid
                    for variable_uuid in variable_uuids
                    if is_output_variable(variable_uuid)
                ]
                variable_uuids = sorted(variable_uuids)
                """
                block_uuid:
                    load_data/

                    d_index:
                        0/
                        1/

                        variable_uuid:
                            output_0/
                            output_1/
                """
                block_outputs.append(
                    DataGenerator([
                        output_query.find(
                            variable_uuid,
                            # block_uuid:
                            #   load_data/0
                            block_uuid=os.path.join(block_uuid, str(d_index)),
                            clean_block_uuid=False,
                            partition=partition,
                        )
                        for variable_uuid in variable_uuids
                    ])
                )
        else:
            # If dynamic, default to using the BlockOutputQuery
            block_outputs += output_query.fetch(
                clean_block_uuid=dynamic_block_index is None,
                scan_filter=lambda variable_uuid: variable_uuid != '',
                partition=partition,
                sort=__sort,
            )

        return BlockOutputManager(data=block_outputs, block=self.block)
