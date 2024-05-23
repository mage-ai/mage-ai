from typing import List, Optional

from mage_ai.data.models.outputs.models import BaseOutput, OutputDisplay


class OutputManager:
    def __init__(self, outputs: Optional[List[BaseOutput]] = None):
        self.output = outputs or []

    def append(self, output: BaseOutput):
        self.output.append(output)

    def render(self) -> List[OutputDisplay]:
        return []

    async def render_async(self) -> List[OutputDisplay]:
        return []


# data_products = []
# outputs = []

# variable_type_mapping = {}

# def __callback(
#     data_from_yield,
#     b_uuid=b_uuid,
#     block=block,
#     csv_lines_only=csv_lines_only,
#     execution_partition=execution_partition,
#     idx=idx,
#     idx_inner=idx_inner,
#     input_data_types=input_data_types,
#     read_batch_settings=read_batch_settings,
#     read_chunks=read_chunks,
#     variable_uuid=variable_uuid,
# ):
#     data, is_data_product = format_output_data(
#         block,
#         data_from_yield,
#         variable_uuid,
#         block_uuid=b_uuid,
#         csv_lines_only=csv_lines_only,
#         execution_partition=execution_partition,
#     )

#     if is_data_product:
#         data_products.append(((idx, idx_inner), data, is_data_product))
#     else:
#         outputs.append(((idx, idx_inner), data, is_data_product))

# if (
#     not output_data
#     and variable_type is not None
#     and block_output.variable is not None
#     and block_output.variable.variable_type != variable_type
# ):
#     continue

# if variable_object.variable_type is not None:
#     variable_type_mapping[variable_object.variable_type] = variable_type_mapping.get(
#         variable_object.variable_type, []
#     )
#     variable_type_mapping[variable_object.variable_type].append(variable_uuid)

# yield (variable_object, sample, sample_count, __callback)

# arr = outputs + data_products
# arr_sorted = sorted(arr, key=lambda x: x[0])

# if len(data_products) >= len(outputs):
#     arr_sorted = [x[1] for x in arr_sorted]
# else:
#     arr_sorted = [x[1] for x in arr_sorted]

# if len(arr_sorted) >= 2 and any([vt for vt in variable_type_mapping.keys()]):
#     for item in arr_sorted[:DATAFRAME_SAMPLE_COUNT_PREVIEW]:
#         if isinstance(item, dict):
#             items.append(merge_dict(item, dict(multi_output=True)))
#         else:
#             items.append(item)
# else:
#     items.extend(arr_sorted)


# def get_outputs_for_display_sync(block, **kwargs) -> List[Dict[str, Any]]:
#     items = []

#     for outputs in handle_variables(block, items, **kwargs):
#         variable_object, sample, sample_count, __callback = outputs
#         data = variable_object.read_data(
#             sample=sample,
#             sample_count=sample_count,
#             spark=block.get_spark_session(),
#         )
#         __callback(data)

#     return items


# async def get_outputs_for_display_async(block, **kwargs) -> List[Dict[str, Any]]:
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
