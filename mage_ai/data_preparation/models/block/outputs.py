import json
from typing import Any, Dict, Optional, Tuple

import pandas as pd
import polars as pl
import simplejson
from sklearn.utils import estimator_html_repr

from mage_ai.ai.utils.xgboost import render_tree_visualization
from mage_ai.data_cleaner.shared.utils import is_geo_dataframe, is_spark_dataframe
from mage_ai.data_preparation.models.block.dynamic.utils import (
    is_dynamic_block,
    is_dynamic_block_child,
)
from mage_ai.data_preparation.models.constants import (
    DATAFRAME_ANALYSIS_MAX_COLUMNS,
    DATAFRAME_SAMPLE_COUNT,
)
from mage_ai.data_preparation.models.utils import infer_variable_type
from mage_ai.data_preparation.models.variables.constants import VariableType
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.shared.parsers import convert_matrix_to_dataframe, encode_complex


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
        return (
            dict(
                text_data=encode_complex(data),
                type=DataType.TEXT,
                variable_uuid=variable_uuid,
            ),
            True,
        )
    elif (
        VariableType.MODEL_SKLEARN == variable_type
        or VariableType.MODEL_XGBOOST == variable_type
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

        if (
            VariableType.LIST_COMPLEX == variable_type
            and basic_iterable
            and len(data) >= 1
        ):
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
            data = dict(
                table=data.to_csv(header=True, index=False).strip("\n").split("\n")
            )
        else:
            try:
                analysis = variable_manager.get_variable(
                    block.pipeline.uuid,
                    block_uuid,
                    variable_uuid,
                    dataframe_analysis_keys=["metadata", "statistics"],
                    partition=execution_partition,
                    variable_type=VariableType.DATAFRAME_ANALYSIS,
                )
            except Exception as err:
                print(f"Error getting dataframe analysis for block {block_uuid}: {err}")
                analysis = None

            if analysis is not None and (
                analysis.get("statistics") or analysis.get("metadata")
            ):
                stats = analysis.get("statistics", {})
                column_types = (analysis.get("metadata") or {}).get("column_types", {})
                row_count = stats.get("original_row_count", stats.get("count"))
                column_count = stats.get("original_column_count", len(column_types))
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
                        data[columns_to_display].to_json(
                            orient="split", date_format="iso"
                        ),
                    )["data"],
                ),
                shape=[row_count, column_count],
                type=DataType.TABLE,
                variable_uuid=variable_uuid,
            )
        return data, True
    elif isinstance(data, pl.DataFrame):
        try:
            analysis = variable_manager.get_variable(
                block.pipeline.uuid,
                block_uuid,
                variable_uuid,
                dataframe_analysis_keys=["statistics"],
                partition=execution_partition,
                variable_type=VariableType.DATAFRAME_ANALYSIS,
            )
        except Exception:
            analysis = None
        if analysis is not None:
            stats = analysis.get("statistics", {})
            row_count = stats.get("original_row_count")
            column_count = stats.get("original_column_count")
        else:
            row_count, column_count = data.shape
        columns_to_display = data.columns[:DATAFRAME_ANALYSIS_MAX_COLUMNS]
        if sample_count:
            data = data[:sample_count]
        data = dict(
            sample_data=dict(
                columns=columns_to_display,
                rows=[
                    list(row.values())
                    for row in json.loads(
                        data[columns_to_display].write_json(row_oriented=True)
                    )
                ],
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
    elif isinstance(data, str):
        data = dict(
            text_data=data,
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
                f"[ERROR] Block.format_output_data for block "
                f"{block.uuid} variable {variable_uuid}: {err}",
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
                    df[columns_to_display].to_json(orient="split", date_format="iso"),
                )["data"],
            ),
            type=DataType.TABLE,
            variable_uuid=variable_uuid,
        )
        return data, True

    return data, False
