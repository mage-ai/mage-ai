# from typing import Any, Dict, List, Optional, Tuple, Union

# from mage_ai.data.models.generator import DataGenerator
# from mage_ai.data.models.outputs.formatter import format_output_data
# from mage_ai.data_preparation.models.constants import (
#     DATAFRAME_SAMPLE_COUNT_PREVIEW,
#     DYNAMIC_CHILD_BLOCK_SAMPLE_COUNT_PREVIEW,
# )
# from mage_ai.data_preparation.models.interfaces import BlockInterface


# def present_block_outputs(
#     block: BlockInterface,
#     manager: DataGenerator,
#     sample_data: Optional[bool] = None,
#     take: Optional[int] = None,
# ) -> List[Dict[str, Any]]:
#     items = []

#     for outputs in handle_variables(block, items, **kwargs):
#         variable_object, sample_data, take, __callback = outputs
#         data = variable_object.read_data(
#             sample_data=sample_data,
#             take=take,
#             spark=block.get_spark_session(),
#         )
#         __callback(data)

#     return items

# async def present_block_outputs_async(
#     block: BlockInterface,
#     manager: DataGenerator,
#     sample_data: Optional[bool] = None,
#     take: Optional[int] = None,
# ) -> List[Dict[str, Any]]:*kwargs) -> List[Dict[str, Any]]:
#     items = []

#     for outputs in handle_variables(block, items, **kwargs):
#         variable_object, sample, sample_count, __callback = outputs
#         data = await variable_object.read_data_async(
#             sample=sample,
#             sample_count=sample_count,
#             spark=block.get_spark_session(),
#         )
#         __callback(data)

#     return items


# def present_dynamic_block_outputs(
#     block: BlockInterface,
#     manager: DataGenerator,
#     dynamic: Optional[bool] = None,
#     dynamic_child: Optional[bool] = None,
#     sample_data: Optional[bool] = None,
#     take: Optional[int] = None,
# ) -> List[Dict[str, Any]]:
#     sample_count_use = take or DYNAMIC_CHILD_BLOCK_SAMPLE_COUNT_PREVIEW
#     output_sets = []
#     variable_sets = []

#     if dynamic_child:
#         pass
#         lazy_variable_controller = get_outputs_for_dynamic_child(
#             block,
#             execution_partition=execution_partition,
#             sample=sample_data or False,
#             sample_count=sample_count_use,
#         )
#         variable_sets: List[
#             Union[
#                 Tuple[Optional[Any], Dict],
#                 List[LazyVariableSet],
#             ],
#         ] = lazy_variable_controller.render(
#             dynamic_block_index=dynamic_block_index,
#             lazy_load=True,
#         )
#     elif dynamic:
#         output_pair: List[
#             Optional[
#                 Union[
#                     Any,
#                     Dict,
#                     int,
#                     pd.DataFrame,
#                     str,
#                 ]
#             ]
#         ] = get_outputs_for_dynamic_block(
#             self,
#             execution_partition=execution_partition,
#             sample_data=sample_data,
#             take=sample_count_use,
#         )
#         output_sets.append(output_pair)

#     output_sets = output_sets[:DATAFRAME_SAMPLE_COUNT_PREVIEW]
#     variable_sets = variable_sets[:DATAFRAME_SAMPLE_COUNT_PREVIEW]
#     child_data_sets = [lazy_variable_set.read_data() for lazy_variable_set in variable_sets]

#     return get_outputs_for_display_dynamic_block(
#         self,
#         output_sets,
#         child_data_sets,
#         block_uuid=block_uuid,
#         csv_lines_only=csv_lines_only,
#         exclude_blank_variable_uuids=exclude_blank_variable_uuids,
#         execution_partition=execution_partition,
#         metadata=metadata,
#         sample_data=sample_data,
#         take=sample_count_use,
#     )


# def get_outputs_for_display_dynamic_block(
#     block,
#     output_sets: List[Tuple],
#     child_data_sets: List[Tuple[Any, Any]],
#     block_uuid: Optional[str] = None,
#     csv_lines_only: bool = False,
#     exclude_blank_variable_uuids: bool = False,
#     execution_partition: Optional[str] = None,
#     metadata: Optional[Dict] = None,
#     sample: bool = True,
#     sample_count: Optional[int] = None,
# ) -> List[Dict[str, Any]]:
#     data_products = []
#     outputs = []

#     block_uuid = block_uuid if block_uuid else block.uuid

#     for idx, pairs in enumerate(child_data_sets):
#         child_data, metadata = pairs
#         formatted_outputs = []

#         if child_data and isinstance(child_data, list) and len(child_data) >= 1:
#             for output_idx, output in enumerate(child_data):
#                 output_formatted, _ = format_output_data(
#                     block,
#                     output,
#                     f'output {output_idx}',
#                     block_uuid=block_uuid,
#                     csv_lines_only=csv_lines_only,
#                     execution_partition=execution_partition,
#                 )
#                 formatted_outputs.append(output_formatted)

#             data_products.append(
#                 dict(
#                     outputs=formatted_outputs,
#                     type=DataType.GROUP,
#                     variable_uuid=f'Dynamic child {idx}',
#                 )
#             )
#         else:
#             output_sets.append((child_data, metadata))

#     for output_pair in output_sets:
#         child_data = None
#         metadata = None
#         if len(output_pair) >= 1:
#             child_data = output_pair[0]
#             if len(output_pair) >= 2:
#                 metadata = output_pair[1]

#         for output, variable_uuid in [
#             (child_data, 'dynamic output data'),
#             (metadata, 'metadata'),
#         ]:
#             if output is None or (exclude_blank_variable_uuids and variable_uuid.strip() == ''):
#                 continue

#             data, is_data_product = format_output_data(
#                 block,
#                 output,
#                 variable_uuid,
#                 block_uuid=block_uuid,
#                 csv_lines_only=csv_lines_only,
#                 execution_partition=execution_partition,
#             )

#             outputs_below_limit = not sample or not sample_count
#             if is_data_product:
#                 outputs_below_limit = outputs_below_limit or (
#                     sample_count is not None and len(data_products) < sample_count
#                 )
#             else:
#                 outputs_below_limit = outputs_below_limit or (
#                     sample_count is not None and len(outputs) < sample_count
#                 )

#             if outputs_below_limit:
#                 data['multi_output'] = True
#                 if is_data_product:
#                     data_products.append(data)
#                 else:
#                     outputs.append(data)

#     return outputs + data_products


# # Data integrations
# # from mage_ai/data_preparation/models/pipeline.py
# # def get_block_variable(
# #     self,
# #     block_uuid: str,
# #     variable_name: str,
# #     from_notebook: bool = False,
# #     global_vars: Dict = None,
# #     input_args: List[Any] = None,
# #     partition: str = None,
# #     raise_exception: bool = False,
# #     spark=None,
# #     index: int = None,
# #     sample_count: int = None,
# #     dynamic_block_index: int = None,
# #     dynamic_block_uuid: str = None,
# #     input_data_types: Optional[List[InputDataType]] = None,
# #     read_batch_settings: Optional[BatchSettings] = None,
# #     read_chunks: Optional[List[ChunkKeyTypeUnion]] = None,
# #     write_batch_settings: Optional[BatchSettings] = None,
# #     write_chunks: Optional[List[ChunkKeyTypeUnion]] = None,
# # ):
# #     block = self.get_block(block_uuid)
# #     data_integration_settings = block.get_data_integration_settings(
# #         from_notebook=from_notebook,
# #         global_vars=global_vars,
# #         input_vars=input_args,
# #         partition=partition,
# #     )

# #     if data_integration_settings:
# #         return convert_outputs_to_data(
# #             block,
# #             data_integration_settings.get('catalog'),
# #             from_notebook=from_notebook,
# #             index=index,
# #             partition=partition,
# #             sample_count=sample_count,
# #             data_integration_uuid=data_integration_settings.get('data_integration_uuid'),
# #             stream_id=variable_name,
# #         )

# #     variable = block.get_variable(
# #         block_uuid=block_uuid,
# #         partition=partition,
# #         raise_exception=raise_exception,
# #         spark=spark,
# #         variable_uuid=variable_name,
# #         dynamic_block_index=dynamic_block_index,
# #         dynamic_block_uuid=dynamic_block_uuid,
# #         input_data_types=input_data_types,
# #         read_batch_settings=read_batch_settings,
# #         read_chunks=read_chunks,
# #         write_batch_settings=write_batch_settings,
# #         write_chunks=write_chunks,
# #     )

# #     return variable
