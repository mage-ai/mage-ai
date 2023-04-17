from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.shared.hash import index_by

GROUP_DELTA_LAKE = 'Delta Lake'

TEMPLATES = [
    dict(
        block_type=BlockType.DATA_LOADER,
        description='Load a Delta Table from Amazon S3.',
        groups=[GROUP_DELTA_LAKE],
        language=BlockLanguage.PYTHON,
        name='Amazon S3',
        path='data_loaders/deltalake/s3.py',
    ),
    dict(
        block_type=BlockType.DATA_LOADER,
        description='Load a Delta Table from Azure Blob Storage.',
        groups=[GROUP_DELTA_LAKE],
        language=BlockLanguage.PYTHON,
        name='Azure Blob Storage',
        path='data_loaders/deltalake/azure_blob_storage.py',
    ),
    dict(
        block_type=BlockType.DATA_LOADER,
        description='Load a Delta Table from Google Cloud Storage.',
        groups=[GROUP_DELTA_LAKE],
        language=BlockLanguage.PYTHON,
        name='Google Cloud Storage',
        path='data_loaders/deltalake/gcs.py',
    ),
    dict(
        block_type=BlockType.DATA_EXPORTER,
        description='Export data to a Delta Table in Amazon S3.',
        groups=[GROUP_DELTA_LAKE],
        language=BlockLanguage.PYTHON,
        name='Amazon S3',
        path='data_exporters/deltalake/s3.py',
    ),
    dict(
        block_type=BlockType.DATA_EXPORTER,
        description='Export data to a Delta Table in Azure Blob Storage.',
        groups=[GROUP_DELTA_LAKE],
        language=BlockLanguage.PYTHON,
        name='Azure Blob Storage',
        path='data_exporters/deltalake/azure_blob_storage.py',
    ),
    dict(
        block_type=BlockType.DATA_EXPORTER,
        description='Export data to a Delta Table in Google Cloud Storage.',
        groups=[GROUP_DELTA_LAKE],
        language=BlockLanguage.PYTHON,
        name='Google Cloud Storage',
        path='data_exporters/deltalake/gcs.py',
    ),
]

TEMPLATES_BY_UUID = index_by(lambda x: x['name'], TEMPLATES)
