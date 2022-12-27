from typing import List


def create_block_runs_from_dynamic_block(
    block: 'Block',
    pipeline_run: 'PipelineRun',
) -> List['BlockRun']:
    execution_partition = pipeline_run.execution_partition

    values = []
    block_metadata = []
    for idx, output_name in enumerate(block.output_variables()):
        if idx == 0:
            values = block.pipeline.variable_manager.get_variable(
                block.pipeline.uuid,
                block.uuid,
                output_name,
                partition=execution_partition,
            )
        elif idx == 1:
            block_metadata = block.pipeline.variable_manager.get_variable(
                block.pipeline.uuid,
                block.uuid,
                output_name,
                partition=execution_partition,
            )

    block_runs = []
    for downstream_block in block.downstream_blocks:
        for idx, value in enumerate(values):
            if idx < len(block_metadata):
                metadata = block_metadata[idx].copy()
            else:
                metadata = {}

            block_uuid_original = downstream_block.uuid
            metadata.update(dict(
                block_uuid_original=block_uuid_original,
                dynamic_block_index=idx,
            ))

            block_uuid_subname = metadata.get('block_uuid', idx)
            block_uuid = f"{block_uuid_original}:{block_uuid_subname}"
            block_run = pipeline_run.create_block_run(block_uuid, metrics=metadata)
            block_runs.append(block_run)

    return block_runs


def create_block_runs_from_dynamic_child(
    block: 'Block',
    pipeline_run: 'PipelineRun',
) -> List['BlockRun']:
    # descendants = get_all_descendants(block)
    pass


def get_all_ancestors(block: 'Block') -> List['Block']:
    return get_leaf_nodes(block, 'upstream_blocks', include_all_nodes=True)


def get_all_descendants(block: 'Block') -> List['Block']:
    return get_leaf_nodes(block, 'downstream_blocks', include_all_nodes=True)


def get_leaf_nodes(
    block: 'Block',
    attribute_key: str,
    condition=None,
    include_all_nodes: bool = False,
) -> List['Block']:
    leafs = []

    def _get_leaf_nodes(b: 'Block'):
        if condition is None or condition(b):
            if b is not None:
                arr = getattr(b, attribute_key)
                if len(arr) == 0 or (include_all_nodes and b != block):
                    leafs.append(b)

                for n in arr:
                    _get_leaf_nodes(n)

    _get_leaf_nodes(block)

    return leafs


def is_dynamic_block(block: 'Block') -> bool:
    return block.configuration and block.configuration.get('dynamic', False)

def should_reduce_output(block: 'Block') -> bool:
    return block.configuration and block.configuration.get('reduce_output', False)
