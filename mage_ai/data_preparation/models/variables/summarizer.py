import os
from typing import List, Optional, Tuple

from mage_ai.data_preparation.models.variables.cache import (
    AggregateInformation,
    VariableAggregateCache,
    VariableTypeInformation,
)
from mage_ai.data_preparation.models.variables.constants import (
    DATA_TYPE_FILENAME,
    VariableAggregateDataType,
    VariableAggregateDataTypeFilename,
    VariableAggregateSummaryGroupType,
)
from mage_ai.data_preparation.models.variables.utils import is_output_variable
from mage_ai.shared.utils import clean_name


def aggregate_summary_info_for_all_variables(
    variable_manager,
    pipeline_uuid: str,
    block_uuid: str,  # Make sure this is the base block_uuid, not with the dynamic block index
    partition: Optional[str] = None,
):
    block_uuid = clean_name(block_uuid)
    variable_uuids = variable_manager.get_variables_by_block(
        pipeline_uuid,
        block_uuid,
        partition=partition,
    )

    if variable_uuids and all(not is_output_variable(v) for v in variable_uuids):
        """
        Dynamic child blocks have this directory structure:
            [block_uuid]/
                [dynamic_block_index]/
                    [variable_uuid]/
        """
        variable_uuids = variable_manager.get_variables_by_block(
            pipeline_uuid,
            os.path.join(block_uuid, str(variable_uuids[0])),
            clean_block_uuid=False,
            partition=partition,
        )

    for variable_uuid in variable_uuids:
        variable = variable_manager.get_variable_object(
            pipeline_uuid,
            block_uuid,
            variable_uuid,
            partition=partition,
            skip_check_variable_type=True,
        )
        __aggregate_summary_info(variable)


def __aggregate_summary_info(variable):
    """
    Only consolidate summary files if at least 1 of the following criteria are met:
        - Dynamic child block
        - Variable has parts (e.g. output_0/[part_uuid])
    Consolidate summary files from all subfolders (except data.json):
        - insights.json
        - metadata.json
        - resources.json
        - sample_data.json
        - statistics.json
        - suggestions.json
        - type.json

    Directory structure
    [block_uuid]/                  -> variable.variable_dir_path
        [variable_uuid: output_0]/ -> variable.variable_path
            0/
                type.json
            1/
                type.json
            type.json
        [dynamic_block_index]/
            [variable_uuid: output_0]/
                0/
                    type.json
                1/
                    type.json
                type.json
    """

    filenames = [key.value for key in VariableAggregateDataTypeFilename]

    """
    [block_uuid]/                  -> variable.variable_dir_path
        [variable_uuid: output_0]/ -> variable.variable_path
            0/
                type.json
            1/
                type.json
            type.json
    """
    mapping_parts = {}
    if variable.part_uuids:
        for part_uuid in variable.part_uuids:  # part_uuid: 0/
            for filename in filenames:  # filename: type.json
                if not mapping_parts.get(filename):
                    mapping_parts[filename] = []

                file_path = os.path.join(variable.variable_path, part_uuid, filename)
                if variable.storage.path_exists(file_path):
                    mapping_parts[filename].append(
                        variable.storage.read_json_file(
                            file_path,
                            default_value={},
                            raise_exception=False,
                        ),
                    )
                else:
                    mapping_parts[filename].append({})

    """
    [block_uuid]/                      -> variable.variable_dir_path
        [dynamic_block_index]/         -> [read all of them]
            [variable_uuid: output_0]/ -> variable.uuid
                0/
                    type.json
                1/
                    type.json
                type.json
    """

    for dirname in VariableAggregateSummaryGroupType:
        path = os.path.join(variable.variable_dir_path, dirname.value)
        if variable.storage.path_exists(path):
            variable.storage.remove_dir(path)

    mapping_dynamic_blocks = {}
    # dynamic_block_index: 0
    # index_path:  [block_uuid]/[dynamic_block_index: 0]/
    # output_path: [block_uuid]/[dynamic_block_index: 0]/[variable_uuid: output_0]/
    for _dynamic_block_index, _index_path, output_path in dynamic_block_index_paths(variable):
        mapping_dynamic_children = {}
        for filename in filenames:  # filename: type.json
            if not mapping_dynamic_children.get(filename):
                mapping_dynamic_children[filename] = []

            part_uuids = __get_part_uuids(variable, output_path)
            if part_uuids and len(part_uuids) >= 1:
                arr = []
                for part_uuid in part_uuids:
                    part_path = os.path.join(output_path, part_uuid, filename)
                    if variable.storage.path_exists(part_path):
                        arr.append(
                            variable.storage.read_json_file(
                                part_path,
                                default_value={},
                                raise_exception=False,
                            ),
                        )
                mapping_dynamic_children[filename].append(arr)
            else:
                file_path = os.path.join(output_path, filename)
                if variable.storage.path_exists(file_path):
                    mapping_dynamic_children[filename].append(
                        variable.storage.read_json_file(
                            file_path,
                            default_value={},
                            raise_exception=True,
                        ),
                    )
                else:
                    mapping_dynamic_children[filename].append({})

        for filename, arr in mapping_dynamic_children.items():
            if not mapping_dynamic_blocks.get(filename):
                mapping_dynamic_blocks[filename] = []
            mapping_dynamic_blocks[filename].append(arr)

    for directory, mapping in [
        (VariableAggregateSummaryGroupType.DYNAMIC, mapping_dynamic_blocks),
        (VariableAggregateSummaryGroupType.PARTS, mapping_parts),
    ]:
        if len(mapping) == 0:
            continue

        path = os.path.join(variable.variable_path, directory)

        if not variable.storage.isdir(path):
            variable.storage.makedirs(path, exist_ok=True)

        for filename, data in mapping.items():
            variable.storage.write_json_file(os.path.join(path, filename), data)


def get_aggregate_summary_info(
    variable_manager,
    pipeline_uuid: str,
    block_uuid: str,
    variable_uuid: str,
    data_type: VariableAggregateDataType,
    default_group_type: Optional[VariableAggregateSummaryGroupType] = None,
    group_type: Optional[VariableAggregateSummaryGroupType] = None,
    partition: Optional[str] = None,
) -> VariableAggregateCache:
    variable = variable_manager.get_variable_object(
        pipeline_uuid,
        block_uuid,
        variable_uuid,
        partition=partition,
        skip_check_variable_type=True,
    )
    return __get_aggregate_summary_info(
        variable, data_type, default_group_type=default_group_type, group_type=group_type
    )


def __get_aggregate_summary_info(
    variable,
    data_type: VariableAggregateDataType,
    default_group_type: Optional[VariableAggregateSummaryGroupType] = None,
    group_type: Optional[VariableAggregateSummaryGroupType] = None,
) -> VariableAggregateCache:
    """
    Get aggregate summary information for the variable.

    Args:
        group_type (VariableAggregateSummaryGroupType): Group type of the variable.

    Returns:
        Optional[AggregateInformationData]: Aggregate summary information for the variable.

    Used
    """
    cache = VariableAggregateCache()

    path = os.path.join(
        variable.variable_path,
        group_type.value if group_type else '',
        DATA_TYPE_FILENAME[data_type],
    )

    if variable.storage.path_exists(path):
        data = variable.storage.read_json_file(
            path,
            default_value=None,
            raise_exception=False,
        )

        if group_type:
            group_info = getattr(cache, group_type.value)
            group_info = AggregateInformation.load(
                **(
                    group_info
                    if isinstance(group_info, dict)
                    else group_info.to_dict()
                    if group_info is not None
                    else {}
                )
            )
            group_info.update_attributes(**{
                data_type.value: data,
            })
            cache.update_attributes(**{
                group_type.value: group_info,
            })
        else:
            if (
                VariableAggregateDataType.TYPE == data_type.value
                and data is not None
                and isinstance(data, dict)
            ):
                if data.get('type'):
                    cache.update_attributes(**{
                        'type': VariableTypeInformation.load(type=data.get('type')),
                    })

                if default_group_type is not None and data.get('types'):
                    var_types = data.get('types') or []
                    group_info = getattr(cache, default_group_type.value)
                    group_info = AggregateInformation.load(
                        **(
                            group_info
                            if isinstance(group_info, dict)
                            else group_info.to_dict()
                            if group_info is not None
                            else {}
                        )
                    )
                    group_info.update_attributes(**{
                        data_type.value: [
                            VariableTypeInformation.load(type=val) for val in var_types
                        ],
                    })
                    cache.update_attributes(**{
                        default_group_type.value: group_info,
                    })

            else:
                cache.update_attributes(**{
                    data_type.value: data,
                })
    return VariableAggregateCache.load(**cache.to_dict())


def get_part_uuids(variable) -> Optional[List[str]]:
    if (
        not variable.uuid
        or not is_output_variable(variable.uuid)
        or not variable.storage.isdir(variable.variable_path)
    ):
        return None

    return __get_part_uuids(variable, variable.variable_path)


def dynamic_block_index_paths(variable) -> List[Tuple[int, str, str]]:
    if not variable.storage.isdir(variable.variable_dir_path):
        return []

    indexes = []
    for dynamic_block_index in variable.storage.listdir(variable.variable_dir_path):
        index_path = os.path.join(variable.variable_dir_path, dynamic_block_index)
        if dynamic_block_index.isdigit() and variable.storage.isdir(index_path):
            output_path = os.path.join(index_path, variable.uuid)
            if variable.storage.isdir(output_path):
                indexes.append((int(dynamic_block_index), index_path, output_path))

    return indexes


def __get_part_uuids(variable, path: str) -> Optional[List[str]]:
    part_uuids = None
    for chunk_uuid in variable.storage.listdir(path):
        if chunk_uuid.isdigit() and variable.storage.isdir(os.path.join(path, chunk_uuid)):
            if part_uuids is None:
                part_uuids = []
            part_uuids.append(chunk_uuid)

    return part_uuids
