from .charts import (
    MAX_BUCKETS,
    TimeInterval,
    build_histogram_data,
    build_time_series_buckets,
)
from .constants import (
    ChartType,
    VARIABLE_NAMES_BY_CHART_TYPE,
    VARIABLE_NAME_BUCKETS,
    VARIABLE_NAME_GROUP_BY,
    VARIABLE_NAME_INDEX,
    VARIABLE_NAME_LIMIT,
    VARIABLE_NAME_METRICS,
    VARIABLE_NAME_TIME_INTERVAL,
    VARIABLE_NAME_X,
    VARIABLE_NAME_Y,
)
from .utils import (
    build_x_y,
    convert_to_list,
    encode_values_in_list,
)
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import (
    DATAFRAME_SAMPLE_COUNT_PREVIEW,
)
import numpy as np
import pandas as pd


class Widget(Block):
    @classmethod
    def create(
        self,
        name,
        block_type,
        repo_path,
        **kwargs,
    ):
        return super().create(
            name,
            block_type,
            repo_path,
            widget=True,
            **kwargs,
        )

    @property
    def chart_type(self):
        return (self.configuration or {}).get('chart_type')

    @property
    def group_by_columns(self):
        return (self.configuration or {}).get(VARIABLE_NAME_GROUP_BY)

    @property
    def metrics(self):
        return (self.configuration or {}).get(VARIABLE_NAME_METRICS)

    @property
    def output_variable_names(self):
        var_names = VARIABLE_NAMES_BY_CHART_TYPE.get(self.chart_type, [])
        return [
            (var_name_orig, self.configuration.get(var_name_orig)) for var_name_orig in var_names
        ]

    def delete(self, commit=True):
        super().delete(widget=True, commit=commit)

    def get_variables_from_code_execution(self, results):
        data = {}
        for var_name_orig, var_name in self.output_variable_names:
            data[var_name_orig] = results.get(var_name)

        return data

    def post_process_variables(
        self,
        variables,
        code=None,
        results={},
        upstream_block_uuids=[],
    ):
        data = variables.copy()
        dfs = []
        for key in upstream_block_uuids:
            if key in results.keys():
                dfs.append(results[key])

        should_use_no_code = self.group_by_columns or self.metrics

        if ChartType.BAR_CHART == self.chart_type:
            if should_use_no_code:
                df = dfs[0]
                data = build_x_y(df, self.group_by_columns, self.metrics)
            else:
                data[VARIABLE_NAME_X] = encode_values_in_list(
                    convert_to_list(variables[VARIABLE_NAME_X])
                )
                y_values = encode_values_in_list(convert_to_list(variables[VARIABLE_NAME_Y]))
                data[VARIABLE_NAME_Y] = [y_values]
        elif ChartType.HISTOGRAM == self.chart_type:
            arr = []

            if should_use_no_code:
                df = dfs[0]
                arr = df[self.group_by_columns[0]]
            else:
                for var_name_orig, var_name in self.output_variable_names:
                    arr = variables[var_name_orig]
            if type(arr) is pd.Series:
                values = arr[arr.notna()].tolist()
            else:
                values = [v for v in arr if v is not None and not np.isnan(v)]
            data = build_histogram_data(
                values,
                int(self.configuration.get(VARIABLE_NAME_BUCKETS, MAX_BUCKETS)),
            )
        elif ChartType.LINE_CHART == self.chart_type:
            if should_use_no_code:
                df = dfs[0]
                data = build_x_y(df, self.group_by_columns, self.metrics)
            else:
                for var_name_orig, var_name in self.output_variable_names:
                    data.update(
                        {
                            var_name_orig: encode_values_in_list(
                                convert_to_list(variables[var_name_orig])
                            ),
                        }
                    )
        elif ChartType.PIE_CHART == self.chart_type:
            arr1 = []
            data_key = VARIABLE_NAME_X

            if should_use_no_code:
                df = dfs[0]
                arr1 = df[self.group_by_columns[0]]
            else:
                for var_name_orig, var_name in self.output_variable_names:
                    arr1 = variables[var_name_orig]
                    data_key = var_name_orig
            if type(arr1) is pd.Series:
                values = arr1[arr1.notna()]
                value_counts = values.value_counts().to_dict()
            else:
                values = [v for v in arr1 if v is not None]
                value_counts = {}
                for key in values:
                    if not value_counts.get(key):
                        value_counts[key] = 0
                    value_counts[key] += 1

            buckets = int(self.configuration.get(VARIABLE_NAME_BUCKETS, MAX_BUCKETS))
            arr = sorted(
                list(zip(value_counts.values(), value_counts.keys())),
                reverse=True,
            )[:buckets]
            data[data_key] = {k: v for v, k in arr}
        elif ChartType.TABLE == self.chart_type:
            if should_use_no_code:
                df = dfs[0]
                data[VARIABLE_NAME_X] = self.group_by_columns
                data[VARIABLE_NAME_Y] = df[self.group_by_columns].to_numpy()
            else:
                for var_name_orig, var_name in self.output_variable_names:
                    arr = variables.get(var_name_orig, None)

                    if arr is not None:
                        limit = len(arr)
                        if var_name_orig in [VARIABLE_NAME_Y, VARIABLE_NAME_INDEX]:
                            limit = int(
                                self.configuration.get(
                                    VARIABLE_NAME_LIMIT,
                                    DATAFRAME_SAMPLE_COUNT_PREVIEW,
                                )
                            )

                        data.update(
                            {
                                var_name_orig: encode_values_in_list(
                                    convert_to_list(arr, limit=limit)
                                ),
                            }
                        )

        elif self.chart_type in [ChartType.TIME_SERIES_BAR_CHART, ChartType.TIME_SERIES_LINE_CHART]:
            if should_use_no_code:
                df = dfs[0]
                buckets, values = build_time_series_buckets(
                    df,
                    self.group_by_columns[0],
                    self.configuration.get(VARIABLE_NAME_TIME_INTERVAL, TimeInterval.ORIGINAL),
                    self.metrics,
                )
                data[VARIABLE_NAME_X] = buckets
                data[VARIABLE_NAME_Y] = values

        return data
