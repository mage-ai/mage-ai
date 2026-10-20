from typing import Optional


def is_dynamic_block(block) -> bool:
    """
    Checks if the given block is a dynamic block.

    Args:
        block: The block.

    Returns:
        bool: True if the block is a dynamic block, False otherwise.
    """
    if block is None or block.configuration is None:
        return False

    if block.is_dynamic_v2:
        return block.is_dynamic_parent

    dynamic = block.configuration.get('dynamic')
    if isinstance(dynamic, bool):
        return dynamic

    return False


def should_reduce_output(block) -> bool:
    """
    Checks if the given block should reduce its output.

    Args:
        block: The block.

    Returns:
        bool: True if the block should reduce its output, False otherwise.
    """
    if block is None or block.configuration is None:
        return False

    if block.is_dynamic_v2:
        return block.should_reduce_output

    reduce_output = block.configuration.get('reduce_output')
    if isinstance(reduce_output, bool):
        return reduce_output

    return False


def has_reduce_output_from_upstreams(block) -> bool:
    return any([should_reduce_output(upstream_block) for upstream_block in block.upstream_blocks])


def has_dynamic_block_upstream_parent(block) -> bool:
    return block.upstream_blocks and any([is_dynamic_block(b) for b in block.upstream_blocks])


def is_dynamic_block_child(block, include_reduce_output: Optional[bool] = None) -> bool:
    """
    Checks if the given block is a dynamic block child.

    Args:
        block: The block.

    Returns:
        bool: True if the block is a dynamic block child, False otherwise.
    """
    if not block:
        return False

    if block.is_dynamic_v2:
        return block.is_dynamic_child

    dynamic_or_child = []

    for upstream_block in block.upstream_blocks:
        if is_dynamic_block(upstream_block) or is_dynamic_block_child(
            upstream_block, include_reduce_output=include_reduce_output
        ):
            dynamic_or_child.append(upstream_block)

    if len(dynamic_or_child) == 0:
        return False

    if include_reduce_output:
        return len(dynamic_or_child) >= 1

    dynamic_or_child_with_reduce = list(
        filter(lambda x: should_reduce_output(x), dynamic_or_child)
    )

    return len(dynamic_or_child) > len(dynamic_or_child_with_reduce)
