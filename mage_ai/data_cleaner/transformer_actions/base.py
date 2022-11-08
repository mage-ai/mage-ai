from mage_ai.data_cleaner.shared.utils import is_spark_dataframe
from mage_ai.data_cleaner.transformer_actions import column, row
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis, VariableType
from mage_ai.data_cleaner.transformer_actions.dependency_resolution import (
    default_resolution,
)
from mage_ai.data_cleaner.transformer_actions.helpers import drop_na
from mage_ai.data_cleaner.transformer_actions.variable_replacer import (
    interpolate,
    replace_true_false,
)
import json

try:
    from mage_ai.data_cleaner.transformer_actions.spark.transformers import (
        transform as transform_spark,
    )

    PYSPARK = True
except ImportError:
    PYSPARK = False

# from pipelines.column_type_pipelines import COLUMN_TYPE_PIPELINE_MAPPING

COLUMN_TYPE_PIPELINE_MAPPING = {}
DEPENDENCIES = {}
FUNCTION_MAPPING = {
    Axis.COLUMN: {
        ActionType.ADD: column.add_column,
        ActionType.AVERAGE: column.average,
        ActionType.CLEAN_COLUMN_NAME: column.clean_column_names,
        ActionType.COUNT: column.count,
        ActionType.COUNT_DISTINCT: column.count_distinct,
        ActionType.CUSTOM: column.custom,
        ActionType.DIFF: column.diff,
        # ActionType.EXPAND_COLUMN: column.expand_column,
        ActionType.FIRST: column.first,
        ActionType.FIX_SYNTAX_ERRORS: column.fix_syntax_errors,
        ActionType.IMPUTE: column.impute,
        ActionType.NORMALIZE: column.normalize,
        ActionType.STANDARDIZE: column.standardize,
        ActionType.LAST: column.last,
        ActionType.MAX: column.max,
        ActionType.MEDIAN: column.median,
        ActionType.MIN: column.min,
        ActionType.REFORMAT: column.reformat,
        ActionType.REMOVE: column.remove_column,
        ActionType.REMOVE_OUTLIERS: column.remove_outliers,
        ActionType.SELECT: column.select,
        ActionType.SHIFT_DOWN: column.shift_down,
        ActionType.SHIFT_UP: column.shift_up,
        ActionType.SUM: column.sum,
    },
    Axis.ROW: {
        ActionType.CUSTOM: row.custom,
        ActionType.DROP_DUPLICATE: row.drop_duplicates,
        # ActionType.EXPLODE: row.explode,
        ActionType.FILTER: row.filter_rows,
        ActionType.SORT: row.sort_rows,
        ActionType.REMOVE: row.remove_row,
    },
}


class BaseAction:
    def __init__(self, action):
        self.action = action

        self.columns_by_type = {}
        for variable_data in self.action.get('action_variables', {}).values():
            if not variable_data:
                continue
            feature = variable_data.get(VariableType.FEATURE)
            if not feature:
                continue

            column_type = feature.get('column_type')
            if not self.columns_by_type.get(column_type):
                self.columns_by_type[column_type] = []
            self.columns_by_type[column_type].append(feature['uuid'])

    @property
    def action_type(self):
        return self.action['action_type']

    @property
    def axis(self):
        return self.action['axis']

    def execute(self, df, **kwargs):
        action_type = self.action['action_type']
        dependency = DEPENDENCIES.get(action_type, default_resolution)
        dependencies_met, msg = dependency(df, self.action)
        if not dependencies_met:
            raise RuntimeError(f'Dependencies of this cleaning action are not completed: {msg}')

        self.hydrate_action()

        if self.action.get('action_code'):
            self.action['action_code'] = replace_true_false(self.action['action_code'])

        if is_spark_dataframe(df):
            return self.execute_spark(df, **kwargs)

        if df.empty:
            return df

        if self.action_type in [ActionType.FILTER, ActionType.ADD]:
            df_transformed = self.transform(df)
        else:
            df_transformed = df

        if self.action_type == ActionType.GROUP:
            df_output = self.groupby(df, self.action)
        elif self.action_type == ActionType.JOIN:
            df_to_join = kwargs.get('df_to_join')
            df_output = self.join(df, df_to_join, self.action)
        else:
            column_types = {}
            for column_type, cols in self.columns_by_type.items():
                for col in cols:
                    column_types[col] = column_type
            df_output = FUNCTION_MAPPING[self.axis][self.action_type](
                df_transformed,
                self.action,
                column_types=column_types,
                original_df=df,
            )

        if self.action_type == ActionType.FILTER:
            return df.loc[df_output.index][df_output.columns]
        elif self.action_type == ActionType.ADD:
            output_cols = [f['uuid'] for f in self.action['outputs']]
            df[output_cols] = df_output[output_cols]
            return df
        else:
            return df_output

    def execute_spark(self, df, **kwargs):
        if not PYSPARK:
            raise RuntimeError('Spark is not supported in current environment')
        df = transform_spark(df, self.action, **kwargs).cache()
        return df

    def groupby(self, df, action):
        def __transform_partition(pdf, actions):
            for action in actions:
                pdf = BaseAction(action).execute(pdf)
            return pdf

        groupby_columns = action['action_arguments']
        return df.groupby(groupby_columns).apply(
            lambda x: __transform_partition(x, action['child_actions'])
        )

    def hydrate_action(self):
        for k, v in self.action['action_variables'].items():
            """
            k:
                1, 1_1
            v:
                {
                    'type': 'feature',
                    'id': 1,
                    'feature': {
                        'uuid': 'mage',
                    },
                }
            """
            if not v:
                continue
            if self.action.get('action_code'):
                self.action['action_code'] = interpolate(self.action['action_code'], k, v)

            if self.action.get('action_arguments'):
                self.action['action_arguments'] = [
                    interpolate(
                        args_text,
                        k,
                        v,
                    )
                    for args_text in self.action['action_arguments']
                ]

            if self.action.get('action_options'):
                action_options_json = json.dumps(self.action['action_options'])
                self.action['action_options'] = json.loads(interpolate(action_options_json, k, v))

    def join(self, df, df_to_join, action):
        action_options = action['action_options']
        left_on = action_options['left_on']
        right_on = action_options['right_on']

        for i in range(len(left_on)):
            col1, col2 = left_on[i], right_on[i]
            if df[col1].dtype != df_to_join[col2].dtype:
                df[col1] = drop_na(df[col1]).astype(str)
                df_to_join[col2] = drop_na(df_to_join[col2]).astype(str)

        if action.get('outputs') is not None:
            feature_rename_mapping = {
                f['source_feature']['uuid']: f['uuid']
                for f in action['outputs']
                if f.get('source_feature') is not None
            }
            df_to_join_renamed = df_to_join.rename(columns=feature_rename_mapping)
            right_on = [feature_rename_mapping.get(key, key) for key in right_on]
        else:
            df_to_join_renamed = df_to_join

        how = action_options.get('how', 'left')
        df_merged = df.merge(df_to_join_renamed, left_on=left_on, right_on=right_on, how=how)
        drop_columns = action_options.get('drop_columns', [])
        rename_columns = action_options.get('rename_columns', {})
        return df_merged.drop(columns=drop_columns).rename(columns=rename_columns)

    def transform(self, df):
        df_copy = df.copy()
        current_columns = df_copy.columns

        for column_type, original_columns in self.columns_by_type.items():
            cols = [col for col in original_columns if col in current_columns]

            if len(cols) == 0:
                continue

            build_pipeline = COLUMN_TYPE_PIPELINE_MAPPING.get(column_type)
            if not build_pipeline:
                continue

            df_copy[cols] = build_pipeline().fit_transform(df_copy[cols])

        return df_copy
