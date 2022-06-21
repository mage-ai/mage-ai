from mage_ai.data_cleaner.transformer_actions.spark.constants import (
    COLUMN_TYPE_MAPPING,
    GROUP_MOD_COLUMN,
    ROW_NUMBER_COLUMN,
    ROW_NUMBER_LIT_COLUMN,
)
from mage_ai.data_cleaner.transformer_actions.utils import clean_column_name
from pyspark.sql import functions as F
from pyspark.sql.functions import PandasUDFType, expr, pandas_udf
from pyspark.sql.types import (
    StringType,
    StructField,
    StructType,
)
from pyspark.sql.window import Window
import re


def __create_new_struct_fields(feature_set, transformer_action):
    new_fields = []

    for output_feature in transformer_action.get('outputs', []):
        if output_feature['uuid'] not in feature_set.schema.fieldNames():
            new_fields.append(StructField(
                output_feature['uuid'],
                COLUMN_TYPE_MAPPING[output_feature['column_type']](),
                True,
            ))
    return new_fields


def transform_add_distance_between(feature_set, transformer_action, sort_options={}):
    from pyspark.sql.functions import col, radians, asin, sin, sqrt, cos
    lat1, lng1, lat2, lng2 = transformer_action['action_arguments']
    output_col = transformer_action['outputs'][0]['uuid']
    return feature_set.withColumn('dlng', radians(col(lng2)) - radians(col(lng1))) \
        .withColumn('dlat', radians(col(lat2)) - radians(col(lat1))) \
        .withColumn(output_col, asin(sqrt(
                                         sin(col('dlat') / 2) ** 2 + cos(radians(col(lat1)))
                                         * cos(radians(col(lat2))) * sin(col('dlng') / 2) ** 2
                                         )
                                     ) * 2 * 3963 * 5280) \
        .drop('dlng', 'dlat')


def transform_agg(feature_set, transformer_action, agg_func, use_string_col_name=False):
    action_options = transformer_action['action_options']
    agg_col = transformer_action['action_arguments'][0]
    if not use_string_col_name:
        agg_col = F.col(agg_col)
    if 'groupby_columns' in action_options and action_options['groupby_columns'] is not None:
        df_agg = (
            feature_set
            .groupBy(action_options['groupby_columns'])
            .agg(*[
                agg_func(agg_col)
                .alias(transformer_action['outputs'][0]['uuid']),
            ])
        )

        return feature_set.join(
                    df_agg,
                    action_options['groupby_columns'],
                    how='left',
                )
    else:
        agg_value = feature_set.agg(*[
            agg_func(agg_col)
            .alias(transformer_action['outputs'][0]['uuid']),
        ])
        return feature_set.crossJoin(agg_value)


def transform_average(feature_set, transformer_action, sort_options={}):
    return transform_agg(feature_set, transformer_action, F.avg)


def transform_clean_column_name(feature_set, transformer_action, sort_options={}):
    columns = transformer_action['action_arguments']
    mapping = {col: clean_column_name(col) for col in columns}
    for old_name, new_name in mapping.items():
        feature_set = feature_set.withColumnRenamed(old_name, new_name)
    return feature_set


def transform_count(feature_set, transformer_action, sort_options={}):
    return transform_agg(feature_set, transformer_action, F.count)


def transform_count_distinct(feature_set, transformer_action, sort_options={}):
    return transform_agg(feature_set, transformer_action, F.countDistinct)


def transform_drop_duplicate(feature_set, transformer_action, sort_options={}):
    if sort_options.get('columns') is not None:
        sort_columns = sort_options.get('columns')
        sort_ascending = sort_options.get('ascending', True)
        if transformer_action['action_options'].get('keep', 'last') == 'last':
            sort_ascending = not sort_ascending
        unique_by_columns = transformer_action['action_arguments']
        rnum_col = 'rnum'

        window = Window.partitionBy(unique_by_columns)
        window = window.orderBy(*[
            F.col(col).asc() if sort_ascending else F.col(col).desc() for col in sort_columns
        ])
        row_number = F.row_number().over(window)

        feature_set = feature_set.withColumn(rnum_col, row_number)
        feature_set = feature_set[feature_set[rnum_col] == 1]

        return feature_set.drop(rnum_col)
    else:
        return feature_set.dropDuplicates(transformer_action['action_arguments'])


def transform_filter(feature_set, transformer_action, sort_options={}):
    action_code = transformer_action['action_code']
    match = re.search(r'^[\w.]+\s{1}', action_code)
    if match:
        column_name = match[0].strip()
    else:
        column_name = None

    if column_name:
        column_type = feature_set.schema[column_name].dataType
        is_string = column_type == StringType
        if f'{column_name} != null' == action_code:
            if is_string:
                return feature_set.filter(f'{column_name} is not null and {column_name} != \'\'')
            else:
                return feature_set.filter(f'{column_name} is not null')
        elif f'{column_name} == null' == action_code:
            if is_string:
                return feature_set.filter(f'{column_name} is null or {column_name} == \'\'')
            else:
                return feature_set.filter(f'{column_name} is null')
        elif action_code.startswith(f'{column_name} contains'):
            value = action_code.split(' ')[2].strip('"')
            return feature_set.filter(f'{column_name} like \'%{value}%\'')
    return feature_set.filter(action_code)


def transform_first(feature_set, transformer_action, sort_options={}):
    return transform_agg(feature_set, transformer_action, F.first)


def transform_group(feature_set, transformer_action, sort_options={}):
    new_fields = __create_new_struct_fields(feature_set, transformer_action)
    schema = StructType(feature_set.schema.fields + new_fields)
    groupby_columns = transformer_action['action_options']['groupby_columns']

    def execute_transform(df):
        from mage_ai.data_cleaner.transformer_actions.base import BaseAction

        if sort_options.get('columns') is not None:
            sort_columns = sort_options.get('columns')
            sort_ascending = sort_options.get('ascending', True)
            df = df.sort_values(sort_columns, ascending=sort_ascending)

        df = BaseAction(transformer_action).execute(df)

        for field in new_fields:
            if field.name not in df:
                df[field.name] = 0
        return df

    return feature_set.groupby(groupby_columns).applyInPandas(execute_transform, schema=schema)


def transform_last(feature_set, transformer_action, sort_options={}):
    return transform_agg(feature_set, transformer_action, F.last)


def transform_max(feature_set, transformer_action, sort_options={}):
    return transform_agg(feature_set, transformer_action, F.max)


def transform_median(feature_set, transformer_action, sort_options={}):
    def __cal_median(col):
        return F.expr(f'percentile_approx({col}, 0.5)')
    return transform_agg(feature_set, transformer_action, __cal_median, use_string_col_name=True)


def transform_min(feature_set, transformer_action, sort_options={}):
    return transform_agg(feature_set, transformer_action, F.min)


def transform_noop(feature_set, transformer_action, sort_options={}):
    return feature_set


def transform_remove(feature_set, transformer_action, sort_options={}):
    return feature_set.drop(*transformer_action['action_arguments'])


def transform_select(feature_set, transformer_action, sort_options={}):
    return feature_set.select(*transformer_action['action_arguments'])


def transform_sort(feature_set, transformer_action, sort_options={}):
    ascending = transformer_action['action_options'].get('ascending', True)
    return feature_set.sort(transformer_action['action_arguments'], ascending=ascending)


def transform_sum(feature_set, transformer_action, sort_options={}):
    return transform_agg(feature_set, transformer_action, F.sum)


def transform_with_partitions(feature_set, transformer_action, sort_options={}):
    window = Window.partitionBy(ROW_NUMBER_LIT_COLUMN).orderBy(ROW_NUMBER_LIT_COLUMN)

    fs = feature_set.withColumn(
        ROW_NUMBER_LIT_COLUMN,
        F.lit('a'),
    ).withColumn(
        ROW_NUMBER_COLUMN,
        F.row_number().over(window),
    ).withColumn(
        GROUP_MOD_COLUMN,
        expr(f'mod({ROW_NUMBER_COLUMN}, 1000)'),
    )

    new_fields = __create_new_struct_fields(feature_set, transformer_action)
    schema = StructType(fs.schema.fields + new_fields)

    def execute_transform(df):
        from mage_ai.data_cleaner.transformer_actions.base import BaseAction
        df = BaseAction(transformer_action).execute(df)

        return df

    df_filtered = fs.groupby(GROUP_MOD_COLUMN).applyInPandas(execute_transform, schema=schema)

    return df_filtered.drop(GROUP_MOD_COLUMN, ROW_NUMBER_COLUMN, ROW_NUMBER_LIT_COLUMN)


TRANSFORMER_FUNCTION_MAPPING = {
    'add': {
        # 'distance_between': transform_add_distance_between,
    },
    'average': transform_average,
    'clean_column_name': transform_clean_column_name,
    'count': transform_count,
    'count_distinct': transform_count_distinct,
    'drop_duplicate': transform_drop_duplicate,
    'expand_column': transform_group,
    # 'filter': transform_filter,
    'first': transform_first,
    # 'group': transform_group,
    'last': transform_last,
    'max': transform_max,
    'median': transform_median,
    'min': transform_min,
    'remove': transform_remove,
    'remove_outliers': transform_noop,
    'select': transform_select,
    'shift_down': transform_group,
    'sort': transform_sort,
    'sum': transform_sum,
}


def transform(feature_set, transformer_action, sort_options={}):
    action_type = transformer_action['action_type']
    if action_type == 'add':
        udf = transformer_action['action_options'].get('udf', None)
        if udf and udf in TRANSFORMER_FUNCTION_MAPPING['add']:
            return TRANSFORMER_FUNCTION_MAPPING['add'][udf](
                feature_set,
                transformer_action,
                sort_options=sort_options,
            )
    elif action_type in TRANSFORMER_FUNCTION_MAPPING:
        return TRANSFORMER_FUNCTION_MAPPING[action_type](
            feature_set,
            transformer_action,
            sort_options=sort_options,
        )
    return transform_with_partitions(feature_set, transformer_action)
