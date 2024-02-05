import os
from typing import Any, Dict, List, Tuple


def all_variable_uuids(block, partition: str = None) -> List[str]:
    arr = __all_variable_uuids_and_file_paths_for_reducing_block_output(
        block,
        partition=partition,
    )

    return list(set([tup[0] for tup in arr]))


def reduce_output_from_block(
    block,
    variable_uuid: str,
    from_notebook: bool = False,
    global_vars: Dict = None,
    input_args: List[Any] = None,
    partition: str = None,
    raise_exception: bool = False,
    spark=None,
) -> List:
    block_uuid = block.uuid
    variable_object_for_base_block = block.get_variable_object(
        block_uuid=block_uuid,
        partition=partition,
    )

    output = []

    # /.mage_data/default_repo/pipelines/dynamic_reduce_all_levels
    # /.variables/415/20230930T135530/child_b_30
    variable_dir_path = variable_object_for_base_block.variable_dir_path

    arr = __all_variable_uuids_and_file_paths_for_reducing_block_output(
        block,
        partition=partition,
    )

    for dir_name, dir_path in arr:
        # e.g. output_0
        if variable_uuid != dir_name:
            continue

        # /.mage_data/default_repo/pipelines/dynamic_reduce_all_levels
        # /.variables/415/20230930T135530/child_b_30/1/1
        dir_path_without_variable_uuid = os.path.dirname(dir_path)

        # 1/1
        subdirs = os.path.relpath(
            dir_path_without_variable_uuid,
            variable_dir_path,
        )

        block_uuid_dynamic = ':'.join([block_uuid] + list(os.path.split(subdirs)))

        variable = block.pipeline.get_block_variable(
            block_uuid_dynamic,
            variable_uuid,
            from_notebook=from_notebook,
            global_vars=global_vars,
            input_args=input_args,
            partition=partition,
            raise_exception=raise_exception,
            spark=spark,
        )

        output.append(variable)

    return output


def __all_variable_uuids_and_file_paths_for_reducing_block_output(
    block,
    partition: str = None,
) -> List[Tuple]:
    block_uuid = block.uuid
    variable_object_for_base_block = block.get_variable_object(
        block_uuid=block_uuid,
        partition=partition,
    )

    variable_uuid_and_file_paths = []

    # /.mage_data/default_repo/pipelines/dynamic_reduce_all_levels
    # /.variables/415/20230930T135530/child_b_30
    variable_dir_path = variable_object_for_base_block.variable_dir_path
    for tup in os.walk(variable_dir_path):
        # ('../child_b_30/0/0/output_0', [], ['data.json', 'sample_data.json'])
        dir_path, subdirs, _filenames = tup

        # No subdirectories means its a leaf node with only files.
        if len(subdirs) == 0:
            # dir_path
            # /.mage_data/default_repo/pipelines/dynamic_reduce_all_levels
            # /.variables/415/20230930T135530/child_b_30/1/1/output_0

            # e.g. output_0
            dir_name = os.path.basename(os.path.normpath(dir_path))

            variable_uuid_and_file_paths.append((
                dir_name,
                dir_path,
            ))

    return variable_uuid_and_file_paths
