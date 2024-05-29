from typing import List


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

    # Calculate the index with modulo to ensure it fits within child_data_count
    return (dynamic_block_index // step_size) % child_data_count
