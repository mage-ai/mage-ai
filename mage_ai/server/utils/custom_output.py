INTERNAL_PREFIX = '__internal_output__'


def __custom_output():
    import warnings

    import pandas as pd
    import polars as pl
    import simplejson

    from mage_ai.ai.utils.xgboost import create_tree_visualization
    from mage_ai.data_preparation.models.block.dynamic.utils import (
        combine_transformed_output_for_multi_output,
        transform_output_for_display,
        transform_output_for_display_dynamic_child,
        transform_output_for_display_reduce_output,
    )
    from mage_ai.data_preparation.models.block.outputs import format_output_data
    from mage_ai.data_preparation.models.pipeline import Pipeline
    from mage_ai.data_preparation.models.utils import infer_variable_type
    from mage_ai.data_preparation.models.variable import VariableType
    from mage_ai.presenters.utils import render_output_tags
    from mage_ai.server.kernel_output_parser import DataType
    from mage_ai.shared.parsers import (
        convert_matrix_to_dataframe,
        encode_complex,
        polars_to_dict_split,
        sample_output,
    )

    if pd.__version__ < '1.5.0':
        from pandas.core.common import SettingWithCopyWarning
    else:
        from pandas.errors import SettingWithCopyWarning

    warnings.simplefilter(action='ignore', category=SettingWithCopyWarning)

    pipeline = Pipeline.get('{pipeline_uuid}', repo_path='{repo_path}')
    block = pipeline.get_block(
        '{block_uuid}', extension_uuid='{extension_uuid}', widget=bool('{widget}')
    )

    is_dynamic = bool('{is_dynamic}')
    is_dynamic_child = bool('{is_dynamic_child}')

    if block.executable:
        if is_dynamic_child:
            # The output of a dynamic child block is printed to the client from execute_custom_code
            return

        outputs = block.get_outputs()

        if outputs is not None and isinstance(outputs, list):
            outputs = outputs[: int('{DATAFRAME_SAMPLE_COUNT_PREVIEW}')]

        if outputs is not None and len(outputs) >= 1:
            _json_string = simplejson.dumps(
                outputs,
                default=encode_complex,
                ignore_nan=True,
            )

            return print(render_output_tags(_json_string))

    _internal_output_return = '{last_line}'
    variable_type, basic_iterable = infer_variable_type(_internal_output_return)

    if (
        not is_dynamic
        and not is_dynamic_child
        and isinstance(_internal_output_return, list)
        and len(_internal_output_return) >= 2
        and any([infer_variable_type(i)[0] for i in _internal_output_return])
    ):
        output_transformed = []
        for idx, item in enumerate(
            _internal_output_return[: int('{DATAFRAME_SAMPLE_COUNT_PREVIEW}')]
        ):
            data_output, _ = format_output_data(
                block,
                item,
                'output_' + str(idx),
                automatic_sampling=True,
                sample_count=int('{DATAFRAME_SAMPLE_COUNT_PREVIEW}'),
            )
            if isinstance(data_output, dict):
                data_output['multi_output'] = True
            output_transformed.append(data_output)

        try:
            _json_string = simplejson.dumps(
                output_transformed,
                default=encode_complex,
                ignore_nan=True,
            )

            return print(f'[{INTERNAL_PREFIX}]{_json_string}')
        except Exception as err:
            print(f'[ERROR] Failed to serialize output: {err}')
            raise err

    if (
        variable_type is None
        and is_dynamic
        and not is_dynamic_child
        and isinstance(_internal_output_return, list)
        and len(_internal_output_return) >= 1
    ):
        variable_type, basic_iterable = infer_variable_type(_internal_output_return[0])

        if VariableType.LIST_COMPLEX == variable_type:
            list_of_lists = []

            for list_of_items in _internal_output_return:
                list_of_lists.append([encode_complex(item) for item in list_of_items])
            _internal_output_return = list_of_lists

    if VariableType.MATRIX_SPARSE == variable_type:
        if basic_iterable:
            _internal_output_return = convert_matrix_to_dataframe(_internal_output_return[0])
        else:
            _internal_output_return = convert_matrix_to_dataframe(_internal_output_return)
    elif VariableType.SERIES_PANDAS == variable_type:
        if basic_iterable:
            _internal_output_return = pd.DataFrame(_internal_output_return).T
        else:
            _internal_output_return = _internal_output_return.to_frame()
    elif VariableType.CUSTOM_OBJECT == variable_type:
        return _internal_output_return
    elif VariableType.MODEL_SKLEARN == variable_type:
        return _internal_output_return
    elif VariableType.MODEL_XGBOOST == variable_type:
        text_data, success = create_tree_visualization(_internal_output_return)

        if not success:
            print(text_data)
            return

        data = dict(
            text_data=text_data,
            type=DataType.IMAGE_PNG if success else DataType.TEXT,
            variable_uuid=variable_type,
        )
        _json_string = simplejson.dumps(
            data,
            default=encode_complex,
            ignore_nan=True,
        )
        return print(f'[{INTERNAL_PREFIX}]{_json_string}')
    elif VariableType.LIST_COMPLEX == variable_type:
        _internal_output_return = [encode_complex(item) for item in _internal_output_return]

    # Dynamic block child logic always takes precedence over dynamic block logic
    if is_dynamic_child:
        output_transformed = []

        if _internal_output_return and isinstance(_internal_output_return, list):
            for output in _internal_output_return:
                output_tf = transform_output_for_display_dynamic_child(
                    output,
                    is_dynamic=is_dynamic,
                    is_dynamic_child=is_dynamic_child,
                    single_item_only=True,
                )
                output_transformed.append(output_tf)

        output_transformed = output_transformed[: int('{DATAFRAME_SAMPLE_COUNT_PREVIEW}')]

        try:
            _json_string = simplejson.dumps(
                combine_transformed_output_for_multi_output(output_transformed),
                default=encode_complex,
                ignore_nan=True,
            )

            return print(f'[{INTERNAL_PREFIX}]{_json_string}')
        except Exception as err:
            print(type(_internal_output_return))
            print(type(output_transformed))
            raise err
    elif is_dynamic:
        _json_string = simplejson.dumps(
            transform_output_for_display(
                _internal_output_return,
                is_dynamic=is_dynamic,
                is_dynamic_child=is_dynamic_child,
                sample_count=int('{DATAFRAME_ANALYSIS_MAX_COLUMNS}'),
                sample_columns=int('{DATAFRAME_ANALYSIS_MAX_COLUMNS}'),
            ),
            default=encode_complex,
            ignore_nan=True,
        )
        return print(f'[{INTERNAL_PREFIX}]{_json_string}')
    elif bool('{has_reduce_output}') and is_dynamic_child:
        _json_string = simplejson.dumps(
            transform_output_for_display_reduce_output(
                _internal_output_return,
                is_dynamic=is_dynamic,
                is_dynamic_child=is_dynamic_child,
                sample_count=int('{DATAFRAME_SAMPLE_COUNT_PREVIEW}'),
                sample_columns=int('{DATAFRAME_ANALYSIS_MAX_COLUMNS}'),
            ),
            default=encode_complex,
            ignore_nan=True,
        )
        return print(f'[{INTERNAL_PREFIX}]{_json_string}')
    elif isinstance(_internal_output_return, (pd.DataFrame, pl.DataFrame, dict, list)) and (
        type(_internal_output_return).__module__ != 'geopandas.geodataframe'
    ):
        if isinstance(_internal_output_return, dict):
            _internal_output_return = pd.DataFrame([_internal_output_return])
        elif isinstance(_internal_output_return, list):
            _internal_output_return = pd.DataFrame(_internal_output_return, columns=['column'])

        _is_polars = isinstance(_internal_output_return, pl.DataFrame)

        if _is_polars:
            _sample = _internal_output_return[: int('{DATAFRAME_SAMPLE_COUNT_PREVIEW}')]
            _columns = _sample.columns[: int('{DATAFRAME_ANALYSIS_MAX_COLUMNS}')]
        else:
            _sample = _internal_output_return.iloc[: int('{DATAFRAME_SAMPLE_COUNT_PREVIEW}')]
            _columns = _sample.columns.tolist()[: int('{DATAFRAME_ANALYSIS_MAX_COLUMNS}')]

        for col in _columns:
            try:
                _sample[col] = _sample[col].fillna('')
            except Exception:
                pass

        if _is_polars:
            _rows = polars_to_dict_split(_sample[_columns])['data']
            _index = [i for i in range(len(_sample))]
        else:
            _rows = simplejson.loads(
                _sample[_columns].to_json(
                    date_format='iso',
                    default_handler=str,
                    orient='split',
                )
            )['data']
            _index = _sample.index.tolist()

        _shape = _internal_output_return.shape

        _json_string = simplejson.dumps(
            dict(
                data=dict(
                    columns=_columns,
                    index=_index,
                    rows=_rows,
                    shape=_shape,
                ),
                type='table',
            ),
            default=encode_complex,
            ignore_nan=True,
        )
        return print(f'[{INTERNAL_PREFIX}]{_json_string}')
    elif type(_internal_output_return).__module__ == 'pyspark.sql.dataframe':
        _sample = _internal_output_return.limit(int('{DATAFRAME_SAMPLE_COUNT_PREVIEW}')).toPandas()
        _columns = _sample.columns.tolist()[:40]
        _rows = _sample.to_numpy().tolist()
        _shape = [_internal_output_return.count(), len(_sample.columns.tolist())]
        _index = _sample.index.tolist()

        _json_string = simplejson.dumps(
            dict(
                data=dict(
                    columns=_columns,
                    index=_index,
                    rows=_rows,
                    shape=_shape,
                ),
                type='table',
            ),
            default=encode_complex,
            ignore_nan=True,
        )
        return print(f'[{INTERNAL_PREFIX}]{_json_string}')
    elif not bool('{is_print_statement}'):
        output, sampled = sample_output(encode_complex(_internal_output_return))
        if sampled:
            print('Sampled output is provided here for preview.')
        return output
