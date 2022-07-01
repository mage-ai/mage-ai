import os
import shutil
from typing import Union
from mage_ai.data_preparation.models.block import BlockType
from mage_ai.data_loader.base import DataSource


def copy_templates(template_path: str, dest_path: str) -> None:
    template_path = os.path.join(
        os.path.dirname(__file__),
        template_path,
    )
    if not os.path.exists(template_path):
        raise IOError(f'Could not find templates for {template_path}.')
    shutil.copytree(template_path, dest_path)


def fetch_template_path(block_type: Union[BlockType, str], block_name: str) -> os.PathLike:
    if block_type == BlockType.DATA_LOADER:
        return __fetch_data_loader_templates(block_name)
    elif block_type == BlockType.TRANSFORMER:
        return __fetch_transformer_templates(block_name)
    elif block_type == BlockType.DATA_EXPORTER:
        return __fetch_data_exporter_templates(block_name)
    elif block_type != BlockType.SCRATCHPAD:
        raise ValueError(f'Invalid block type defined: {block_type}')


def __fetch_data_loader_templates(block_name: str):
    has_gcp_creds = os.environ().get('GOOGLE_APPLICATION_CREDENTIALS') is not None
    has_aws_creds = os.access('~/.aws/credentials', os.F_OK) and os.access('~/.aws/config', os.F_OK)
    recognized_source = None

    lowercase_block_name = block_name.lower()
    for source in DataSource:
        if source in lowercase_block_name:
            recognized_source = source
            break

    if has_gcp_creds and not has_aws_creds:
        return 'data_loaders/bigquery.py'
    elif not has_gcp_creds and has_aws_creds:
        if recognized_source == 'redshift':
            return 'data_loaders/redshift.py'
        elif recognized_source == 's3':
            return 'data_loaders/s3.py'

    return 'data_loaders/default.py'


def __fetch_transformer_templates(block_name: str):
    return 'transformers/default.py'


def __fetch_data_exporter_templates(block_name: str):
    return
