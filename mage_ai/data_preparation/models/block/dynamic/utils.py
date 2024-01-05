from dataclasses import dataclass, field
from enum import Enum
from typing import Any, List

from mage_ai.shared.array import find
from mage_ai.shared.hash import ignore_keys_with_blank_values
from mage_ai.shared.models import BaseDataClass


class DynamicBlockFlag(str, Enum):
    CLONE_OF_ORIGINAL = 'clone_of_original'
    DYANMIC_CHILD = 'dyanmic_child'
    DYNAMIC = 'dynamic'
    ORIGINAL = 'original'
    SPAWN_OF_DYNAMIC_CHILD = 'spawn_of_dynamic_child'


def is_dynamic_block(block) -> bool:
    """
    Checks if the given block is a dynamic block.

    Args:
        block: The block.

    Returns:
        bool: True if the block is a dynamic block, False otherwise.
    """
    return block.configuration and block.configuration.get('dynamic', False)


def should_reduce_output(block) -> bool:
    """
    Checks if the given block should reduce its output.

    Args:
        block: The block.

    Returns:
        bool: True if the block should reduce its output, False otherwise.
    """
    return block.configuration and block.configuration.get('reduce_output', False)


def is_dynamic_block_child(block) -> bool:
    """
    Checks if the given block is a dynamic block child.

    Args:
        block: The block.

    Returns:
        bool: True if the block is a dynamic block child, False otherwise.
    """
    dynamic_or_child = []

    for upstream_block in block.upstream_blocks:
        if is_dynamic_block(upstream_block) or is_dynamic_block_child(upstream_block):
            dynamic_or_child.append(upstream_block)

    if len(dynamic_or_child) == 0:
        return False

    dynamic_or_child_with_reduce = list(filter(lambda x: should_reduce_output(x), dynamic_or_child))

    return len(dynamic_or_child) > len(dynamic_or_child_with_reduce)


def is_dynamic_block_and_dynamic_child_block(block) -> bool:
    pass


def is_clone_of_original_dynamic_child_block(block) -> bool:
    pass


def mask_upstream_dynamic_block_and_dynamic_child_block(block, upstream_block) -> DynamicBlockFlag:
    pass


def is_spawn_of_dynamic_child_block(block) -> bool:
    pass


@dataclass
class DynamicBlockWrapperBase(BaseDataClass):
    block: Any = None
    block_run_block_uuid: str = None
    block_uuid: str = None
    children: List[BaseDataClass] = field(default_factory=lambda: [])
    clones: List[BaseDataClass] = field(default_factory=lambda: [])
    factory: Any = None
    flags: List[DynamicBlockFlag] = field(default_factory=lambda: [])
    index: int = None
    reduce_output: bool = False
    siblings: List[BaseDataClass] = field(default_factory=lambda: [])
    spawns: List[BaseDataClass] = field(default_factory=lambda: [])
    upstream_dynamic_blocks: List[BaseDataClass] = field(default_factory=lambda: [])
    upstream_dynamic_child_blocks: List[BaseDataClass] = field(default_factory=lambda: [])
    uuid: str = None

    def __post_init__(self):
        self.serialize_attribute_classes('children', BaseDataClass)
        self.serialize_attribute_classes('clones', BaseDataClass)
        self.serialize_attribute_classes('siblings', BaseDataClass)
        self.serialize_attribute_classes('spawns', BaseDataClass)
        self.serialize_attribute_classes('upstream_dynamic_blocks', BaseDataClass)
        self.serialize_attribute_classes('upstream_dynamic_child_blocks', BaseDataClass)
        self.serialize_attribute_enums('flags', DynamicBlockFlag)


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
    factory: Any = None
    flags: List[DynamicBlockFlag] = field(default_factory=lambda: [])
    index: int = None
    reduce_output: bool = False
    # Other blocks at the same level; other cloned blocks, other spawns, etc.
    siblings: List[DynamicBlockWrapperBase] = field(default_factory=lambda: [])
    # If the current block is an original dynamic child block or cloned dynamic child block,
    # then spawns are the blocks that are created based on the original or cloned upstream
    # dynamic block’s (e.g. a direct parent block) output.
    spawns: List[DynamicBlockWrapperBase] = field(default_factory=lambda: [])
    # Upstream blocks that are dynamic blocks.
    upstream_dynamic_blocks: List[DynamicBlockWrapperBase] = field(default_factory=lambda: [])
    # Upstream blocks that are dynamic child blocks.
    upstream_dynamic_child_blocks: List[DynamicBlockWrapperBase] = field(default_factory=lambda: [])
    # Unique identifier used as a suffix in the block run.
    uuid: str = None

    def __post_init__(self):
        self.serialize_attribute_classes('children', DynamicBlockWrapperBase)
        self.serialize_attribute_classes('clones', DynamicBlockWrapperBase)
        self.serialize_attribute_classes('siblings', DynamicBlockWrapperBase)
        self.serialize_attribute_classes('spawns', DynamicBlockWrapperBase)
        self.serialize_attribute_classes('upstream_dynamic_blocks', DynamicBlockWrapperBase)
        self.serialize_attribute_classes('upstream_dynamic_child_blocks', DynamicBlockWrapperBase)
        self.serialize_attribute_enums('flags', DynamicBlockFlag)

    @classmethod
    def wrap(self, factory: Any) -> 'DynamicBlockWrapper':
        model = self(factory=factory)
        model.hydrate(block_run=model.factory.block_run)
        return model

    def hydrate(self, block: Any = None, block_run: Any = None):
        if block_run:
            self.block_run_block_uuid = block_run.block_uuid
            config = block_run.metrics.get('dynamic_block') or {}

            self.flags.extend([DynamicBlockFlag(v) for v in config.get('flags') or []])

            for key in [
                'block_uuid',
                'index',
                'reduce_output',
                'uuid',
            ]:
                setattr(self, key, config.get(key))

            for key in [
                'children',
                'clones',
                'siblings',
                'spawns',
                'upstream_dynamic_blocks',
                'upstream_dynamic_child_blocks',
            ]:
                values = config.get(key)
                if not values:
                    continue

                setattr(self, key, [self.load(**m) for m in values])
        elif block:
            self.block = block
            self.block_uuid = block.uuid

            if is_dynamic_block(block):
                self.flags.append(DynamicBlockFlag.DYNAMIC)
            if is_dynamic_block_child(block):
                self.flags.append(DynamicBlockFlag.DYNAMIC_CHILD)
            self.reduce_output = should_reduce_output(block)

    def to_dict_base(self, **kwargs) -> dict:
        data = dict(
            flags=[v.value if isinstance(v, DynamicBlockFlag) else v for v in (self.flags or [])],
        )

        for key in [
            'block_run_block_uuid',
            'block_uuid',
            'index',
            'reduce_output',
            'uuid',
        ]:
            if getattr(self, key) is not None:
                data[key] = getattr(self, key)

        return ignore_keys_with_blank_values(data)

    def to_dict(self, **kwargs) -> dict:
        data = self.to_dict_base(**kwargs)

        for key in [
            'children',
            'clones',
            'siblings',
            'spawns',
            'upstream_dynamic_blocks',
            'upstream_dynamic_child_blocks',
        ]:
            if getattr(self, key):
                data[key] = [v.to_dict_base(**kwargs) for v in getattr(self, key)]

        return ignore_keys_with_blank_values(data)


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
