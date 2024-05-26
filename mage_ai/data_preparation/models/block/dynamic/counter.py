from mage_ai.data_preparation.models.interfaces import BlockInterface


def dynamic_output_item_count(block: BlockInterface) -> int:
    """
    Try the following methods to calculate the item count by starting with the
    lowest resource consumption method first.

    1. Read the original_row_count from:
        block_uuid/
            output_0/
                statistics.json
    2. Counting the number of parts within an output variable directory:
        block_uuid/
            output_0/
                0/
                    filename.extension
    3. Parquet metadata: read_metadata('source_directory')['num_rows']
        block_uuid/
            output_0/
                chunks/
                    chunk=0/
                        filename.parquet
                    filename.parquet
    4. Read the file into memory (worst case)
    """
    pass


def dynamic_child_output_item_count() -> int:
    """
    1. Similar to counting the number of parts, count the number of dynamic child block directories
        block_uuid/
            0/
                output_0/
                    filename.extension
    2. If dynamic child block reduces output, the count is 1
    """
    pass


def multi_dynamic_output_item_count() -> int:
    """
    If block is dynamic and a dynamic child,
    the count is the sum of dynamic_output_item_count() across all dynamic child blocks:
        0/
            -> [1, 2, 3]
        1/
            -> [4, 5]
        2/
            -> [6, 7, 8]
    Count: 8

    After a block completes, the statistics.json must be created, aggregated, and mapped:

    block_uuid/
        0/
            output_0/
                0/
                    data.parquet
                    statistics.json
                1/
            output_1/
        1/
            output_0/
                data.json
                statistics.json
    """
    pass
