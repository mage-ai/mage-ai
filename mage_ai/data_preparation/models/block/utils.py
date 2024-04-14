import json
from datetime import datetime
from typing import Any, Dict, List, Tuple

import pandas as pd
import simplejson

from mage_ai.data_cleaner.shared.utils import is_geo_dataframe, is_spark_dataframe
from mage_ai.data_preparation.models.block.data_integration.utils import (
    get_selected_streams,
)
from mage_ai.data_preparation.models.block.dynamic import (
    all_variable_uuids,
    reduce_output_from_block,
)
from mage_ai.data_preparation.models.block.dynamic.utils import DynamicBlockFlag
from mage_ai.data_preparation.models.block.dynamic.utils import (
    build_dynamic_block_uuid as build_dynamic_block_uuid_original,
)
from mage_ai.data_preparation.models.block.dynamic.utils import (
    extract_dynamic_block_index,
)
from mage_ai.data_preparation.models.block.dynamic.utils import (
    is_dynamic_block as is_dynamic_block_original,
)
from mage_ai.data_preparation.models.block.dynamic.utils import (
    is_dynamic_block_child as is_dynamic_block_child_original,
)
from mage_ai.data_preparation.models.block.dynamic.utils import (
    should_reduce_output as should_reduce_output_original,
)
from mage_ai.data_preparation.models.block.remote.models import RemoteBlock
from mage_ai.data_preparation.models.constants import (
    DATAFRAME_ANALYSIS_MAX_COLUMNS,
    BlockType,
    PipelineType,
)
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.shared.custom_logger import DX_PRINTER
from mage_ai.shared.utils import clean_name as clean_name_orig

is_dynamic_block = is_dynamic_block_original
is_dynamic_block_child = is_dynamic_block_child_original
should_reduce_output = should_reduce_output_original
build_dynamic_block_uuid = build_dynamic_block_uuid_original


def clean_name(name: str, **kwargs) -> str:
    """
    Cleans the given name by removing invalid characters.

    Args:
        name (str): The name to clean.
        **kwargs: Additional keyword arguments.

    Returns:
        str: The cleaned name.
    """
    return clean_name_orig(name, allow_characters=['/'], **kwargs)


def dynamic_block_values_and_metadata(
    block,
    block_uuid: str = None,
    dynamic_block_index: int = None,
    execution_partition: str = None,
):
    """
    Retrieves the values and metadata of a dynamic block.

    Args:
        block: The dynamic block.
        execution_partition (str, optional): The execution partition.
        block_uuid (str, optional): The UUID of the block.

    Returns:
        Tuple: A tuple containing the values and metadata of the dynamic block.
    """
    block_uuid_original = block.uuid
    block_uuid = block_uuid_original if block_uuid is None else block_uuid

    values = []
    block_metadata = []
    output_vars = block.output_variables(
        block_uuid=block_uuid,
        dynamic_block_index=dynamic_block_index,
        execution_partition=execution_partition,
    )
    for idx, output_name in enumerate(output_vars):
        if idx == 0:
            values = block.pipeline.get_block_variable(
                block_uuid,
                output_name,
                partition=execution_partition,
            )
        elif idx == 1:
            block_metadata = block.pipeline.get_block_variable(
                block_uuid,
                output_name,
                partition=execution_partition,
            )

    DX_PRINTER.error(
        'dynamic_block_values_and_metadata/output_variables',
        block=block,
        block_metadata=len(block_metadata),
        block_uuid=block_uuid,
        block_uuid_original=block_uuid_original,
        execution_partition=execution_partition,
        output_vars=output_vars,
        values=values,
        __uuid='dynamic_block_values_and_metadata',
    )

    return values, block_metadata


def get_all_ancestors(block) -> List:
    """
    Retrieves all ancestors of the given block.

    Args:
        block: The block.

    Returns:
        List: A list of all ancestors of the block.
    """
    arr = get_leaf_nodes(block, 'upstream_blocks', include_all_nodes=True)
    return list(filter(
        lambda x: x.uuid != block.uuid,
        arr,
    ))


def get_all_descendants(block) -> List:
    """
    Retrieves all descendants of the given block.

    Args:
        block: The block.

    Returns:
        List: A list of all descendants of the block.
    """
    arr = get_leaf_nodes(block, 'downstream_blocks', include_all_nodes=True)
    return list(filter(
        lambda x: x.uuid != block.uuid,
        arr,
    ))


def get_leaf_nodes(
    block,
    attribute_key: str,
    condition=None,
    include_all_nodes: bool = False,
) -> List:
    """
    Retrieves all leaf nodes of the given block.

    Args:
        block: The block.
        attribute_key (str): The attribute key for the nodes.
        condition: A condition function to filter the nodes. (default: None)
        include_all_nodes (bool): Whether to include all nodes in the result. (default: False)

    Returns:
        List: A list of all leaf nodes of the block.
    """
    leafs = []

    def _get_leaf_nodes(b):
        if condition is None or condition(b):
            if b is not None:
                arr = getattr(b, attribute_key)
                if len(arr) == 0 or (include_all_nodes and b.uuid != block.uuid):
                    leafs.append(b)

                for n in arr:
                    _get_leaf_nodes(n)

    _get_leaf_nodes(block)

    return leafs


def output_variables(
    pipeline,
    block_uuid: str,
    execution_partition: str = None,
    dynamic_block_index: int = None,
    dynamic_block_indexes: Dict = None,
    dynamic_upstream_block_uuids: List[str] = None,
    from_notebook: bool = False,
    global_vars: Dict = None,
    include_df: bool = True,
    input_args: List[Any] = None,
    data_integration_settings_mapping: Dict = None,
) -> List[str]:
    """
    Retrieve the output variables generated by a specified block within a pipeline.

    Args:
        pipeline: The pipeline object containing the block.
        block_uuid (str): The UUID of the block.
        execution_partition (str, optional): The execution partition.
        dynamic_block_index (int, optional): Index for dynamic blocks.
        dynamic_upstream_block_uuids (List[str], optional): List of UUIDs for dynamic upstream
            blocks.
        from_notebook (bool, optional): Indicates if the call originates from a notebook.
        global_vars (Dict, optional): Global variables of the pipeline.
        include_df (bool, optional): Whether to include the `df` variable. Only set it to True
            when saving or fetching sample Spark dataframe.
        input_args (List[Any], optional): List of input arguments.
        data_integration_settings_mapping (Dict, optional): Mapping of data integration settings.

    Returns:
        List[str]: A list of output variable names.

    """
    block = pipeline.get_block(block_uuid)

    di_settings = None
    if data_integration_settings_mapping:
        di_settings = data_integration_settings_mapping.get(block_uuid) or \
            data_integration_settings_mapping.get(block.uuid)

    if block and not di_settings:
        di_settings = block.get_data_integration_settings(
            dynamic_block_index=dynamic_block_index,
            dynamic_block_indexes=dynamic_block_indexes,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            from_notebook=from_notebook,
            global_vars=global_vars,
            input_vars=input_args,
            partition=execution_partition,
        )

    if should_reduce_output(block):
        all_variables = all_variable_uuids(
            block,
            partition=execution_partition,
        )
    else:
        all_variables = block.get_variables_by_block(
            block_uuid=block_uuid,
            dynamic_block_index=dynamic_block_index,
            partition=execution_partition,
        )

    output_variables = [v for v in all_variables
                        if is_output_variable(v, include_df=include_df)]

    DX_PRINTER.error(
        block=block,
        block_uuid=block_uuid,
        dynamic_block_index=dynamic_block_index,
        output_variables_count=len(output_variables) if output_variables else 'null',
        output_variables=', '.join(output_variables or []),
        all_variables_count=len(all_variables) if all_variables else 'null',
        all_variables=', '.join(all_variables or []),
        partition=execution_partition,
        should_reduce_output=should_reduce_output(block),
        __uuid='output_variables',
    )

    if block and di_settings:
        streams = get_selected_streams(di_settings.get('catalog'))
        tap_stream_ids = [s.get('tap_stream_id') for s in streams]
        # For integration pipelines, we want to include variables with the "output" prefix
        # to view sample data for the selected streams.
        if pipeline.type == PipelineType.INTEGRATION:
            output_variables.extend(tap_stream_ids)
        else:
            output_variables = tap_stream_ids

    output_variables.sort()

    return output_variables


def is_output_variable(variable_uuid: str, include_df: bool = True) -> bool:
    """
    Checks if the given variable UUID represents an output variable.

    `df` variable is only used to save the sample Spark dataframe now.

    Args:
        variable_uuid (str): The UUID of the variable.
        include_df (bool): Whether to include the `df` variable. Only set it to True
            when saving or fetching sample Spark dataframe.

    Returns:
        bool: True if the variable is an output variable, False otherwise.

    """
    return (include_df and variable_uuid == 'df') or variable_uuid.startswith('output')


def is_valid_print_variable(k, v, block_uuid):
    """
    Checks if the given key-value pair represents a valid print variable.

    Args:
        k: The key.
        v: The value.
        block_uuid: The UUID of the block.

    Returns:
        bool: True if the key-value pair is a valid print variable, False otherwise.
    """
    if f'{block_uuid}_' not in k:
        return False
    if type(v) is not str:
        return False
    # Not store empty json
    if v == '{}' or v == '':
        return False
    try:
        json_data = json.loads(v)
        # Not store empty data in json object
        if 'data' in json_data and not json_data['data']:
            return False
    except Exception:
        pass
    return True


def input_variables(
    pipeline,
    upstream_block_uuids: List[str],
    execution_partition: str = None,
    dynamic_block_index: int = None,
    dynamic_block_index_mapping: Dict = None,
    dynamic_block_indexes: Dict = None,
    dynamic_upstream_block_uuids: List[str] = None,
    from_notebook: bool = False,
    global_vars: Dict = None,
    include_df: bool = False,
    input_args: List[Any] = None,
    data_integration_settings_mapping: Dict = None,
) -> Dict[str, List[str]]:
    """
    Retrieves the input variables from the output variables of upstream blocks.

    Args:
        pipeline: The pipeline.
        upstream_block_uuids (List[str]): The UUIDs of the upstream blocks.
        execution_partition (str, optional): The execution partition.
        include_df (bool, optional): Whether to include the `df` variable. Only set it to True
            when saving or fetching sample Spark dataframe.

    Returns:
        Dict[str, List[str]]: A mapping from upstream block UUID to a list of variable names.
    """

    mapping = {}

    for block_uuid in upstream_block_uuids:
        if dynamic_block_index_mapping:
            if block_uuid in dynamic_block_index_mapping:
                dynamic_block_index = dynamic_block_index_mapping[block_uuid]

        out_vars = output_variables(
            pipeline,
            block_uuid,
            execution_partition,
            dynamic_block_index=dynamic_block_index,
            dynamic_block_indexes=dynamic_block_indexes,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            from_notebook=from_notebook,
            global_vars=global_vars,
            include_df=include_df,
            input_args=input_args,
            data_integration_settings_mapping=data_integration_settings_mapping,
        )
        mapping[block_uuid] = out_vars

    return mapping


def fetch_input_variables(
    pipeline,
    upstream_block_uuids: List[str],
    input_args: List[Any],
    block_run_outputs_cache: Dict[str, List] = None,
    data_integration_settings_mapping: Dict = None,
    dynamic_block_index: int = None,
    dynamic_block_indexes: Dict = None,
    dynamic_upstream_block_uuids: List[str] = None,
    execution_partition: str = None,
    from_notebook: bool = False,
    global_vars: Dict = None,
    dynamic_block_flags: List[DynamicBlockFlag] = None,
    metadata: Dict = None,
    upstream_block_uuids_override: List[str] = None,
    current_block=None,
) -> Tuple[List, List, List]:
    """
    Fetches the input variables for a block.

    Args:
        pipeline: The pipeline.
        upstream_block_uuids (List[str]): The UUIDs of the upstream blocks.
        input_args (List[Any]): The input arguments.
        execution_partition (str, optional): The execution partition.
        global_vars (Dict, optional): Global variables.
        dynamic_block_index (int, optional): The index of the dynamic block.
        dynamic_upstream_block_uuids (List[str], optional): The UUIDs of the dynamic upstream
            blocks.

    Returns:
        Tuple[List, List, List]: A tuple containing the input variables, kwargs variables, and
            upstream block UUIDs.
    """
    spark = (global_vars or dict()).get('spark')
    upstream_block_uuids_final = upstream_block_uuids_override or []

    if upstream_block_uuids_override:
        upstream_block_uuids = upstream_block_uuids_override

    kwargs_vars = []

    input_vars = []
    if input_args is not None:
        input_vars = input_args
        if upstream_block_uuids and not upstream_block_uuids_override:
            upstream_block_uuids_final = upstream_block_uuids
    elif pipeline is not None:
        # Mapping of original upstream block UUID and the dynamic block index to use for
        # retrieving data from a dynamic child upstream block.

        dynamic_block_index_mapping = {}
        disable_dynamic_index_for_output_variables = False
        # Fetch the data normally, then use the dynamic block index to select.
        block_is_dynamic_block = DynamicBlockFlag.DYNAMIC in (dynamic_block_flags or [])
        block_is_dynamic_block_child = DynamicBlockFlag.DYNAMIC_CHILD in (dynamic_block_flags or [])
        if block_is_dynamic_block and block_is_dynamic_block_child:
            disable_dynamic_index_for_output_variables = True

        if dynamic_block_indexes and (
            not block_is_dynamic_block or
            not block_is_dynamic_block_child or
            len(dynamic_block_indexes) >= 2
        ):
            for upstream_block_uuid, dynamic_block_index_folder in dynamic_block_indexes.items():
                block = pipeline.get_block(upstream_block_uuid)
                if block:
                    upstream_is_dynamic_block = is_dynamic_block(block)
                    upstream_is_dynamic_block_child = is_dynamic_block_child(block)

                    """
                    If the following conditions are true:
                    - Upstream is a dynamic block
                    - Upstream is a dynamic child block
                    - Current block is a virtual clone of the original one
                    """
                    if upstream_is_dynamic_block and \
                            upstream_is_dynamic_block_child and \
                            metadata and \
                            metadata.get('clone_original'):

                        dynamic_block_index_mapping[block.uuid] = extract_dynamic_block_index(
                            upstream_block_uuid,
                        )
                    elif upstream_is_dynamic_block and not upstream_is_dynamic_block_child:
                        # If the upstream block is dynamic and not a dynamic child block,
                        # it won‘t have output variable directories with the
                        # dynamic block index named after it.
                        dynamic_block_index_mapping[block.uuid] = None
                    else:
                        dynamic_block_index_mapping[block.uuid] = dynamic_block_index_folder
                else:
                    dynamic_block_index_mapping[upstream_block_uuid] = dynamic_block_index_folder

        dynamic_block_index_values_for_output_variables = dict(
            dynamic_block_index=dynamic_block_index,
            dynamic_block_index_mapping=dynamic_block_index_mapping,
            dynamic_block_indexes=dynamic_block_indexes,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
        )

        input_vars = [None for i in range(len(upstream_block_uuids))]

        # A mapping from upstream block UUID to a list of variable names
        input_variables_by_uuid = input_variables(
            pipeline,
            upstream_block_uuids,
            execution_partition,
            from_notebook=from_notebook,
            global_vars=global_vars,
            include_df=False,
            input_args=input_args,
            data_integration_settings_mapping=data_integration_settings_mapping,
            **(
                {} if disable_dynamic_index_for_output_variables else
                dynamic_block_index_values_for_output_variables
            ),
        )
        # Block UUIDs
        keys = input_variables_by_uuid.keys()
        reduce_output_indexes = []

        for idx, upstream_block_uuid in enumerate(keys):
            upstream_block_uuids_final.append(upstream_block_uuid)
            upstream_block = pipeline.get_block(upstream_block_uuid)
            should_reduce = should_reduce_output(upstream_block)

            upstream_is_dynamic_block = is_dynamic_block(upstream_block)
            upstream_is_dynamic_block_child = is_dynamic_block_child(upstream_block)

            if BlockType.GLOBAL_DATA_PRODUCT == upstream_block.type:
                global_data_product = upstream_block.get_global_data_product()
                input_vars[idx] = global_data_product.get_outputs()

                mds = {}
                variable_uuids = upstream_block.output_variables(
                    execution_partition=execution_partition,
                )
                for variable_uuid in variable_uuids:
                    md = pipeline.get_block_variable(
                        upstream_block_uuid,
                        variable_uuid,
                        partition=execution_partition,
                    )
                    if isinstance(md, dict):
                        mds.update(md)

                kwargs_vars.append(mds)

                continue

            # Block output variables for upstream_block_uuid
            variables = input_variables_by_uuid[upstream_block_uuid]

            dynamic_block_index_for_output_variable = \
                dynamic_block_index_values_for_output_variables.get('dynamic_block_index')

            if not disable_dynamic_index_for_output_variables and \
                    dynamic_block_index_mapping and \
                    upstream_block_uuid in dynamic_block_index_mapping:

                dynamic_block_index_for_output_variable = \
                    dynamic_block_index_mapping[upstream_block_uuid]

            # Fetch variable values
            if should_reduce:
                variable_values = [reduce_output_from_block(
                    upstream_block,
                    variable_uuid,
                    from_notebook=from_notebook,
                    global_vars=global_vars,
                    input_args=input_args,
                    partition=execution_partition,
                    raise_exception=True,
                    spark=spark,
                ) for variable_uuid in variables]
            else:
                # Getting input variables from cache the cache is not empty
                if block_run_outputs_cache:
                    variable_values = block_run_outputs_cache.get(upstream_block_uuid, [])
                else:
                    variable_values = [
                        pipeline.get_block_variable(
                            upstream_block_uuid,
                            var,
                            from_notebook=from_notebook,
                            global_vars=global_vars,
                            input_args=input_args,
                            partition=execution_partition,
                            raise_exception=True,
                            spark=spark,
                            dynamic_block_index=dynamic_block_index_for_output_variable,
                        )
                        for var in variables
                    ]

            upstream_in_dynamic_upstream = False
            if dynamic_upstream_block_uuids:
                for uuids in dynamic_upstream_block_uuids:
                    if upstream_in_dynamic_upstream:
                        continue
                    elif upstream_block_uuid in uuids:
                        upstream_in_dynamic_upstream = True

            # This is for blocks with multiple upstream dynamic blocks or dynamic child blocks.
            if dynamic_block_indexes and \
                    len(dynamic_block_indexes) >= 2 and \
                    upstream_block_uuid in dynamic_block_indexes:

                input_value = None

                input_data = variable_values[0]
                metadata_data = None

                # The 2nd item is for the metadata
                if len(variable_values) >= 2:
                    metadata_data = variable_values[1]

                index_of_upstream = int(dynamic_block_indexes.get(upstream_block_uuid))

                if input_data is not None and index_of_upstream < len(input_data):
                    input_value = input_data[index_of_upstream]

                if metadata_data is not None and index_of_upstream < len(metadata_data):
                    kwargs_vars.append(metadata_data[index_of_upstream])

                input_vars[idx] = input_value
            elif should_reduce:
                if isinstance(variable_values, list) and len(variable_values) == 1:
                    final_val = variable_values[0]
                else:
                    final_val = variable_values
                input_vars[idx] = final_val

            # Not sure how this is used now with the new implementation of dynamic blocks.
            # This block of code removed makes the current implementation work in almost all
            # edge cases.
            # elif dynamic_upstream_block_uuids and (should_reduce or upstream_in_dynamic_upstream):
            #     reduce_output_indexes.append((idx, upstream_block_uuid))
            elif upstream_is_dynamic_block:
                val = None

                if len(variable_values) >= 1:
                    arr = variable_values[0]

                    if dynamic_block_index is None or upstream_is_dynamic_block_child:
                        val = arr
                    else:
                        # SQL blocks will return a Pandas DataFrame
                        if type(arr) is pd.DataFrame:
                            val = arr.iloc[dynamic_block_index].to_dict()
                        elif type(arr) is list and len(arr) >= 1 and dynamic_block_index < len(arr):
                            val = arr[dynamic_block_index]

                input_vars[idx] = val

                # output_0 is the metadata for dynamic blocks
                if len(variable_values) >= 2:
                    arr = variable_values[1]

                    if dynamic_block_index is None or upstream_is_dynamic_block_child:
                        kwargs_vars.append(arr)
                    elif type(arr) is list and len(arr) >= 1 and dynamic_block_index < len(arr):
                        kwargs_vars.append(arr[dynamic_block_index])
            elif not dynamic_upstream_block_uuids or not upstream_in_dynamic_upstream:
                if type(variable_values) is list and len(variable_values) == 1:
                    final_val = variable_values[0]
                else:
                    final_val = variable_values

                if should_reduce:
                    final_val = [final_val]

                input_vars[idx] = final_val
            elif upstream_is_dynamic_block_child and not upstream_is_dynamic_block:
                # If the block has only 1 upstream dynamic child and no other
                # dynamic/dynamic child upstream.
                input_vars[idx] = variable_values

        if dynamic_upstream_block_uuids:
            for tup in reduce_output_indexes:
                idx = tup[0]
                upstream_block_uuid = tup[1]

                upstream_block = pipeline.get_block(upstream_block_uuid)
                should_reduce = should_reduce_output(upstream_block)

                if should_reduce:
                    continue

                upstream_is_dynamic = is_dynamic_block(upstream_block)

                uuids = list(
                    filter(lambda x: upstream_block_uuid in x, dynamic_upstream_block_uuids),
                )
                input_variables_by_uuid = input_variables(
                    pipeline,
                    uuids,
                    execution_partition,
                    dynamic_block_index=dynamic_block_index,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    from_notebook=from_notebook,
                    global_vars=global_vars,
                    include_df=False,
                    input_args=input_args,
                    data_integration_settings_mapping=data_integration_settings_mapping,
                )

                final_value = []
                for upstream_block_uuid, variables in input_variables_by_uuid.items():
                    end_idx = 1 if upstream_is_dynamic else len(variables)
                    for var in variables[:end_idx]:
                        variable_values = pipeline.get_block_variable(
                            upstream_block_uuid,
                            var,
                            from_notebook=from_notebook,
                            global_vars=global_vars,
                            input_args=input_args,
                            partition=execution_partition,
                            spark=spark,
                        )

                        if type(variable_values) is list and len(variable_values) == 1:
                            val = variable_values[0]
                        else:
                            val = variable_values

                        if type(val) is list:
                            final_value += val
                        else:
                            final_value.append(val)

                    # output_0 is the metadata for dynamic blocks
                    if dynamic_block_index is not None and \
                            upstream_is_dynamic and \
                            len(variables) >= 2:

                        var = variables[1]
                        variable_values = pipeline.get_block_variable(
                            upstream_block_uuid,
                            var,
                            from_notebook=from_notebook,
                            global_vars=global_vars,
                            input_args=input_args,
                            partition=execution_partition,
                            spark=spark,
                        )
                        if dynamic_block_index < len(variable_values):
                            val = variable_values[dynamic_block_index]
                            kwargs_vars.append(val)

                if ((upstream_is_dynamic and dynamic_block_index is not None)
                    or should_reduce) and \
                        len(final_value) >= 1 and \
                        all([type(v) is pd.DataFrame for v in final_value]):
                    final_value = pd.concat(final_value)

                if not should_reduce:
                    # Only get the 1st output of a dynamic block;
                    # the 2nd output is the dynamic child block’s metadata
                    if upstream_is_dynamic and dynamic_block_index is not None:
                        # SQL blocks will return a Pandas DataFrame
                        if type(final_value) is pd.DataFrame:
                            final_value = final_value.iloc[dynamic_block_index].to_dict()
                        else:
                            final_value = final_value[dynamic_block_index]

                    if type(final_value) is not pd.DataFrame and \
                        type(final_value) is list and \
                            len(final_value) == 1:
                        final_value = final_value[0]

                input_vars[idx] = final_value

    DX_PRINTER.debug(
        'fetch_input_variables final',
        input_vars=input_vars,
        kwargs_vars=kwargs_vars,
        upstream_block_uuids_final=upstream_block_uuids_final,
        __uuid='output_variables'
    )

    if kwargs_vars:
        kwargs_vars2 = []

        remote_blocks_output = []
        for kwargs in kwargs_vars:
            for remote_block_dict in kwargs.get('remote_blocks', []):
                # Global data products only need the remote block information, not the output
                if current_block and BlockType.GLOBAL_DATA_PRODUCT == current_block.type:
                    output = remote_block_dict
                else:
                    output = RemoteBlock.load(**remote_block_dict).get_outputs()
            remote_blocks_output.append(output)

        for kwargs in kwargs_vars:
            if kwargs.get('remote_blocks'):
                kwargs['remote_blocks'] = remote_blocks_output
            kwargs_vars2.append(kwargs)

        kwargs_vars = kwargs_vars2

    return input_vars, kwargs_vars, upstream_block_uuids_final


def serialize_output(
    block,
    data: Any,
    csv_lines_only: bool = False,
    variable_uuid: str = None,
):
    if type(data) is pd.DataFrame:
        if csv_lines_only:
            data = dict(
                table=data.to_csv(header=True, index=False).strip('\n').split('\n')
            )
        else:
            row_count, column_count = data.shape

            columns_to_display = data.columns.tolist()[:DATAFRAME_ANALYSIS_MAX_COLUMNS]
            data = dict(
                sample_data=dict(
                    columns=columns_to_display,
                    rows=json.loads(
                        data[columns_to_display].to_json(orient='split')
                    )['data']
                ),
                shape=[row_count, column_count],
                type=DataType.TABLE,
                variable_uuid=variable_uuid,
            )
    elif is_geo_dataframe(data):
        data = dict(
            text_data=f'''Use the code in a scratchpad to get the output of the block:

from mage_ai.data_preparation.variable_manager import get_variable
df = get_variable('{block.pipeline.uuid}', '{block.uuid}', 'df')
''',
            type=DataType.TEXT,
            variable_uuid=variable_uuid,
        )
    elif type(data) is str:
        data = dict(
            text_data=data,
            type=DataType.TEXT,
            variable_uuid=variable_uuid,
        )
    elif type(data) is dict or type(data) is list:
        data = dict(
            text_data=simplejson.dumps(
                data,
                default=datetime.isoformat,
                ignore_nan=True,
            ),
            type=DataType.TEXT,
            variable_uuid=variable_uuid,
        )
    elif is_spark_dataframe(data):
        df = data.toPandas()
        columns_to_display = df.columns.tolist()[:DATAFRAME_ANALYSIS_MAX_COLUMNS]
        data = dict(
            sample_data=dict(
                columns=columns_to_display,
                rows=json.loads(df[columns_to_display].to_json(orient='split'))['data']
            ),
            type=DataType.TABLE,
            variable_uuid=variable_uuid,
        )

    return data
