from typing import Dict, List, Tuple

import pandas as pd

from mage_ai.data_preparation.models.block.dynamic.utils import (
    DynamicBlockWrapper,
    MetadataInstructions,
)
from mage_ai.data_preparation.models.block.utils import (
    build_dynamic_block_uuid,
    dynamic_block_values_and_metadata,
)
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.orchestration.db.models.schedules import BlockRun
from mage_ai.shared.array import find, find_index
from mage_ai.shared.custom_logger import DX_PRINTER
from mage_ai.shared.environments import is_test


class DynamicChildBlockFactory:
    def __init__(
        self,
        block,
        pipeline_run=None,
        block_run_id: int = None,
        block_run: BlockRun = None,
        block_runs: List = None,
        **kwargs,
    ):
        self.block = block
        self.block_run_id = block_run_id
        self.type = BlockType.DYNAMIC_CHILD

        self._block_run = block_run
        self._block_runs = block_runs
        self._block_runs_fetched = True if self._block_runs else False
        self._pipeline_run = pipeline_run
        self._wrapper = None

    def __getattr__(self, name):
        val = getattr(self.block, name)

        def _missing(val=val, *args, **kwargs):
            return val(*args, **kwargs)

        if callable(val):
            return _missing

        return val

    def block_run(self) -> BlockRun:
        if self._block_run:
            return self._block_run

        if self._block_runs:
            self._block_run = find(
                lambda br, factory=self: (
                    factory.block_run_id and br.id == factory.block_run_id
                ) or (br.block_uuid == factory.block.uuid),
                self._block_runs,
            )
            DX_PRINTER.debug(
                f'Block run: for block {self.block.uuid}: '
                f'{self._block_run.id if self._block_run else ""} '
                f'{self._block_run.block_uuid if self._block_run else ""}'
            )

        if not self._block_run:
            try:
                self._block_run = BlockRun.query.get(self.block_run_id)
            except AttributeError as err:
                if not is_test():
                    raise err
                print(err)

        return self._block_run

    def set_pipeline_run(self, pipeline_run):
        self._pipeline_run = pipeline_run

    def pipeline_run(self):
        if self._pipeline_run:
            return self._pipeline_run

        block_run = self.block_run()
        if block_run:
            self._pipeline_run = block_run.pipeline_run

        return self._pipeline_run

    def block_runs(self) -> List[BlockRun]:
        if self._block_runs or self._block_runs_fetched:
            return self._block_runs

        block_run = self.block_run()
        if block_run:
            self._block_runs = BlockRun.query.filter(
                BlockRun.pipeline_run_id == block_run.pipeline_run_id,
            ).all()
            self._block_runs_fetched = True

        return self._block_runs

    def block_run_metadata(self) -> Dict:
        block_run = self.block_run()
        if block_run:
            return block_run.metrics

    def wrapper(self) -> DynamicBlockWrapper:
        if self._wrapper:
            return self._wrapper

        self._wrapper = DynamicBlockWrapper(factory=self)

        return self._wrapper

    def execute_sync(
        self,
        execution_partition: str = None,
        **kwargs,
    ) -> List[Dict]:
        """
        When a pipeline run is created and it begins to create its block runs,
        we can statically detect which blocks have at least 1 upstream block that is both
        a dynamic block and a dynamic child block (nickname dynamic squared).

        If there exists a block with an upstream block that is dynamic squared (nickname),
        that means we’ll eventually have to generate N clones of the original dynamic child
        block.

        Original dynamic child blocks (the one below) are responsible for spawning dynamic
        child block runs generated from the output data of an upstream dynamic block.

        We cannot create those block runs statically because the output from the upstream
        dynamic squared block hasn’t been created yet.

        When the original (non-cloned version) of the dynamic child block with an upstream
        dynamic squared block executes (logic is contained in the DynamicChildBlockFactory
        class), instead of generating purely dynamic child block runs, it’ll create
        clones of the original block (itself).

        Those clones of the original will then depend on each individual spawn of the
        upstream dynamic squared block. Once a spawn finishes running, the output from
        that spawn will be used by the clone of the original to dynamically create
        block runs.

        When the original (non-cloned) dynamic child block executes, perform these 2 special checks:
        1. Are there any upstream blocks that are dynamic and dynamic child (dynamic squared)
        2. If yes, does that upstream block reduce output

        If the upstream block doesn’t reduce output, then do the following:
        1. Get the number of spawns from the upstream block
        2. Create N block runs that is a clone of its original self, for every spawn
        3. Set block run’s metadata/metrics to have an upstream dependency on that spawn.

        If the upstream block reduces output, then use the logic already defined below to:
        1. Get the number of spawns from the upstream block
        2. Create a block run for a clone of its original self
        3. That block run’s metadata/metrics will include all the block run block UUIDs of all the
        spawns as an upstream dependency.
        """
        DX_PRINTER.label = 'DynamicChildBlockFactory'
        DX_PRINTER.info(
            'execute_sync',
            block=self.block,
            dynamic_block=self.wrapper().to_dict(),
        )

        arr = []
        values = self.__build_block_runs(self.wrapper(), execution_partition=execution_partition)
        if not values:
            DX_PRINTER.error('No block runs to create from values', block=self.block)
            return None

        DX_PRINTER.info(
            f'Blocks runs to create: {len(values)}',
            block=self.block,
            uuids=[tup[0] for tup in values],
        )

        pipeline_run = self.pipeline_run()
        for block_uuid, metrics in values:
            pipeline_run.create_block_run(
                block_uuid,
                metrics=metrics,
                skip_if_exists=True,
            )
            arr.append(dict(
                block_uuid=block_uuid,
                metadata=metrics,
            ))

        return arr

    def upstream_blocks_wrapped(self) -> List[DynamicBlockWrapper]:
        block_runs = self.block_runs() or []
        metadata = self.block_run_metadata() or {}

        upstream_blocks_mapping = {}

        dynamic_upstream_block_uuids = (metadata or {}).get('dynamic_upstream_block_uuids') or []
        for upstream_block_uuid in dynamic_upstream_block_uuids:
            block_original = self.block.pipeline.get_block(upstream_block_uuid)
            if block_original:
                upstream_blocks_mapping[block_original.uuid] = DynamicBlockWrapper(
                    factory=DynamicChildBlockFactory(
                        block_original,
                        block_run=find(
                            lambda br, uuid=upstream_block_uuid: br.block_uuid == uuid,
                            block_runs,
                        ),
                        block_runs=block_runs,
                    ),
                )

        for upstream_block in self.block.upstream_blocks:
            if upstream_block.uuid in upstream_blocks_mapping:
                continue

            upstream_blocks_mapping[upstream_block.uuid] = DynamicBlockWrapper(
                factory=DynamicChildBlockFactory(
                    upstream_block,
                    block_run=find(
                        lambda br, uuid=upstream_block.uuid: br.block_uuid == uuid,
                        block_runs,
                    ),
                    block_runs=block_runs,
                ),
            )

        return list(upstream_blocks_mapping.values())

    def __build_block_runs(
        self,
        wrapper: DynamicBlockWrapper,
        execution_partition: str = None,
    ) -> List[Tuple]:
        """
        Check to see if this block is a clone of the original block.
        A clone will act as an original block (e.g. controller that create block runs
        for itself) but its upstream is associated to a dynamic child’s spawns (a spawn is
        a block run that was created  for a dynamic child by the dynamic child block itself.)

        When an original clone block calculates how many block runs it should spawn,
        it must treat any upstream dynamic + dynamic child (e.g. D2) blocks simply as a
        dynamic block.
        """

        upstream_wrappers = []
        for upstream_wrapper in wrapper.factory.upstream_blocks_wrapped():
            """
            This order is very important!
            Is the upstream block is both dynamic and a dynamic child,
            it needs to act like a dynamic child first so that it spawns 1 block run
            for each of its downstream blocks.
            Then, when this upstream block’s block runs are completed, those blocks
            will act as a dynamic block and create N block runs for its downstream.

            For example, A -> B -> C
            A: dynamic block
            B: dynamic block, dynamic child
            C: dynamic child

            A: creates 3 B
            B: 3 block runs, each create 3 C
            C: 9 block runs in total

            The current block needs to spawn 3 block runs that act as original blocks
            so that when its upstream block (that is  both dynamic & dynamic child)
            is completed, the 3 "original blocks" will run through this process and
            dynamically create block runs based on the upstream block’s output.
            """

            upstream_is_dynamic = upstream_wrapper.is_dynamic()
            upstream_is_dynamic_child = upstream_wrapper.is_dynamic_child()

            if wrapper.is_clone_of_original() and upstream_is_dynamic:
                """
                If this is the clone of the original and the upstream block is at least a
                dynamic block, handle the block run creation process as usual.

                Treat this process as if its generating block runs from an upstream
                dynamic block.

                However, to determine how many children to create from that dynamic block,
                we must fetch the output data of a specific spawn because the output data
                can vary depending on which spawn it is.

                How do we know which dynamic child spawn block this is assigned to?
                """
                upstream_wrappers.append((upstream_wrapper, False))
            elif wrapper.is_original() and upstream_is_dynamic and upstream_is_dynamic_child:
                """
                If this is the original (non-cloned) dynamic child block and
                the upstream block is dynamic squared, then create N clones of original.
                Treat this process as if its generating block runs from an upstream
                dynamic child block. The difference will be after the block run metadata
                is generated.
                Before creating the block run record in the database, we must hydrate the
                block run’s metadata/metrics with data that will allow the clones to
                recognize itself as a clone of the original.
                """
                upstream_wrappers.append((upstream_wrapper, True))

                wrapper.metadata_instructions = MetadataInstructions(
                    clone_original=True,
                    original=wrapper,
                    upstream=upstream_wrapper,
                )
            elif upstream_is_dynamic:
                upstream_wrappers.append((upstream_wrapper, False))
            elif upstream_is_dynamic_child:
                upstream_wrappers.append((upstream_wrapper, True))

            DX_PRINTER.info(
                f'Upstream block: {upstream_wrapper.uuid}',
                block=wrapper.block,
                upstream_is_dynamic=upstream_is_dynamic,
                upstream_is_dynamic_child=upstream_is_dynamic_child,
            )

        DX_PRINTER.info(
            f'Upstream blocks: {len(upstream_wrappers)}',
            block=wrapper.block,
            uuids=[f'{tup[0].uuid}: {tup[1]}' for tup in upstream_wrappers],
        )

        outputs = []
        for upstream_parent_index, pair in enumerate(upstream_wrappers):
            upstream_wrapper, is_dynamic_child = pair

            values = None
            block_metadata = None

            if is_dynamic_child:
                DX_PRINTER.debug(
                    f'Getting block runs for upstream dynamic child: {upstream_wrapper.uuid}',
                    block=wrapper.block,
                    upstream_block=upstream_wrapper.uuid,
                )

                # If the upstream block is also a dynamic block, dynamic block behavior
                # takes precedence. Every child block of the upstream block will act as a
                # separate dynamic block that create dynamic children. We must use the index
                # of that dynamic block which is a single number to differentiate between
                # this current block having multiple upstream dynamic blocks.
                parent_index_for_child_block = None
                if upstream_wrapper.is_dynamic():
                    parent_index_for_child_block = upstream_parent_index

                values_pairs = self.__build_block_runs(
                    upstream_wrapper,
                    execution_partition=execution_partition,
                )

                DX_PRINTER.debug(
                    f'Block runs built for upstream dynamic child {upstream_wrapper.uuid}: '
                    f'{len(values_pairs)}',
                    block=wrapper.block,
                    upstream_block=upstream_wrapper.uuid,
                )

                values = []

                if isinstance(values_pairs, dict):
                    values_pairs = list(values_pairs.items())

                for upstream_block_uuid, _metrics in values_pairs:
                    values.append(dict(
                        parent_index=parent_index_for_child_block,
                        upstream_block_uuid=upstream_block_uuid,
                        extra_settings=dict(
                            block_uuid_prefix=upstream_block_uuid.split(':')[-1],
                            dynamic_upstream_block_uuids=[
                                upstream_block_uuid,
                            ],
                        ),
                    ))

                    DX_PRINTER.critical(
                        'Adding outputs from upstream dynamic child block',
                        block=wrapper.block,
                        parent_index=parent_index_for_child_block,
                        upstream_block_uuid=upstream_block_uuid,
                        extra_settings=dict(
                            block_uuid_prefix=upstream_block_uuid.split(':')[-1],
                            dynamic_upstream_block_uuids=[
                                upstream_block_uuid,
                            ],
                        ),
                    )

                DX_PRINTER.debug(
                    f'Values from upstream dynamic child: {len(values)}',
                    block=wrapper.block,
                    upstream_block=upstream_wrapper.uuid,
                )

                outputs.append((values, None))
            else:
                dynamic_block_index_from_parent = wrapper.get_dynamic_block_index_from_parent(
                    upstream_wrapper.uuid,
                )
                # Validate that the output of this function returns the correct output
                # for dynamic squared blocks (aka dynamic + dynamic child).
                values, block_metadata = dynamic_block_values_and_metadata(
                    upstream_wrapper.block,
                    block_uuid=wrapper.get_parent_block_uuid_for_output_variables(
                        upstream_wrapper.block,
                        upstream_wrapper.uuid,
                    ),
                    dynamic_block_index=dynamic_block_index_from_parent,
                    execution_partition=execution_partition,
                )

                DX_PRINTER.critical(
                    'dynamic_block_values_and_metadata',
                    block=wrapper.block,
                    block_uuid=wrapper.get_parent_block_uuid_for_output_variables(
                        upstream_wrapper.block,
                        upstream_wrapper.uuid,
                    ),
                    dynamic_block_index=dynamic_block_index_from_parent,
                    upstream_block=upstream_wrapper.block.uuid,
                    upstream_block_uuid=upstream_wrapper.uuid,
                    values=values,
                    __uuid='dynamic_block_values_and_metadata',
                )

                if isinstance(values, pd.DataFrame):
                    values = values.to_dict(orient='records')

                if values:
                    dynamic_upstream_block_uuids = None

                    # If these child blocks are being created by its clone of
                    # original dynamic child block, then we need to use the parent index of the
                    # spawn of the upstream dynamic squared block.
                    if wrapper.is_clone_of_original():
                        dynamic_upstream_block_uuids = [
                            upstream_wrapper.uuid,
                        ]
                        upstream_parent_index = wrapper.get_dynamic_block_index()

                        DX_PRINTER.critical(
                            'dynamic_upstream_index from current upstream is '
                            f'{upstream_wrapper.get_dynamic_block_index()}',
                        )

                    child_data = []
                    for parent_index, value in enumerate(values):
                        extra_settings = dict(
                            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                            index=parent_index,
                            value=value,
                        )

                        if dynamic_block_index_from_parent is not None:
                            extra_settings['block_uuid_prefix'] = dynamic_block_index_from_parent

                        child_data.append(dict(
                            parent_index=upstream_parent_index,
                            upstream_block_uuid=upstream_wrapper.uuid,
                            extra_settings=extra_settings,
                        ))

                        DX_PRINTER.critical(
                            'Adding outputs from upstream dynamic block',
                            block=wrapper.block,
                            upstream_block=upstream_wrapper.block.uuid,
                            upstream_block_uuid=upstream_wrapper.uuid,
                            parent_index=upstream_parent_index,
                            block_metadata=block_metadata,
                        )

                    outputs.append((
                        child_data,
                        block_metadata,
                    ))

        DX_PRINTER.info(f'Outputs: {len(outputs)}', block=wrapper.block)
        if len(outputs) == 0:
            DX_PRINTER.critical('No outputs', block=wrapper.block)

        all_data = None
        for output in outputs:
            child_data = None
            child_metadata = None

            if len(output) >= 1:
                # list of values from 1 parent
                child_data = output[0]

            if len(output) >= 2:
                # list of metadata from 1 parent
                child_metadata = output[1]

            metadata_len = len(child_metadata) if child_metadata else 0

            if all_data is None:
                all_data = []
                if child_data:
                    for index_within_same_parent, data_dict in enumerate(child_data):
                        parent_index = data_dict['parent_index']
                        upstream_block_uuid = data_dict['upstream_block_uuid']
                        extra_settings = data_dict['extra_settings']

                        metadata = None

                        if index_within_same_parent is not None and \
                                index_within_same_parent < metadata_len:

                            metadata = child_metadata[index_within_same_parent]

                        all_data.append([(
                            upstream_block_uuid,
                            parent_index,
                            metadata,
                            extra_settings,
                        )])

                        DX_PRINTER.critical(
                            'Looping over all data',
                            upstream_block_uuid=upstream_block_uuid,
                            parent_index=parent_index,
                            metadata=metadata,
                            extra_settings=extra_settings,
                        )
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

                            DX_PRINTER.critical(
                                'Looping over all data',
                                upstream_block_uuid=upstream_block_uuid,
                                parent_index=parent_index,
                                metadata=metadata,
                                extra_settings=extra_settings,
                            )
                    else:
                        arr.append(data_arr + [(None, None, None, None)])

                all_data = arr

        block_runs_tuples = []

        if all_data is None:
            return block_runs_tuples

        for idx, child_data_list in enumerate(all_data):
            block_runs_tuples.append(self.__build_block_run(
                wrapper,
                idx,
                child_data_list,
            ))

        # Add upstream blocks defined dynamically from the dynamic block’s metadata
        pipeline = wrapper.block.pipeline
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

    def __build_block_run(
        self,
        wrapper: DynamicBlockWrapper,
        index: int,
        child_data_list: List[Tuple],
    ) -> Tuple:
        metadata = {}
        dynamic_block_indexes = None
        block_uuids = []
        upstream_blocks = []
        dynamic_upstream_block_uuids = []
        upstream_block_uuids_for_dynamic_block_uuid = []
        parent_indexes = []

        for tup in child_data_list:
            parent_block_uuid, parent_index, metadata_inner, extra_settings = tup

            if extra_settings:
                if extra_settings.get('dynamic_upstream_block_uuids'):
                    dynamic_upstream_block_uuids.extend(
                        extra_settings.get('dynamic_upstream_block_uuids') or [],
                    )

                # Don’t include this in the naming constructor if the block creating this child or
                # spawn is from itself.
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
                parent_indexes.append(parent_index)

        metadata_for_uuid = {}
        if any([uuid is not None for uuid in block_uuids]):
            metadata_for_uuid['block_uuid'] = '__'.join(
                [uuid or str(idx) for idx, uuid in enumerate(block_uuids)],
            )

        # The parent_indexes are a list representation of dynamic_block_indexes.
        # dynamic_block_indexes is used to determine what folder to retrieve the output
        # variables from when fetching input data from an upstream dynamic or dynamic child block.
        # We need parent_indexes to create a unique combination of values when constructing
        # the block run block UUID.
        if parent_indexes and \
                len(parent_indexes) >= len(upstream_block_uuids_for_dynamic_block_uuid):

            upstream_block_uuids_for_dynamic_block_uuid = parent_indexes

        base_block_uuid = wrapper.block_uuid
        block_uuid = build_dynamic_block_uuid(
            base_block_uuid,
            metadata_for_uuid,
            index=index,
            upstream_block_uuids=upstream_block_uuids_for_dynamic_block_uuid,
        )

        DX_PRINTER.critical(
            'Dynamic block UUID',
            block=wrapper.block,
            block_uuid=block_uuid,
            index=index,
            metadata_for_uuid=metadata_for_uuid,
            upstream_block_uuids=upstream_block_uuids_for_dynamic_block_uuid,
            wrapper_block_uuid=wrapper.block_uuid,
            wrapper_uuid=wrapper.uuid,
        )

        clone_original = \
            wrapper.metadata_instructions and wrapper.metadata_instructions.clone_original
        if clone_original:
            metadata.update(wrapper.to_dict(use_metadata_instructions=True))
            block_uuid = ':'.join([
                base_block_uuid,
                'clone',
            ] + block_uuid.split(':')[2:])

            DX_PRINTER.critical(
                'Dynamic block UUID clone of original',
                block=wrapper.block,
                block_uuid=block_uuid,
                index=index,
                metadata_for_uuid=metadata_for_uuid,
                upstream_block_uuids=upstream_block_uuids_for_dynamic_block_uuid,
                wrapper_block_uuid=wrapper.block_uuid,
                wrapper_uuid=wrapper.uuid,
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
