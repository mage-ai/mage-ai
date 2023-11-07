from logging import Logger
from typing import Dict

from mage_ai.extensions.great_expectations.constants import (
    EXTENSION_UUID as EXTENSION_UUID_GREAT_EXPECTATIONS,
)
from mage_ai.shared.hash import index_by


def handle_run_tests(
    block,
    dynamic_block_uuid: str = None,
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
            dynamic_block_uuid=dynamic_block_uuid,
            execution_partition=execution_partition,
            global_vars=global_vars,
            logger=logger,
            logging_tags=logging_tags,
        )
