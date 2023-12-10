from typing import Dict, List, Tuple

import pandas as pd

from mage_ai.data_preparation.models.block.utils import (
    dynamic_block_uuid,
    dynamic_block_values_and_metadata,
    is_dynamic_block,
    is_dynamic_block_child,
)
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.shared.array import find_index


class DynamicChildBlockFactory:
    def __init__(self, block, pipeline_run=None, **kwargs):
        self.block = block
        self.pipeline_run = pipeline_run
        self.type = BlockType.DYNAMIC_CHILD

    def __getattr__(self, name):
        val = getattr(self.block, name)

        def _missing(val=val, *args, **kwargs):
            return val(*args, **kwargs)

        if callable(val):
            return _missing

        return val

    def execute_sync(
        self,
        execution_partition: str = None,
        **kwargs,
    ) -> List[Dict]:
        arr = []

        values = self.__build_block_runs(self.block, execution_partition)
        if not values:
            return None

        for block_uuid, metrics in values:
            self.pipeline_run.create_block_run(
                block_uuid,
                metrics=metrics,
                skip_if_exists=True,
            )
            arr.append(dict(
                block_uuid=block_uuid,
                metadata=metrics,
            ))

        return arr

    def __build_block_runs(self, block, execution_partition: str = None) -> List[Tuple]:
        upstream_blocks = []
        for upstream_block in block.upstream_blocks:
            if is_dynamic_block(upstream_block):
                upstream_blocks.append((upstream_block, False))
            elif is_dynamic_block_child(upstream_block):
                upstream_blocks.append((upstream_block, True))

        outputs = []
        for upstream_block, is_dynamic_child in upstream_blocks:
            values = None
            block_metadata = None

            if is_dynamic_child:
                values = [dict(
                    parent_index=None,
                    upstream_block_uuid=block_uuid,
                    extra_settings=dict(
                        block_uuid_prefix=block_uuid.split(':')[-1],
                        dynamic_upstream_block_uuids=[
                            block_uuid,
                        ],
                    ),
                ) for block_uuid, metrics in self.__build_block_runs(
                    upstream_block,
                    execution_partition=execution_partition,
                )]
                outputs.append((values, None))
            else:
                values, block_metadata = dynamic_block_values_and_metadata(
                    upstream_block,
                    execution_partition,
                    upstream_block.uuid,
                )

                if isinstance(values, pd.DataFrame):
                    values = values.to_dict(orient='records')

                if values:
                    outputs.append((
                        [dict(
                            parent_index=parent_index,
                            upstream_block_uuid=upstream_block.uuid,
                            extra_settings=dict(value=value),
                        ) for parent_index, value in enumerate(values)],
                        block_metadata,
                    ))

        all_data = None
        for output in outputs:
            child_data = None
            child_metadata = None

            if len(output) >= 1:
                child_data = output[0]

            if len(output) >= 2:
                child_metadata = output[1]

            metadata_len = len(child_metadata) if child_metadata else 0

            if all_data is None:
                all_data = []
                if child_data:
                    for data_dict in child_data:
                        parent_index = data_dict['parent_index']
                        upstream_block_uuid = data_dict['upstream_block_uuid']
                        extra_settings = data_dict['extra_settings']

                        metadata = None
                        if parent_index is not None and parent_index < metadata_len:
                            metadata = child_metadata[parent_index]
                        all_data.append([(
                            upstream_block_uuid,
                            parent_index,
                            metadata,
                            extra_settings,
                        )])
                else:
                    all_data.append([(None, None, None, None)])
            else:
                arr = []
                for data_arr in all_data:
                    if child_data:
                        for data_dict in child_data:
                            parent_index = data_dict['parent_index']
                            upstream_block_uuid = data_dict['upstream_block_uuid']
                            extra_settings = data_dict['extra_settings']

                            metadata = None
                            if parent_index is not None and parent_index < metadata_len:
                                metadata = child_metadata[parent_index]
                            arr.append(data_arr + [(
                                upstream_block_uuid,
                                parent_index,
                                metadata,
                                extra_settings,
                            )])
                    else:
                        arr.append(data_arr + [(None, None, None, None)])

                all_data = arr

        if all_data is None:
            return None

        block_runs_tuples = []
        for idx, child_data_list in enumerate(all_data):
            block_runs_tuples.append(self.__build_block_run(block, idx, child_data_list))

        # Add upstream blocks defined dynamically from the dynamic block’s metadata
        pipeline = block.pipeline
        for idx, child_data_list in enumerate(all_data):
            for idx2, tup in enumerate(child_data_list):
                _upstream_block_uuid, _parent_index, metadata_inner, _extra_settings = tup

                if metadata_inner and metadata_inner.get('upstream_blocks'):
                    up_uuids = []
                    for up_uuid in (metadata_inner.get('upstream_blocks') or []):
                        up_block = pipeline.get_block(up_uuid)
                        if up_block:
                            up_uuids.append(up_uuid)
                        else:
                            # The upstream block UUID is a partial UUID from the metadata that is
                            # used to customize the dynamic child block’s block_run block UUID.
                            def _find(child_data_list2, idx2=idx2, up_uuid=up_uuid):
                                _up, _pi, metadata_inner2, _es = child_data_list2[idx2]
                                if metadata_inner2 and metadata_inner2.get('block_uuid') == up_uuid:
                                    return True
                                return False

                            idx3 = find_index(_find, all_data)
                            if idx3 >= 0:
                                pair = block_runs_tuples[idx3]
                                up_uuids.append(pair[0])

                    if len(up_uuids) >= 1:
                        block_uuid, metrics = block_runs_tuples[idx]
                        if not metrics:
                            metrics = {}
                        metrics['dynamic_upstream_block_uuids'] = \
                            (metrics.get('dynamic_upstream_block_uuids') or []) + up_uuids
                        block_runs_tuples[idx] = (block_uuid, metrics)

        return block_runs_tuples

    def __build_block_run(self, block, index: int, child_data_list: List[Tuple]) -> Tuple:
        metadata = {}
        dynamic_block_indexes = None
        block_uuids = []
        upstream_blocks = []
        dynamic_upstream_block_uuids = []
        upstream_block_uuids_for_dynamic_block_uuid = []

        for tup in child_data_list:
            parent_block_uuid, parent_index, metadata_inner, extra_settings = tup

            if extra_settings:
                if extra_settings.get('dynamic_upstream_block_uuids'):
                    dynamic_upstream_block_uuids.extend(
                        extra_settings.get('dynamic_upstream_block_uuids') or [],
                    )

                block_uuid_prefix = str(parent_index) if parent_index is not None else None
                if 'block_uuid_prefix' in extra_settings:
                    block_uuid_prefix = extra_settings.get('block_uuid_prefix')

                upstream_block_uuids_for_dynamic_block_uuid.append(block_uuid_prefix)

            block_uuid_metadata = None
            if metadata_inner:
                metadata[parent_block_uuid] = metadata_inner

                if metadata_inner.get('block_uuid'):
                    block_uuid_metadata = metadata_inner['block_uuid']

            block_uuids.append(block_uuid_metadata)

            if parent_index is not None:
                if dynamic_block_indexes is None:
                    dynamic_block_indexes = {}
                dynamic_block_indexes[parent_block_uuid] = parent_index

        metadata_for_uuid = {}
        if any([uuid is not None for uuid in block_uuids]):
            metadata_for_uuid['block_uuid'] = '__'.join(
                [uuid or str(idx) for idx, uuid in enumerate(block_uuids)],
            )

        block_uuid = dynamic_block_uuid(
            block.uuid,
            metadata_for_uuid,
            index=index,
            upstream_block_uuids=upstream_block_uuids_for_dynamic_block_uuid,
        )

        metrics = dict(
            dynamic_block_index=index,
        )

        if len(metadata) >= 1:
            metrics['metadata'] = metadata

        if len(dynamic_upstream_block_uuids) >= 1:
            metrics['dynamic_upstream_block_uuids'] = dynamic_upstream_block_uuids

        if len(upstream_blocks) >= 1:
            metrics['upstream_blocks'] = upstream_blocks

        if dynamic_block_indexes:
            metrics['dynamic_block_indexes'] = dynamic_block_indexes

        if metadata:
            upstream_blocks = metadata.get('upstream_blocks') or []
            if upstream_blocks:
                metrics['upstream_blocks'].extend(upstream_blocks)

        return block_uuid, metrics
