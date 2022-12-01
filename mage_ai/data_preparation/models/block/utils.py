from mage_ai.data_preparation.models.block import (
    Block,
    SensorBlock,
)
from mage_ai.data_preparation.models.block.dbt.utils import add_blocks_upstream_from_refs
from mage_ai.data_preparation.models.block.r import RBlock
from mage_ai.data_preparation.models.block.sql import SQLBlock
from mage_ai.data_preparation.models.constants import (
    BLOCK_LANGUAGE_TO_FILE_EXTENSION,
    BlockLanguage,
    BlockStatus,
    BlockType,
    PipelineType,
)

from mage_ai.data_preparation.models.block.integration import (
    SourceBlock,
    DestinationBlock
)
from mage_ai.data_preparation.models.widget import Widget
from mage_ai.data_preparation.templates.template import load_template
from mage_ai.shared.utils import clean_name

import os


BLOCK_TYPE_TO_CLASS = {
    BlockType.DATA_EXPORTER: Block,
    BlockType.DATA_LOADER: Block,
    BlockType.DBT: Block,
    BlockType.SCRATCHPAD: Block,
    BlockType.TRANSFORMER: Block,
    BlockType.SENSOR: SensorBlock,
}

def create_block(
    self,
    name,
    block_type,
    repo_path,
    configuration=None,
    language=None,
    pipeline=None,
    priority=None,
    upstream_block_uuids=None,
    config=None,
    widget=False,
):
    """
    1. Create a new folder for block_type if not exist
    2. Create a new python file with code template
    """
    if upstream_block_uuids is None:
        upstream_block_uuids = []
    if config is None:
        config = {}

    uuid = clean_name(name)
    language = language or BlockLanguage.PYTHON

    if BlockType.DBT != block_type or BlockLanguage.YAML == language:
        block_dir_path = os.path.join(repo_path, f'{block_type}s')
        if not os.path.exists(block_dir_path):
            os.mkdir(block_dir_path)
            with open(os.path.join(block_dir_path, '__init__.py'), 'w'):
                pass

        file_extension = BLOCK_LANGUAGE_TO_FILE_EXTENSION[language]
        file_path = os.path.join(block_dir_path, f'{uuid}.{file_extension}')
        if os.path.exists(file_path):
            if pipeline is not None and pipeline.has_block(uuid):
                raise Exception(f'Block {uuid} already exists. Please use a different name.')
        else:
            load_template(
                block_type,
                config,
                file_path,
                language=language,
                pipeline_type=pipeline.type if pipeline is not None else None,
            )

    block = block_class_from_type(block_type, pipeline=pipeline)(
        name,
        uuid,
        block_type,
        configuration=configuration,
        language=language,
        pipeline=pipeline,
    )
    __after_create_block(
        block,
        config=config,
        pipeline=pipeline,
        priority=priority,
        upstream_block_uuids=upstream_block_uuids,
        widget=widget,
    )
    return block

def __after_create_block(block, **kwargs):
    widget = kwargs.get('widget')
    pipeline = kwargs.get('pipeline')
    if pipeline is not None:
        priority = kwargs.get('priority')
        upstream_block_uuids = kwargs.get('upstream_block_uuids', [])

        if block.should_treat_as_dbt():
            arr = add_blocks_upstream_from_refs(block)
            upstream_block_uuids += [b.uuid for b in arr]

        pipeline.add_block(
            block,
            upstream_block_uuids,
            priority=priority if len(upstream_block_uuids) == 0 else None,
            widget=widget,
        )

def get_all_blocks(repo_path):
    block_uuids = dict()
    for t in BlockType:
        block_dir = os.path.join(repo_path, f'{t.value}s')
        if not os.path.exists(block_dir):
            continue
        block_uuids[t.value] = []
        for f in os.listdir(block_dir):
            if (f.endswith('.py') or f.endswith('.sql')) and f != '__init__.py':
                block_uuids[t.value].append(f.split('.')[0])
    return block_uuids

def get_block(
    name,
    uuid,
    block_type,
    configuration=None,
    content=None,
    language=None,
    pipeline=None,
    status=BlockStatus.NOT_EXECUTED,
):
    block_class = block_class_from_type(
        block_type,
        language=language,
        pipeline=pipeline,
    ) or Block
    return block_class(
        name,
        uuid,
        block_type,
        configuration=configuration,
        content=content,
        language=language,
        pipeline=pipeline,
        status=status,
    )

def block_class_from_type(block_type: str, language=None, pipeline=None) -> str:
    if block_type == BlockType.CHART:
        return Widget
    if pipeline and PipelineType.INTEGRATION == pipeline.type:
        if BlockType.DATA_LOADER == block_type:
            return SourceBlock
        elif BlockType.DATA_EXPORTER == block_type:
            return DestinationBlock
    elif BlockLanguage.SQL == language:
        return SQLBlock
    elif BlockLanguage.R == language:
        return RBlock
    return BLOCK_TYPE_TO_CLASS.get(block_type)