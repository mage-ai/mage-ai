import json
import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union

import pandas as pd
import polars as pl
from scipy.sparse import csr_matrix

from mage_ai.data_preparation.models.block.dynamic.shared import (
    has_dynamic_block_upstream_parent as has_dynamic_block_upstream_parent_v1,
)
from mage_ai.data_preparation.models.block.dynamic.shared import (
    has_reduce_output_from_upstreams as has_reduce_output_from_upstreams_v1,
)
from mage_ai.data_preparation.models.block.dynamic.shared import (
    is_dynamic_block as is_dynamic_block_v1,
)
from mage_ai.data_preparation.models.block.dynamic.shared import (
    is_dynamic_block_child as is_dynamic_block_child_v1,
)
from mage_ai.data_preparation.models.block.dynamic.shared import (
    should_reduce_output as should_reduce_output_v1,
)
from mage_ai.data_preparation.models.block.dynamic.variables import (
    get_outputs_for_dynamic_block,
)
from mage_ai.data_preparation.models.constants import (
    DATAFRAME_ANALYSIS_MAX_COLUMNS,
    DATAFRAME_SAMPLE_COUNT_PREVIEW,
)
from mage_ai.data_preparation.models.utils import (
    is_basic_iterable,
    is_dataframe_or_series,
    prepare_data_for_output,
)
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.shared.array import find
from mage_ai.shared.custom_logger import DX_PRINTER
from mage_ai.shared.hash import ignore_keys_with_blank_values
from mage_ai.shared.models import BaseDataClass


class DynamicBlockFlag(str, Enum):
    CLONE_OF_ORIGINAL = 'clone_of_original'
    DYNAMIC = 'dynamic'
    DYNAMIC_CHILD = 'dynamic_child'
    ORIGINAL = 'original'
    REDUCE_OUTPUT = 'reduce_output'
    REPLICATED = 'replicated'
    SPAWN_OF_DYNAMIC_CHILD = 'spawn_of_dynamic_child'


def build_dynamic_block_uuid(
    block_uuid: str,
    metadata: Dict = None,
    index: int = None,
    indexes: List[int] = None,
    upstream_block_uuid: str = None,
    upstream_block_uuids: List[str] = None,
) -> str:
    """
    Generates a dynamic block UUID based on the given parameters.

    Args:
        block_uuid (str): The UUID of the parent block.
        metadata (Dict): The metadata of the block.
        index (int): The index of the dynamic block.
        upstream_block_uuid (str, optional): The UUID of the upstream block.

    Returns:
        str: The generated dynamic block UUID.
    """
    block_uuid_subname = metadata.get('block_uuid', index) if metadata else index
    uuid = f'{block_uuid}:{block_uuid_subname}'

    if upstream_block_uuids:
        uuid = ':'.join([
            str(block_uuid),
            '__'.join([str(i) for i in upstream_block_uuids]),
            str(block_uuid_subname),
        ])
    elif upstream_block_uuid:
        parts = upstream_block_uuid.split(':')
        if len(parts) >= 2:
            upstream_indexes = ':'.join(parts[1:])
            uuid = f'{uuid}:{upstream_indexes}'

    return uuid


def extract_dynamic_block_index(block_run_block_uuid: str) -> int:
    if block_run_block_uuid:
        parts = block_run_block_uuid.split(':')
        if len(parts) >= 2:
            return parts[-1]


def is_dynamic_block(block) -> bool:
    return is_dynamic_block_v1(block)


def should_reduce_output(block) -> bool:
    return should_reduce_output_v1(block)


def has_reduce_output_from_upstreams(block) -> bool:
    return has_reduce_output_from_upstreams_v1(block)


def has_dynamic_block_upstream_parent(block) -> bool:
    return has_dynamic_block_upstream_parent_v1(block)


def is_dynamic_block_child(block, include_reduce_output: Optional[bool] = None) -> bool:
    return is_dynamic_block_child_v1(block, include_reduce_output=include_reduce_output)


def is_replicated_block(block) -> bool:
    return True if block and block.replicated_block else False


def is_original_dynamic_child_block(
    block,
    block_run_block_uuid: int = None,
    block_run_id: int = None,
) -> bool:
    # Check to see if its the original non-cloned version.
    block_run = None

    def __get_block_run(block_run_id=block_run_id):
        from mage_ai.orchestration.db.models.schedules import BlockRun

        return BlockRun.query.get(block_run_id)

    if block:
        if not block_run_block_uuid and block_run_id:
            block_run = __get_block_run()
            block_run_block_uuid = block_run.block_uuid

        if block_run_block_uuid and block.uuid == block_run_block_uuid:
            return True

    if not block_run and not block_run_id:
        return False

    if not block_run:
        block_run = __get_block_run()

    if block and block.uuid == block_run.block_uuid:
        return True

    wrapper = DynamicBlockWrapperBase()
    wrapper.hydrate(block=block, block_run=block_run)

    return wrapper.is_dynamic_child() and wrapper.is_original(include_clone=True)


def uuid_for_output_variables(
    block,
    block_uuid: Optional[str] = None,
    dynamic_block_index: Optional[int] = None,
    dynamic_block_uuid: Optional[str] = None,
    join_character: Optional[str] = None,
    **kwargs,
) -> Tuple[str, bool]:
    changed = False

    block_uuid_0 = block_uuid
    dynamic_block_index_0 = dynamic_block_index

    if block_uuid is None:
        block_uuid = block.uuid

    is_dynamic_child = is_dynamic_block_child(block)

    if is_dynamic_child and dynamic_block_index is not None:
        return os.path.join(block.uuid, str(dynamic_block_index)), True

    is_dynamic = is_dynamic_block(block)
    if (not is_dynamic and (dynamic_block_index is None or is_dynamic_child)) or (
        is_dynamic and is_dynamic_child
    ):
        parts = block_uuid.split(':')

        if len(parts) >= 2:
            block_uuid = parts[0]

            if dynamic_block_index is None:
                dynamic_block_index = parts[-1]

        if dynamic_block_index is not None:
            # We only need the base name and the final index to create the folder structure:
            # e.g. block_uuid/[dynamic_block_index]
            # e.g. block_uuid/0/output_0/data.json
            # [dynamic_block_index] if used for each dynamic child so that it has a folder
            # to store its output.
            # dynamic_block_index = dynamic_block_uuid.split(':')[-1]
            # block_uuid = os.path.join(block_uuid, str(dynamic_block_index))
            arr = [str(block_uuid), str(dynamic_block_index)]
            if join_character:
                block_uuid = join_character.join(arr)
            else:
                block_uuid = os.path.join(*arr)
            changed = True

    DX_PRINTER.debug(
        block=block,
        block_uuid=block_uuid,
        block_uuid_0=block_uuid_0,
        changed=changed,
        dynamic_block_index=dynamic_block_index,
        dynamic_block_index_0=dynamic_block_index_0,
        dynamic_block_uuid=dynamic_block_uuid,
        __uuid='uuid_for_output_variables',
    )

    return (block_uuid, changed)


def transform_dataframe_for_display(
    dataframe: pd.DataFrame,
    is_dynamic: bool = False,
    is_dynamic_child: bool = False,
    sample_columns: int = DATAFRAME_ANALYSIS_MAX_COLUMNS,
    sample_count: int = DATAFRAME_SAMPLE_COUNT_PREVIEW,
    shape: Optional[Tuple[int, int]] = None,
) -> Dict:
    data = None

    column_name = '-'
    if is_dynamic:
        column_name = 'dynamic child blocks'
    elif is_dynamic_child:
        column_name = 'output'

    if isinstance(dataframe, pd.DataFrame):
        columns_to_display = dataframe.columns.tolist()[:sample_columns]
        row_count, column_count = shape or dataframe.shape

        df = dataframe.iloc[:sample_count][columns_to_display]

        data = dict(
            columns=columns_to_display,
            rows=json.loads(df.to_json(orient='split'))['data'],
            shape=[row_count, column_count],
        )
    else:
        data = dict(
            columns=[column_name],
            rows=[[dataframe[:sample_count]]],
            shape=list(shape) if shape else [1, 1],
        )

    return dict(
        data=data,
        type=DataType.TABLE,
    )


def coerce_into_dataframe(
    child_data: Union[
        List[Union[Dict, int, str, pd.DataFrame]],
        Dict,
        int,
        str,
        pd.DataFrame,
    ],
    is_dynamic: bool = False,
    is_dynamic_child: bool = False,
    single_item_only: bool = False,
) -> pd.DataFrame:
    child_data, _ = prepare_data_for_output(child_data, single_item_only=single_item_only)

    column_name = '-'
    if is_dynamic:
        column_name = 'dynamic child blocks'
    elif is_dynamic_child:
        column_name = 'output'

    if isinstance(child_data, list) and len(child_data) >= 1:
        item = child_data[0]
        if isinstance(item, pd.DataFrame):
            child_data = child_data
        elif isinstance(item, dict):
            child_data = pd.DataFrame(child_data)
        else:
            child_data = pd.DataFrame(
                [
                    {
                        column_name: value,
                    }
                    for value in child_data
                ],
            )
    elif isinstance(child_data, (pd.DataFrame, pl.DataFrame)):
        return child_data
    else:
        child_data = pd.DataFrame([
            {
                column_name: child_data,
            }
        ])

    return child_data


def limit_output(
    output: Union[List, pd.DataFrame, pd.Series, csr_matrix],
    sample_count: int = DATAFRAME_SAMPLE_COUNT_PREVIEW,
    sample_columns: Optional[int] = DATAFRAME_ANALYSIS_MAX_COLUMNS,
) -> Union[List, pd.DataFrame, pd.Series, csr_matrix]:
    if sample_count is not None and output is not None:
        if isinstance(output, list):
            output = output[:sample_count]
        elif isinstance(output, pd.Series):
            output = output.iloc[:sample_count]
        elif isinstance(output, pd.DataFrame):
            if sample_columns is not None:
                output = output.iloc[:sample_count, :sample_columns]
            else:
                output = output.iloc[:sample_count]
        elif isinstance(output, csr_matrix):
            output = output[:sample_count]  # For csr_matrix, this slices rows
            if sample_columns is not None:
                output = output[:, :sample_columns]
    return output


def transform_output(
    output: Tuple[Union[List[Union[Dict, int, str, pd.DataFrame]], pd.DataFrame], List[Dict]],
    is_dynamic: bool = False,
    is_dynamic_child: bool = False,
):
    child_data = None
    metadata = None
    if len(output) >= 1:
        child_data = output[0]

        if len(output) >= 2:
            metadata = output[1]

    if child_data is None:
        return []

    child_data = coerce_into_dataframe(
        child_data,
        is_dynamic=is_dynamic,
        is_dynamic_child=is_dynamic_child,
    )

    if isinstance(child_data, tuple):
        return transform_output(
            child_data,
            is_dynamic=is_dynamic,
            is_dynamic_child=is_dynamic_child,
        )
    elif isinstance(child_data, list):
        child_data = [
            transform_dataframe_for_display(
                data,
                is_dynamic=is_dynamic,
                is_dynamic_child=is_dynamic_child,
            )
            for data in child_data
        ]
    else:
        child_data = transform_dataframe_for_display(
            child_data,
            is_dynamic=is_dynamic,
            is_dynamic_child=is_dynamic_child,
        )

    if metadata is not None:
        metadata = transform_dataframe_for_display(
            coerce_into_dataframe(
                metadata,
                is_dynamic=is_dynamic,
                is_dynamic_child=is_dynamic_child,
            ),
            is_dynamic=is_dynamic,
            is_dynamic_child=is_dynamic_child,
        )

    return child_data, metadata


def transform_output_for_display(
    output: Tuple[Union[List[Union[Dict, int, str, pd.DataFrame]], pd.DataFrame], List[Dict]],
    is_dynamic: bool = False,
    is_dynamic_child: bool = False,
    sample_count: Optional[int] = None,
    sample_columns: Optional[int] = None,
) -> List[Dict]:
    child_data, metadata = transform_output(
        output,
        is_dynamic=is_dynamic,
        is_dynamic_child=is_dynamic_child,
    )
    child_data = limit_output(child_data, sample_count, sample_columns=sample_columns)
    metadata = limit_output(metadata, sample_count, sample_columns=sample_columns)

    return dict(
        data=dict(
            columns=['dynamic children data', 'metadata'],
            rows=[child_data, metadata],
            shape=[2, 2],
        ),
        type=DataType.TABLE,
        multi_output=True,
    )


def transform_output_for_display_reduce_output(
    output: List[Any],
    is_dynamic: bool = False,
    is_dynamic_child: bool = False,
    sample_count: Optional[int] = None,
    sample_columns: Optional[int] = None,
) -> List[Dict]:
    output = [
        limit_output(
            values,
            sample_count=sample_count,
            sample_columns=sample_columns,
        )
        for values in output
    ]

    output = limit_output(output, sample_count=sample_count, sample_columns=sample_columns)

    arr = [
        dict(
            text_data=data,
            type=DataType.TEXT,
            variable_uuid=f'reduced output {idx}',
        )
        for idx, data in enumerate(output)
    ]

    return arr


def combine_transformed_output_for_multi_output(
    transform_outputs: List[Dict],
    columns: Optional[List[str]] = None,
    is_grouping: bool = False,
) -> Dict[str, Union[DataType, Dict, bool, str]]:
    columns_use = columns or []
    for i in range(len(transform_outputs)):
        if not columns:
            columns_use.append(f'output {i}')

    return dict(
        data=dict(
            columns=columns_use,
            rows=transform_outputs,
            shape=[
                len(transform_outputs),
                len(columns_use),
            ],
        ),
        type=DataType.GROUP if is_grouping else DataType.TABLE,
        multi_output=True,
    )


def transform_output_for_display_dynamic_child(
    output: List[
        Union[
            List[Union[Dict, int, str, pd.DataFrame]],
            Dict,
            int,
            str,
            pd.DataFrame,
        ],
    ],
    is_dynamic: bool = False,
    is_dynamic_child: bool = False,
    single_item_only: bool = False,
) -> List[Dict]:
    df = None
    for output_from_variable_object in output:
        df_inner = coerce_into_dataframe(
            output_from_variable_object,
            is_dynamic=is_dynamic,
            is_dynamic_child=is_dynamic_child,
            single_item_only=single_item_only,
        )
        if df is None:
            df = df_inner
        else:
            df.reset_index(drop=True, inplace=True)
            df_inner.reset_index(drop=True, inplace=True)
            df = pd.concat([df, df_inner], axis=1, ignore_index=True)

    shape = None
    if hasattr(df, 'shape'):
        shape = df.shape

    if isinstance(df, pd.DataFrame) and len(set(df.columns)) == 1:
        df.columns = [str(idx) for idx, col in enumerate(df.columns)]

    return transform_dataframe_for_display(
        df,
        is_dynamic=is_dynamic,
        is_dynamic_child=is_dynamic_child,
        shape=shape,
    )


def create_combinations(combinations: List[Any]) -> List[Any]:
    def __create_combinations(combinations_inner: List[Any]) -> List[Any]:
        combos = []

        for idx, arr in enumerate(combinations_inner):
            for value in arr:
                combinations_next = combinations_inner[(idx + 1) :]
                if len(combinations_next) >= 1:
                    for combos_down in __create_combinations(combinations_next):
                        combos.append([value] + combos_down)
                else:
                    combos.append([value])

        return combos

    count = len(combinations)
    arr = __create_combinations(combinations)
    return [combo for combo in arr if len(combo) == count]


def build_combinations_for_dynamic_child(
    block,
    execution_partition: str = None,
    origin_block: Optional[Any] = None,
    **kwargs,
):
    """
    kwargs (if from output_display.py)
        custom_code
        execution_uuid
        from_notebook
        global_vars
        logger
        output_messages_to_logs
        run_settings
        update_status
    """

    """
    A list for each upstream block
    [
        [0, 1, 2],
        [0],
        [0, 1],
    ]
    """
    if origin_block is None:
        origin_block = block

    dynamic_counts = []

    for upstream_block in block.upstream_blocks:
        # Dynamic child logic always takes precedence
        has_reduce_output = should_reduce_output(upstream_block)
        is_dynamic_child = is_dynamic_block_child(upstream_block)
        is_dynamic = is_dynamic_block(upstream_block)

        if (is_dynamic_child or is_dynamic) and not has_reduce_output:
            if is_dynamic_child:
                """
                Get the number of children that was for this upstream block:
                by getting all the top level output variables: e.g.
                    0/
                        output_0
                    1/
                        output_1
                Top level variables are: 0, 1...N
                """
                # e.g. 3 combinations aka children were made for the upstream dynamic child block
                arr = []
                children_created = build_combinations_for_dynamic_child(
                    upstream_block,
                    execution_partition=execution_partition,
                    origin_block=origin_block,
                )
                if is_dynamic:
                    for dynamic_block_index in range(len(children_created)):
                        values, _metadata = get_outputs_for_dynamic_block(
                            upstream_block,
                            execution_partition=execution_partition,
                            dynamic_block_index=dynamic_block_index,
                            origin_block=origin_block,
                        )
                        if values is not None:
                            if is_basic_iterable(values) or is_dataframe_or_series(values):
                                count = len(values)
                            else:
                                count = 1
                            arr.extend([idx for idx in range(count)])
                        else:
                            arr.append(0)
                else:
                    arr.extend([idx for idx in range(len(children_created))])
            else:
                arr, _metadata = get_outputs_for_dynamic_block(
                    upstream_block,
                    execution_partition=execution_partition,
                    origin_block=origin_block,
                )
                if arr is not None:
                    if not is_basic_iterable(arr) and not is_dataframe_or_series(arr):
                        arr = [0]
            if arr is not None and hasattr(arr, '__len__') and len(arr) > 0:
                dynamic_counts.append([idx for idx in range(len(arr))])
            else:
                dynamic_counts.append([0])
        else:
            dynamic_counts.append([0])

    # [[0], [1], [2]]
    combinations = create_combinations(dynamic_counts)

    settings = []
    for dynamic_block_index, _arr in enumerate(combinations):
        # dynamic_block_index = 0
        # arr = [1, 2, 3, 4]

        # dynamic_block_indexes = { 'dynamic_parent': 1 }
        dynamic_block_indexes = {}
        for idx, upstream_block in enumerate(block.upstream_blocks):
            is_dynamic_child = is_dynamic_block_child(upstream_block)
            is_dynamic = is_dynamic_block(upstream_block)

            # 0 % 3 = 0
            # 1 % 3 = 1
            # 2 % 3 = 2

            parent_index = dynamic_block_index % len(dynamic_counts[idx])

            if is_dynamic_child or is_dynamic:
                dynamic_block_indexes[upstream_block.uuid] = parent_index

        settings.append(
            dict(
                dynamic_block_index=dynamic_block_index,
                dynamic_block_indexes=dynamic_block_indexes,
            )
        )

    return settings


@dataclass
class DynamicBlockWrapperBase(BaseDataClass):
    block: Any = None
    block_run_block_uuid: str = None
    block_uuid: str = None
    children: List[BaseDataClass] = field(default_factory=lambda: [])
    clones: List[BaseDataClass] = field(default_factory=lambda: [])
    dynamic_block_index: int = None
    dynamic_block_indexes: Dict = None
    factory: Any = None
    flags: List[DynamicBlockFlag] = field(default_factory=lambda: [])
    index: int = None
    metadata_instructions: BaseDataClass = field(default_factory=lambda: {})
    siblings: List[BaseDataClass] = field(default_factory=lambda: [])
    spawns: List[BaseDataClass] = field(default_factory=lambda: [])
    upstream_dynamic_blocks: List[BaseDataClass] = field(default_factory=lambda: [])
    upstream_dynamic_child_blocks: List[BaseDataClass] = field(default_factory=lambda: [])
    uuid: str = None


@dataclass
class DynamicBlockWrapper(BaseDataClass):
    block: Any = None
    block_run_block_uuid: str = None
    block_uuid: str = None
    # If the current block is a dynamic block, then the children are the dynamic child blocks
    # that are created from this block’s output.
    children: List[DynamicBlockWrapperBase] = field(default_factory=lambda: [])
    # If the current block is the original, then clones are the other blocks that the original
    # created to handle the responsibility of controlling what block runs are created
    # from an upstream dynamic block.
    clones: List[DynamicBlockWrapperBase] = field(default_factory=lambda: [])
    dynamic_block_index: int = None
    dynamic_block_indexes: Dict = None
    factory: Any = None
    flags: List[DynamicBlockFlag] = field(default_factory=lambda: [])
    metadata_instructions: BaseDataClass = None
    # Other blocks at the same level; other cloned blocks, other spawns, etc.
    siblings: List[DynamicBlockWrapperBase] = field(default_factory=lambda: [])
    # If the current block is an original dynamic child block or cloned dynamic child block,
    # then spawns are the blocks that are created based on the original or cloned upstream
    # dynamic block’s (e.g. a direct parent block) output.
    spawns: List[DynamicBlockWrapperBase] = field(default_factory=lambda: [])
    # Upstream blocks that are dynamic blocks.
    upstream_dynamic_blocks: List[DynamicBlockWrapperBase] = field(default_factory=lambda: [])
    # Upstream blocks that are dynamic child blocks.
    upstream_dynamic_child_blocks: List[DynamicBlockWrapperBase] = field(
        default_factory=lambda: []
    )
    # Unique identifier used as a suffix in the block run.
    uuid: str = None

    def __post_init__(self):
        self.factory._wrapper = self

        block_run = self.factory.block_run()

        self.block = self.factory.block
        self.block_uuid = self.block.uuid if self.block else None
        self.block_run_block_uuid = block_run.block_uuid if block_run else None
        self.uuid = self.block_run_block_uuid or self.block_uuid

        if block_run:
            config = block_run.metrics or {}
            self.dynamic_block_index = config.get('dynamic_block_index')
            self.dynamic_block_indexes = config.get('dynamic_block_indexes')

            metadata = config.get('metadata') or {}

            self.flags = [DynamicBlockFlag(v) for v in metadata.get('flags') or []]
            if metadata.get('clone_original', False):
                self.flags.append(DynamicBlockFlag.CLONE_OF_ORIGINAL)
            self.flags = list(set(self.flags))

            for key in [
                'uuid',
            ]:
                value = metadata.get(key) or None
                if value:
                    setattr(self, key, value)

            for key in [
                'children',
                'clones',
                'siblings',
                'spawns',
                'upstream_dynamic_blocks',
                'upstream_dynamic_child_blocks',
            ]:
                values = metadata.get(key) or None
                if values:
                    setattr(self, key, [self.load(**m) for m in values])

    def is_original(self, include_clone: bool = False) -> bool:
        if DynamicBlockFlag.ORIGINAL in (self.flags or []) or (
            include_clone and self.is_clone_of_original()
        ):
            return True

        if not self.block:
            return False

        return self.block.uuid == self.block_run_block_uuid or (
            self.is_replicated() and self.block.uuid_replicated == self.block_run_block_uuid
        )

    def is_replicated(self) -> bool:
        return DynamicBlockFlag.REPLICATED in (self.flags or []) or is_replicated_block(self.block)

    def is_clone_of_original(self) -> bool:
        return DynamicBlockFlag.CLONE_OF_ORIGINAL in (self.flags or []) and not self.is_original()

    def is_dynamic(self) -> bool:
        if DynamicBlockFlag.DYNAMIC in (self.flags or []):
            return True
        return self.block and is_dynamic_block(self.block)

    def is_dynamic_child(self) -> bool:
        if DynamicBlockFlag.DYNAMIC_CHILD in (self.flags or []):
            return True
        return self.block and is_dynamic_block_child(self.block)

    def is_dynamic_squared(self) -> bool:
        return self.is_dynamic() and self.is_dynamic_child()

    def is_spawn(self) -> bool:
        if DynamicBlockFlag.SPAWN_OF_DYNAMIC_CHILD in (self.flags or []):
            return True

        return (
            (self.block or self.block_uuid)
            and self.block_run_block_uuid
            and (
                (self.block and self.block.uuid != self.block_run_block_uuid)
                or (self.block_uuid and self.block_uuid != self.block_run_block_uuid)
            )
            and not self.is_original(include_clone=True)
        )

    def should_reduce_output(self) -> bool:
        if DynamicBlockFlag.REDUCE_OUTPUT in (self.flags or []):
            return True
        return self.block and should_reduce_output(self.block)

    def get_dynamic_block_index_from_parent(
        self,
        block_run_block_uuid: str,
    ) -> int:
        if not self.dynamic_block_indexes:
            block_run = self.factory.block_run()
            if block_run and block_run.metrics:
                self.dynamic_block_indexes = (block_run.metrics or {}).get(
                    'dynamic_block_indexes',
                )

        if self.dynamic_block_indexes:
            return (self.dynamic_block_indexes or {}).get(block_run_block_uuid)

    def get_parent_block_uuid_for_output_variables(
        self,
        block,
        block_run_block_uuid: str,
    ) -> str:
        dynamic_block_index_from_parent = self.get_dynamic_block_index_from_parent(
            block_run_block_uuid,
        )

        return uuid_for_output_variables(
            block,
            block_uuid=block_run_block_uuid,
            dynamic_block_index=dynamic_block_index_from_parent,
            join_character=':',
        )[0]

    def get_dynamic_block_index(self) -> int:
        if self.dynamic_block_index is not None:
            return self.dynamic_block_index

        block_run = self.factory.block_run()
        if block_run and block_run.metrics:
            self.dynamic_block_index = (block_run.metrics or {}).get(
                'dynamic_block_index',
            )

        return self.dynamic_block_index

    def to_dict_base(self, **kwargs) -> dict:
        data = dict(
            dynamic_block_index=self.get_dynamic_block_index(),
        )

        flags = []
        if self.is_original():
            flags.append(DynamicBlockFlag.ORIGINAL)
        if self.is_clone_of_original():
            flags.append(DynamicBlockFlag.CLONE_OF_ORIGINAL)
        if self.is_dynamic():
            flags.append(DynamicBlockFlag.DYNAMIC)
        if self.is_dynamic_child():
            flags.append(DynamicBlockFlag.DYNAMIC_CHILD)
        if self.is_spawn():
            flags.append(DynamicBlockFlag.SPAWN_OF_DYNAMIC_CHILD)
        if self.should_reduce_output():
            flags.append(DynamicBlockFlag.REDUCE_OUTPUT)

        flags = list(set(flags + (self.flags or [])))
        if len(flags) >= 1:
            data['flags'] = [v.value for v in flags if isinstance(v, DynamicBlockFlag)]

        for key in [
            'block_run_block_uuid',
            'block_uuid',
            'uuid',
        ]:
            if getattr(self, key) is not None:
                data[key] = getattr(self, key)

        return ignore_keys_with_blank_values(data)

    def to_dict(
        self,
        include_all: bool = False,
        use_metadata_instructions: bool = False,
        **kwargs,
    ) -> dict:
        if use_metadata_instructions:
            return ignore_keys_with_blank_values(
                dict(
                    clone_original=self.metadata_instructions.clone_original,
                    original=self.metadata_instructions.original.to_dict_base(),
                    upstream=self.metadata_instructions.upstream.to_dict_base(),
                )
            )

        data = self.to_dict_base(**kwargs)
        if include_all:
            for key in [
                'children',
                'clones',
                'siblings',
                'spawns',
                'upstream_dynamic_blocks',
                'upstream_dynamic_child_blocks',
            ]:
                values = getattr(self, key) or None
                if values:
                    data[key] = [v.to_dict_base(**kwargs) for v in values]

        return ignore_keys_with_blank_values(data)


@dataclass
class MetadataInstructions(BaseDataClass):
    clone_original: bool = False
    original: DynamicBlockWrapper = None
    parent: DynamicBlockWrapper = None
    upstream: DynamicBlockWrapper = None

    def __post_init__(self):
        self.serialize_attribute_class('original', DynamicBlockWrapper)
        self.serialize_attribute_class('parent', DynamicBlockWrapper)
        self.serialize_attribute_class('upstream', DynamicBlockWrapper)


def dynamically_created_child_block_runs(pipeline, block, block_runs: List):
    def _find_child(br, block=block, pipeline=pipeline):
        block2 = pipeline.get_block(br.block_uuid)
        return br.block_uuid != block.uuid and block2 and block2.uuid == block.uuid

    return list(filter(_find_child, block_runs))


def all_upstreams_completed(block, block_runs: List) -> bool:
    pipeline = block.pipeline

    block_runs_for_current_block = filter(
        lambda br: block.uuid == pipeline.get_block(br.block_uuid).uuid,
        block_runs,
    )

    upstream_block_uuids_mapping = {}
    for br in block_runs_for_current_block:
        # If this dynamic child block has upstream blocks that were dynamically created:
        if br.metrics and br.metrics.get('dynamic_upstream_block_uuids'):
            for up_uuid in br.metrics.get('dynamic_upstream_block_uuids') or []:
                up_block = pipeline.get_block(up_uuid)
                if up_block and up_block.uuid not in upstream_block_uuids_mapping:
                    upstream_block_uuids_mapping[up_block.uuid] = []
                # Create a mapping of the original upstream block
                # to all of its dynamic child block’s block run’s block_uuid
                upstream_block_uuids_mapping[up_block.uuid].append(up_uuid)

    completed_checks = []
    # Check that all the upstream block for this block is completed.
    for upstream_block in block.upstream_blocks:
        # If the upstream block’s UUID is in the mapping, that means it had an upstream block
        # that was a dynamic child block; and it’s upstream was dynamically created.
        if upstream_block.uuid in upstream_block_uuids_mapping:
            br_uuids = upstream_block_uuids_mapping[upstream_block.uuid]
            for br_uuid in br_uuids:
                up_block_run = find(
                    lambda br, br_uuid=br_uuid: br.block_uuid == br_uuid,
                    block_runs,
                )

                if up_block_run:
                    completed = 'completed' == up_block_run.status
                    completed_checks.append(completed)
                    if not completed:
                        return False
                else:
                    # If there is no block run, then it never completed.
                    completed_checks.append(False)
                    return False
        elif upstream_block.upstream_blocks:
            # If the upstream block has other upstream blocks that don’t have
            # dynamically created upstream blocks:
            completed = all_upstreams_completed(
                upstream_block,
                block_runs,
            )
            completed_checks.append(completed)
            if not completed:
                return False

            # for up_upstream_block in upstream_block.upstream_blocks:
        else:
            # If the upstream block has no upstream blocks,
            # check to see if its single block run is completed.
            up_block_run = find(
                lambda br, upstream_block=upstream_block: br.block_uuid == upstream_block.uuid,
                block_runs,
            )

            if up_block_run:
                completed = 'completed' == up_block_run.status
                completed_checks.append(completed)
                if not completed:
                    return False
            else:
                # If there is no block run, then it never completed.
                completed_checks.append(False)
                return False

    return all(completed_checks)


def check_all_dynamic_upstreams_completed(
    block,
    block_runs: List,
    execution_partition: str = None,
):
    pipeline = block.pipeline

    def __is_completed(
        upstream_block,
        block_runs=block_runs,
        execution_partition=execution_partition,
        pipeline=pipeline,
    ):
        if not upstream_block.upstream_blocks:
            return True

        from mage_ai.orchestration.db.models.schedules import BlockRun

        upstreams_done = all([
            check_all_dynamic_upstreams_completed(
                b,
                block_runs=block_runs,
                execution_partition=execution_partition,
            )
            for b in upstream_block.upstream_blocks
        ])

        if not upstreams_done:
            return False

        is_dynamic_child = is_dynamic_block_child(upstream_block)
        if is_dynamic_child:
            combos = build_combinations_for_dynamic_child(
                upstream_block,
                execution_partition=execution_partition,
            )

            selected = [
                br
                for br in block_runs
                if pipeline.get_block(
                    br.block_uuid,
                ).uuid
                == upstream_block.uuid
                and br.status == BlockRun.BlockRunStatus.COMPLETED
            ]

            if len(list(selected)) < len(combos) + 1:
                return False

        return all([
            br.status == BlockRun.BlockRunStatus.COMPLETED
            for br in filter(
                lambda br: pipeline.get_block(br.block_uuid).uuid == upstream_block.uuid,
                block_runs,
            )
        ])

    # 1. Are all the upstream blocks for my upstream blocks completed?
    # 2. Then, are my immediate upstream blocks completed?
    checks = [__is_completed(upstream_block) for upstream_block in block.upstream_blocks]
    return all(checks)
