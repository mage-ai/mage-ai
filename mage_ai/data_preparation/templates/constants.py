from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.shared.hash import index_by

GROUP_DATABASES = 'Databases'
GROUP_DATA_LAKES = 'Data lakes'
GROUP_DATA_WAREHOUSES = 'Data warehouses'
GROUP_DELTA_LAKE = 'Delta Lake'
GROUP_ORCHESTRATION = 'Orchestration'
GROUP_DATABASES_NO_SQL = 'Databases (NoSQL)'

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
        block_type=BlockType.DATA_LOADER,
        description='Load data from MongoDB.',
        groups=[GROUP_DATABASES_NO_SQL],
        language=BlockLanguage.PYTHON,
        name='MongoDB',
        path='data_loaders/mongodb.py',
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
    dict(
        block_type=BlockType.DATA_EXPORTER,
        description='Export data to MongoDB.',
        language=BlockLanguage.PYTHON,
        name='MongoDB',
        path='data_exporters/mongodb.py',
    ),
    dict(
        block_type=BlockType.DATA_LOADER,
        description='Trigger another pipeline to run.',
        groups=[GROUP_ORCHESTRATION],
        language=BlockLanguage.PYTHON,
        name='Trigger pipeline',
        path='data_loaders/orchestration/triggers/default.jinja',
    ),
    dict(
        block_type=BlockType.DATA_EXPORTER,
        description='Trigger another pipeline to run.',
        groups=[GROUP_ORCHESTRATION],
        language=BlockLanguage.PYTHON,
        name='Trigger pipeline',
        path='data_exporters/orchestration/triggers/default.jinja',
    ),
    dict(
        block_type=BlockType.CALLBACK,
        description='Base template with empty functions.',
        language=BlockLanguage.PYTHON,
        name='Base template',
        path='callbacks/base.jinja',
    ),
    dict(
        block_type=BlockType.CALLBACK,
        description='Trigger another pipeline to run.',
        groups=[GROUP_ORCHESTRATION],
        language=BlockLanguage.PYTHON,
        name='Trigger pipeline',
        path='callbacks/orchestration/triggers/default.jinja',
    ),
    dict(
        block_type=BlockType.CONDITIONAL,
        description='Base template with empty functions.',
        language=BlockLanguage.PYTHON,
        name='Base template',
        path='conditionals/base.jinja',
    ),
]

TEMPLATES_ONLY_FOR_V2 = [
    # Data loaders
    #   Data lakes
    dict(
        block_type=BlockType.DATA_LOADER,
        groups=[GROUP_DATA_LAKES],
        language=BlockLanguage.PYTHON,
        name='Amazon S3',
        path='data_loaders/s3.py',
    ),
    dict(
        block_type=BlockType.DATA_LOADER,
        groups=[GROUP_DATA_LAKES],
        language=BlockLanguage.PYTHON,
        name='Azure Blob Storage',
        path='data_loaders/azure_blob_storage.py',
    ),
    dict(
        block_type=BlockType.DATA_LOADER,
        groups=[GROUP_DATA_LAKES],
        language=BlockLanguage.PYTHON,
        name='Google Cloud Storage',
        path='data_loaders/google_cloud_storage.py',
    ),
    #   Data warehouses
    dict(
        block_type=BlockType.DATA_LOADER,
        groups=[GROUP_DATA_WAREHOUSES],
        language=BlockLanguage.PYTHON,
        name='Amazon Redshift',
        path='data_loaders/redshift.py',
    ),
    dict(
        block_type=BlockType.DATA_LOADER,
        description='Load data from Google BigQuery.',
        groups=[GROUP_DATA_WAREHOUSES],
        language=BlockLanguage.PYTHON,
        name='Google BigQuery',
        path='data_loaders/bigquery.py',
    ),
    dict(
        block_type=BlockType.DATA_LOADER,
        groups=[GROUP_DATA_WAREHOUSES],
        language=BlockLanguage.PYTHON,
        name='Snowflake',
        path='data_loaders/snowflake.py',
    ),
    #   Databases
    dict(
        block_type=BlockType.DATA_LOADER,
        groups=[GROUP_DATABASES],
        language=BlockLanguage.PYTHON,
        name='MySQL',
        path='data_loaders/mysql.py',
    ),
    dict(
        block_type=BlockType.DATA_LOADER,
        groups=[GROUP_DATABASES],
        language=BlockLanguage.PYTHON,
        name='Oracle DB',
        path='data_loaders/oracledb.py',
    ),
    dict(
        block_type=BlockType.DATA_LOADER,
        groups=[GROUP_DATABASES],
        language=BlockLanguage.PYTHON,
        name='PostgreSQL',
        path='data_loaders/postgres.py',
    ),
    dict(
        block_type=BlockType.DATA_LOADER,
        description='Fetch data from an API request.',
        language=BlockLanguage.PYTHON,
        name='API',
        path='data_loaders/api.py',
    ),
    dict(
        block_type=BlockType.DATA_LOADER,
        description='Load data from a file on your machine.',
        language=BlockLanguage.PYTHON,
        name='Local file',
        path='data_loaders/file.py',
    ),
    dict(
        block_type=BlockType.DATA_LOADER,
        language=BlockLanguage.PYTHON,
        name='Druid',
        path='data_loaders/druid.py',
    ),
    # Data exporters
    dict(
        block_type=BlockType.DATA_EXPORTER,
        language=BlockLanguage.PYTHON,
        name='Local file',
        path='data_exporters/file.py',
    ),
    #   Data lakes
    dict(
        block_type=BlockType.DATA_EXPORTER,
        groups=[GROUP_DATA_LAKES],
        language=BlockLanguage.PYTHON,
        name='Amazon S3',
        path='data_exporters/s3.py',
    ),
    dict(
        block_type=BlockType.DATA_EXPORTER,
        groups=[GROUP_DATA_LAKES],
        language=BlockLanguage.PYTHON,
        name='Azure Blob Storage',
        path='data_exporters/azure_blob_storage.py',
    ),
    dict(
        block_type=BlockType.DATA_EXPORTER,
        groups=[GROUP_DATA_LAKES],
        language=BlockLanguage.PYTHON,
        name='Google Cloud Storage',
        path='data_exporters/google_cloud_storage.py',
    ),
    #   Data warehouses
    dict(
        block_type=BlockType.DATA_EXPORTER,
        groups=[GROUP_DATA_WAREHOUSES],
        language=BlockLanguage.PYTHON,
        name='Amazon Redshift',
        path='data_exporters/redshift.py',
    ),
    dict(
        block_type=BlockType.DATA_EXPORTER,
        description='Load data from Google BigQuery.',
        groups=[GROUP_DATA_WAREHOUSES],
        language=BlockLanguage.PYTHON,
        name='Google BigQuery',
        path='data_exporters/bigquery.py',
    ),
    dict(
        block_type=BlockType.DATA_EXPORTER,
        groups=[GROUP_DATA_WAREHOUSES],
        language=BlockLanguage.PYTHON,
        name='Snowflake',
        path='data_exporters/snowflake.py',
    ),
    #   Databases
    dict(
        block_type=BlockType.DATA_EXPORTER,
        groups=[GROUP_DATABASES],
        language=BlockLanguage.PYTHON,
        name='MySQL',
        path='data_exporters/mysql.py',
    ),
    dict(
        block_type=BlockType.DATA_EXPORTER,
        groups=[GROUP_DATABASES],
        language=BlockLanguage.PYTHON,
        name='PostgreSQL',
        path='data_exporters/postgres.py',
    ),
]

TEMPLATES_BY_UUID = index_by(lambda x: x['name'], TEMPLATES + TEMPLATES_ONLY_FOR_V2)
