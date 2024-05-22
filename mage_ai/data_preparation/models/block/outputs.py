import json
import os
from typing import Any, Dict, List, Optional, Tuple, Union

import pandas as pd
import polars as pl
import simplejson
from sklearn.utils import estimator_html_repr

from mage_ai.ai.utils.xgboost import render_tree_visualization
from mage_ai.data.constants import InputDataType
from mage_ai.data.models.constants import CHUNKS_DIRECTORY_NAME
from mage_ai.data.models.outputs.manager import OutputManager
from mage_ai.data.models.outputs.models import BlockOutput
from mage_ai.data.tabular.models import BatchSettings
from mage_ai.data.tabular.reader import read_metadata
from mage_ai.data.tabular.utils import (
    convert_series_list_to_dataframe,
    series_to_dataframe,
)
from mage_ai.data_cleaner.shared.utils import is_geo_dataframe, is_spark_dataframe
from mage_ai.data_preparation.models.block.dynamic.utils import (
    is_dynamic_block,
    is_dynamic_block_child,
)
from mage_ai.data_preparation.models.block.settings.variables.models import (
    ChunkKeyTypeUnion,
)
from mage_ai.data_preparation.models.constants import (
    DATAFRAME_ANALYSIS_MAX_COLUMNS,
    DATAFRAME_SAMPLE_COUNT,
    DATAFRAME_SAMPLE_COUNT_PREVIEW,
)
from mage_ai.data_preparation.models.utils import infer_variable_type, is_primitive
from mage_ai.data_preparation.models.variables.constants import VariableType
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.shared.parsers import (
    convert_matrix_to_dataframe,
    encode_complex,
    has_to_dict,
)


def format_output_data(
    block,
    data: Any,
    variable_uuid: str,
    block_uuid: Optional[str] = None,
    csv_lines_only: Optional[bool] = False,
    execution_partition: Optional[str] = None,
    skip_dynamic_block: bool = False,
    automatic_sampling: bool = False,
    sample_count: Optional[int] = None,
) -> Tuple[Dict, bool]:
    """
    Takes variable data and formats it to return to the frontend.

    Returns:
        Tuple[Dict, bool]: Tuple of the formatted data and is_data_product boolean. Data product
            outputs and non data product outputs are handled slightly differently.
    """
    if not block_uuid:
        block_uuid = block.uuid

    variable_type, basic_iterable = infer_variable_type(data)

    variable_manager = block.pipeline.variable_manager

    is_dynamic_child = is_dynamic_block_child(block)
    is_dynamic = is_dynamic_block(block)

    if VariableType.SERIES_PANDAS == variable_type:
        if automatic_sampling and not sample_count:
            sample_count = min(len(data), DATAFRAME_SAMPLE_COUNT)
        if basic_iterable:
            data = pd.DataFrame(data).T
        else:
            data = data.to_frame()
    elif VariableType.SERIES_POLARS == variable_type:
        if automatic_sampling and not sample_count:
            sample_count = min(len(data), DATAFRAME_SAMPLE_COUNT)
        if basic_iterable:
            data = convert_series_list_to_dataframe(data)
        else:
            data = series_to_dataframe(data)
    elif VariableType.ITERABLE == variable_type and isinstance(data, list):
        data = pd.Series(data).to_frame()

    if VariableType.MATRIX_SPARSE == variable_type:
        if automatic_sampling and not sample_count:
            n_rows, n_cols = data.shape
            max_dims = min(
                DATAFRAME_ANALYSIS_MAX_COLUMNS * DATAFRAME_SAMPLE_COUNT, n_rows * n_cols
            )
            sample_count = round(max_dims / n_cols)
        if basic_iterable:
            data = convert_matrix_to_dataframe(data[0])
        else:
            data = convert_matrix_to_dataframe(data)

        return format_output_data(
            block,
            data,
            variable_uuid=variable_uuid,
            block_uuid=block_uuid,
            csv_lines_only=csv_lines_only,
            execution_partition=execution_partition,
            skip_dynamic_block=skip_dynamic_block,
            automatic_sampling=automatic_sampling,
            sample_count=sample_count,
        )
    elif VariableType.CUSTOM_OBJECT == variable_type:
        return_output = dict(
            text_data=encode_complex(data),
            variable_uuid=variable_uuid,
        )
        if has_to_dict(data):
            return_output['type'] = DataType.OBJECT
        else:
            return_output['type'] = DataType.TEXT

        return return_output, True
    elif (
        VariableType.MODEL_SKLEARN == variable_type or VariableType.MODEL_XGBOOST == variable_type
    ):

        def __render(
            model: Any,
            partition=execution_partition,
            pipeline=block.pipeline,
            uuid=block.uuid,
            variable_manager=variable_manager,
            variable_type=variable_type,
            variable_uuid=variable_uuid,
        ) -> Dict[str, Optional[str]]:
            data_type = None
            text_data = None

            if VariableType.MODEL_SKLEARN == variable_type:
                data_type = DataType.TEXT_HTML
                text_data = estimator_html_repr(model)
            elif variable_manager:
                image_dir = variable_manager.build_variable(
                    pipeline_uuid=pipeline.uuid if pipeline.uuid else None,
                    block_uuid=uuid,
                    variable_uuid=variable_uuid,
                    partition=partition,
                    variable_type=variable_type,
                ).variable_path
                text_data, success = render_tree_visualization(image_dir)

                if success:
                    data_type = DataType.IMAGE_PNG
                else:
                    data_type = DataType.TEXT

            return dict(
                text_data=text_data,
                type=data_type,
                variable_uuid=variable_uuid,
            )

        if not basic_iterable:
            return __render(data), True

        data = dict(
            text_data=simplejson.dumps(
                [__render(d) for d in data],
                default=encode_complex,
                ignore_nan=True,
            ),
            type=DataType.TEXT,
            variable_uuid=variable_uuid,
        )

        return data, True
    elif (is_dynamic_child or is_dynamic) and not skip_dynamic_block:
        from mage_ai.data_preparation.models.block.dynamic.utils import (
            coerce_into_dataframe,
        )

        if VariableType.LIST_COMPLEX == variable_type and basic_iterable and len(data) >= 1:
            data = [encode_complex(item) for item in data]

        return format_output_data(
            block,
            coerce_into_dataframe(
                data,
                is_dynamic=is_dynamic,
                is_dynamic_child=is_dynamic_child,
            ),
            variable_uuid=variable_uuid,
            skip_dynamic_block=True,
            automatic_sampling=automatic_sampling,
            sample_count=sample_count,
        )
    elif isinstance(data, pd.DataFrame):
        if csv_lines_only:
            data = dict(table=data.to_csv(header=True, index=False).strip('\n').split('\n'))
        else:
            try:
                analysis = variable_manager.get_variable(
                    block.pipeline.uuid,
                    block_uuid,
                    variable_uuid,
                    dataframe_analysis_keys=['metadata', 'statistics'],
                    partition=execution_partition,
                    variable_type=VariableType.DATAFRAME_ANALYSIS,
                )
            except Exception as err:
                print(f'Error getting dataframe analysis for block {block_uuid}: {err}')
                analysis = None

            if analysis is not None and (analysis.get('statistics') or analysis.get('metadata')):
                stats = analysis.get('statistics', {})
                column_types = (analysis.get('metadata') or {}).get('column_types', {})
                row_count = stats.get('original_row_count', stats.get('count'))
                column_count = stats.get('original_column_count', len(column_types))
            else:
                row_count, column_count = data.shape

            columns_to_display = data.columns.tolist()[:DATAFRAME_ANALYSIS_MAX_COLUMNS]

            if automatic_sampling and not sample_count:
                data = data.iloc[:DATAFRAME_SAMPLE_COUNT]
            elif sample_count:
                data = data.iloc[:sample_count]

            data = dict(
                sample_data=dict(
                    columns=columns_to_display,
                    rows=json.loads(
                        data[columns_to_display].to_json(orient='split', date_format='iso'),
                    )['data'],
                ),
                shape=[row_count, column_count],
                type=DataType.TABLE,
                variable_uuid=variable_uuid,
            )
        return data, True
    elif isinstance(data, pl.DataFrame):
        variable_uuids = block.get_variables_by_block(
            block_uuid=block_uuid,
            partition=execution_partition,
        )
        n_vars = len(variable_uuids)
        try:
            analysis = variable_manager.get_variable(
                block.pipeline.uuid,
                block_uuid,
                variable_uuid,
                dataframe_analysis_keys=['statistics'],
                partition=execution_partition,
                variable_type=VariableType.DATAFRAME_ANALYSIS,
            )
        except Exception as err:
            raise err
            analysis = None
        if analysis is not None:
            stats = analysis.get('statistics', {})
            row_count = stats.get('original_row_count')
            column_count = stats.get('original_column_count')
        else:
            row_count, column_count = data.shape
        variable = block.get_variable_object(
            block_uuid=block_uuid,
            variable_uuid=variable_uuid,
            partition=execution_partition,
        )
        columns_to_display = data.columns[:DATAFRAME_ANALYSIS_MAX_COLUMNS]
        sample_count = sample_count or DATAFRAME_SAMPLE_COUNT_PREVIEW

        metadata = read_metadata(
            os.path.join(variable.variable_dir_path, variable_uuid, CHUNKS_DIRECTORY_NAME),
            include_schema=True,
        )
        if metadata:
            try:
                row_count = metadata.get('num_rows') or row_count
                schema = metadata.get('schema')
                if schema and isinstance(schema, dict):
                    column_count = len(schema) or column_count
            except ValueError:
                pass

        data = data[: round(sample_count / n_vars)]
        data = dict(
            sample_data=dict(
                columns=columns_to_display,
                rows=[
                    list(row.values())
                    for row in json.loads(data[columns_to_display].write_json(row_oriented=True))
                ],
            ),
            resource_usage=block.get_resource_usage(
                block_uuid=block_uuid,
                partition=execution_partition,
            ),
            shape=[row_count, column_count],
            type=DataType.TABLE,
            variable_uuid=variable_uuid,
        )
        return data, True
    elif is_geo_dataframe(data):
        data = dict(
            text_data=f"""Use the code in a scratchpad to get the output of the block:

from mage_ai.data_preparation.variable_manager import get_variable
df = get_variable('{block.pipeline.uuid}', '{block.uuid}', 'df')
""",
            type=DataType.TEXT,
            variable_uuid=variable_uuid,
        )
        return data, False
    elif is_primitive(data):
        data = dict(
            text_data=str(data),
            type=DataType.TEXT,
            variable_uuid=variable_uuid,
        )
        return data, False
    elif basic_iterable:
        data = dict(
            text_data=simplejson.dumps(
                data,
                default=encode_complex,
                ignore_nan=True,
            ),
            type=DataType.TEXT,
            variable_uuid=variable_uuid,
        )
        return data, False
    elif isinstance(data, dict):
        try:
            pair = format_output_data(
                block,
                pd.DataFrame([data]),
                variable_uuid=variable_uuid,
                block_uuid=block_uuid,
                csv_lines_only=csv_lines_only,
                execution_partition=execution_partition,
                skip_dynamic_block=skip_dynamic_block,
                automatic_sampling=automatic_sampling,
                sample_count=sample_count,
            )
            if len(pair) >= 1:
                return pair[0], True
        except Exception as err:
            print(
                f'[ERROR] Block.format_output_data for block '
                f'{block.uuid} variable {variable_uuid}: {err}',
            )

        data = dict(
            text_data=simplejson.dumps(
                data,
                default=encode_complex,
                ignore_nan=True,
            ),
            type=DataType.TEXT,
            variable_uuid=variable_uuid,
        )
        return data, False
    elif is_spark_dataframe(data):
        df = data.toPandas()
        columns_to_display = df.columns.tolist()[:DATAFRAME_ANALYSIS_MAX_COLUMNS]
        data = dict(
            sample_data=dict(
                columns=columns_to_display,
                rows=json.loads(
                    df[columns_to_display].to_json(orient='split', date_format='iso'),
                )['data'],
            ),
            type=DataType.TABLE,
            variable_uuid=variable_uuid,
        )
        return data, True

    return data, False


def get_outputs_for_display_dynamic_block(
    block,
    output_sets: List[Tuple],
    child_data_sets: List[Tuple[Any, Any]],
    block_uuid: Optional[str] = None,
    csv_lines_only: bool = False,
    exclude_blank_variable_uuids: bool = False,
    execution_partition: Optional[str] = None,
    metadata: Optional[Dict] = None,
    sample: bool = True,
    sample_count: Optional[int] = None,
) -> List[Dict[str, Any]]:
    data_products = []
    outputs = []

    block_uuid = block_uuid if block_uuid else block.uuid

    for idx, pairs in enumerate(child_data_sets):
        child_data, metadata = pairs
        formatted_outputs = []

        if child_data and isinstance(child_data, list) and len(child_data) >= 1:
            for output_idx, output in enumerate(child_data):
                output_formatted, _ = format_output_data(
                    block,
                    output,
                    f'output {output_idx}',
                    block_uuid=block_uuid,
                    csv_lines_only=csv_lines_only,
                    execution_partition=execution_partition,
                )
                formatted_outputs.append(output_formatted)

            data_products.append(
                dict(
                    outputs=formatted_outputs,
                    type=DataType.GROUP,
                    variable_uuid=f'Dynamic child {idx}',
                )
            )
        else:
            output_sets.append((child_data, metadata))

    for output_pair in output_sets:
        child_data = None
        metadata = None
        if len(output_pair) >= 1:
            child_data = output_pair[0]
            if len(output_pair) >= 2:
                metadata = output_pair[1]

        for output, variable_uuid in [
            (child_data, 'dynamic output data'),
            (metadata, 'metadata'),
        ]:
            if output is None or (exclude_blank_variable_uuids and variable_uuid.strip() == ''):
                continue

            data, is_data_product = format_output_data(
                block,
                output,
                variable_uuid,
                block_uuid=block_uuid,
                csv_lines_only=csv_lines_only,
                execution_partition=execution_partition,
            )

            outputs_below_limit = not sample or not sample_count
            if is_data_product:
                outputs_below_limit = outputs_below_limit or (
                    sample_count is not None and len(data_products) < sample_count
                )
            else:
                outputs_below_limit = outputs_below_limit or (
                    sample_count is not None and len(outputs) < sample_count
                )

            if outputs_below_limit:
                data['multi_output'] = True
                if is_data_product:
                    data_products.append(data)
                else:
                    outputs.append(data)

    return outputs + data_products


def build_output_manager(
    block,
    # items: List[Dict[str, Any]],
    block_groups: Optional[
        List[Dict[str, Union[List[str], Optional[List[Any]], Optional[str]]]]
    ] = None,
    block_uuid: Optional[str] = None,
    csv_lines_only: bool = False,
    dynamic_block_index: Optional[int] = None,
    exclude_blank_variable_uuids: bool = False,
    execution_partition: Optional[str] = None,
    include_print_outputs: bool = True,
    metadata: Optional[Dict] = None,
    sample: bool = True,
    sample_count: Optional[int] = None,
    selected_variables: Optional[List[str]] = None,
    variable_type: Optional[VariableType] = None,
    # Used to limit the number of variable UUIDs to retrieve
    max_results: Optional[int] = None,
    # For reading data using the data manager
    input_data_types: Optional[List[InputDataType]] = None,
    read_batch_settings: Optional[BatchSettings] = None,
    read_chunks: Optional[List[ChunkKeyTypeUnion]] = None,
) -> OutputManager:
    # data_products = []
    # outputs = []

    # variable_type_mapping = {}
    manager = OutputManager()

    if not block_groups:
        block_uuid = block_uuid or block.uuid
        if include_print_outputs:
            variable_uuids = block.output_variables(
                execution_partition=execution_partition,
                max_results=max_results,
            )
        else:
            variable_uuids = block.get_variables_by_block(
                block_uuid=block_uuid,
                max_results=max_results,
                partition=execution_partition,
            )

        block_groups = [dict(block_uuid=block_uuid, variable_uuids=variable_uuids)]

    for block_group in block_groups:
        for idx_inner, variable_uuid in enumerate(block_group['variable_uuids'] or []):
            if (selected_variables and variable_uuid not in selected_variables) or (
                exclude_blank_variable_uuids and variable_uuid.strip() == ''
            ):
                continue

            outputs = block_group.get('outputs')
            output_data = outputs[idx_inner] if outputs and idx_inner < len(outputs) else None
            manager.append(
                BlockOutput(
                    block,
                    data=output_data,
                    variable=block.get_variable_object(
                        block_uuid=block_group.get('block_uuid'),
                        partition=execution_partition,
                        variable_uuid=variable_uuid,
                        input_data_types=input_data_types,
                        read_batch_settings=read_batch_settings,
                        read_chunks=read_chunks,
                    )
                    if output_data is None
                    else None,
                )
            )

    return manager

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
