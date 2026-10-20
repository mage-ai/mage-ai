from typing import List

from mage_ai.shared.environments import is_debug, is_test


def calculate_dynamic_index_data_index(
    dynamic_block_index: int,
    upstream_index: int,
    child_data_count: int,
    item_counts: List[int],
):
    # The step size for each upstream index
    step_size = 1
    for i in range(upstream_index + 1, len(item_counts)):
        step_size *= item_counts[i]

        if is_debug() or is_test():
            print(
                '[calculate_dynamic_index_data_index] '
                f'dynamic_block_index: {dynamic_block_index}, '
                f'upstream_index: {upstream_index}, '
                f'child_data_count: {child_data_count}, '
                f'item_counts: {item_counts}, '
                f'i: {i}, '
                f'step_size: {step_size}'
            )

    if step_size == 0:
        return None

    if is_debug() or is_test():
        print(
            '[calculate_dynamic_index_data_index] '
            f'dynamic_block_index: {dynamic_block_index}, '
            f'upstream_index: {upstream_index}, '
            f'child_data_count: {child_data_count}, '
            f'item_counts: {item_counts}, '
            f'step_size: {step_size}'
        )

    # Calculate the index with modulo to ensure it fits within child_data_countg ci
    return (dynamic_block_index // step_size) % child_data_count
