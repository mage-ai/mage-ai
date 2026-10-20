from logging import Logger
from typing import Dict, List

from mage_ai.extensions.great_expectations.constants import (
    EXTENSION_UUID as EXTENSION_UUID_GREAT_EXPECTATIONS,
)
from mage_ai.shared.hash import ignore_keys, index_by


def handle_run_tests(
    block,
    dynamic_block_index: int = None,
    dynamic_block_indexes: Dict = None,
    dynamic_block_uuid: str = None,
    dynamic_upstream_block_uuids: List[str] = None,
    execution_partition: str = None,
    global_vars: Dict = None,
    logger: Logger = None,
    logging_tags: Dict = None,
):
    if not block.pipeline:
        return

    extensions = block.pipeline.extensions
    if EXTENSION_UUID_GREAT_EXPECTATIONS not in extensions:
        return

    extension = extensions[EXTENSION_UUID_GREAT_EXPECTATIONS]
    blocks_by_uuid = extension.get('blocks_by_uuid', {})

    extension_blocks = []
    for extension_block in blocks_by_uuid.values():
        upstream_blocks_by_uuid = index_by(lambda x: x.uuid, extension_block.upstream_blocks)
        if block.uuid in upstream_blocks_by_uuid:
            extension_block.upstream_blocks = [block]
            extension_blocks.append(extension_block)

    for extension_block in extension_blocks:
        extension_block.execute_sync(
            dynamic_block_index=dynamic_block_index,
            dynamic_block_indexes=dynamic_block_indexes,
            dynamic_block_uuid=dynamic_block_uuid,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            execution_partition=execution_partition,
            global_vars=global_vars,
            logger=logger,
            logging_tags=logging_tags,
            update_status=False,
        )


def compare_extension(extension_a: Dict, extension_b: Dict) -> bool:
    extension_a_blocks = (extension_a or dict()).get('blocks', [])
    extension_b_blocks = (extension_b or dict()).get('blocks', [])

    extension_a_blocks = [ignore_keys(b, 'outputs') for b in extension_a_blocks]
    extension_b_blocks = [ignore_keys(b, 'outputs') for b in extension_b_blocks]
    return extension_a_blocks == extension_b_blocks
