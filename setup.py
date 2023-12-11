import setuptools


def readme():
    with open('README.md', encoding='utf8') as f:
        README = f.read()
    return README


requirements = []
with open('requirements.txt') as f:
    for line in f.read().splitlines():
        if line.startswith('# extras'):
            break
        requirements.append(line)

setuptools.setup(
    name='mage-ai',
    # NOTE: when you change this, change the value of VERSION in the following file:
    # mage_ai/server/constants.py
    version='0.9.50',
    author='Mage',
    author_email='eng@mage.ai',
    description='Mage is a tool for building and deploying data pipelines.',
    long_description=readme(),
    long_description_content_type='text/markdown',
    url='https://github.com/mage-ai/mage-ai',
    packages=setuptools.find_packages('.'),
    include_package_data=True,
    classifiers=[
        'Programming Language :: Python :: 3',
        'License :: OSI Approved :: Apache Software License',
        'Operating System :: OS Independent',
    ],
    install_requires=requirements,
    python_requires='>=3.7',
    entry_points={
        'console_scripts': [
            'mage=mage_ai.cli.main:app',
        ],
    },
    extras_require={
        'ai': [
            'astor>=0.8.1',
            'langchain>=0.0.222',
            'openai>=0.27.8, <1.0.0',
        ],
        'azure': [
            'azure-eventhub==5.11.2',
            'azure-identity==1.12.0',
            'azure-keyvault-secrets==4.6.0',
            'azure-keyvault-certificates==4.6.0',
            'azure-mgmt-containerinstance==10.1.0',
            'azure-storage-blob==12.14.1',
        ],
        'bigquery': [
            'google-cloud-bigquery~=3.0',
            'db-dtypes==1.0.5',
        ],
        'chroma': [
            'chromadb>=0.4.17',
        ],
        'clickhouse': [
            'clickhouse-connect==0.5.20',
        ],
        'dbt': [
            'dbt-bigquery==1.4.3',
            'dbt-core==1.4.8',
            'dbt-dremio==1.5.0',
            'dbt-duckdb==1.4.2',
            'dbt-postgres==1.4.8',
            'dbt-redshift==1.4.0',
            'dbt-snowflake==1.4.4',
            'dbt-spark==1.4.3',
            'dbt-sqlserver==1.4.3',
            'dbt-trino==1.4.0',
            'dbt-clickhouse==1.4.0',
        ],
        'google-cloud-storage': [
            'google-cloud-storage==2.5.0',
            'gspread==5.7.2',
        ],
        'hdf5': ['tables==3.7.0'],
        'mysql': [
            'mysql-connector-python==8.0.31',
        ],
        'oracle': [
            'oracledb==1.3.1',
        ],
        'postgres': [
            'psycopg2==2.9.3',
            'psycopg2-binary==2.9.3',
            'sshtunnel==0.4.0',
        ],
        'redshift': [
            'boto3==1.26.60',
            'redshift-connector==2.0.909',
        ],
        's3': [
            'boto3==1.26.60',
            'botocore==1.29.60',
        ],
        'snowflake': [
            'snowflake-connector-python==3.2.1',
        ],
        'spark': [
            'boto3==1.26.60',
            'botocore==1.29.60',
        ],
        'streaming': [
            'confluent-avro',
            'influxdb_client==1.36.1',
            'kafka-python==2.0.2',
            'opensearch-py==2.0.0',
            'nats-py==2.6.0',
            'nkeys',
            'pika==1.3.1',
            'pymongo==4.3.3',
            'requests_aws4auth==1.1.2',
            'stomp.py==8.1.0',
            'elasticsearch==8.9.0',
        ],
        'all': [
            'PyGithub==1.59.0',
            'astor>=0.8.1',
            'aws-secretsmanager-caching==1.1.1.5',
            'azure-eventhub==5.11.2',
            'azure-identity==1.12.0',
            'azure-keyvault-certificates==4.6.0',
            'azure-keyvault-secrets==4.6.0',
            'azure-mgmt-containerinstance==10.1.0',
            'azure-storage-blob==12.14.1',
            'boto3==1.26.60',
            'botocore==1.29.60',
            'chromadb>=0.4.17',
            'clickhouse-connect==0.5.20',
            'confluent-avro',
            'db-dtypes==1.0.5',
            'dbt-bigquery==1.4.3',
            'dbt-core==1.4.8',
            'dbt-duckdb==1.4.2',
            'dbt-postgres==1.4.8',
            'dbt-redshift==1.4.0',
            'dbt-snowflake==1.4.4',
            'dbt-spark==1.4.3',
            'dbt-sqlserver==1.4.3',
            'dbt-trino==1.4.0',
            'dbt-clickhouse==1.4.0',
            'duckdb==0.9.1',
            'elasticsearch==8.9.0',
            'google-api-core==2.11.0',
            'google-api-python-client==2.70.0',
            'google-cloud-bigquery~=3.0',
            'google-cloud-iam==2.9.0',
            'google-cloud-pubsub==2.16.0',
            'google-cloud-run==0.5.0',
            'google-cloud-storage==2.5.0',
            'great_expectations==0.15.50',
            'gspread==5.7.2',
            'influxdb_client==1.36.1',
            'kafka-python==2.0.2',
            'kubernetes>=28.1.0',
            'langchain>=0.0.222',
            'ldap3==2.9.1',
            'nats-py==2.6.0',
            'nkeys',
            'openai>=0.27.8, <1.0.0',
            'opensearch-py==2.0.0',
            'opentelemetry-exporter-prometheus>=0.41b0',
            'opentelemetry-instrumentation-tornado>=0.41b0',
            'oracledb==1.3.1',
            'pika==1.3.1',
            'pinotdb==5.1.0',
            'prometheus_client>=0.18.0',
            'psycopg2-binary==2.9.3',
            'psycopg2==2.9.3',
            'pydruid==0.6.5',
            'pymongo==4.3.3',
            'pyodbc==4.0.35',
            'redshift-connector==2.0.909',
            'requests_aws4auth==1.1.2',
            'snowflake-connector-python==3.2.1',
            'sshtunnel==0.4.0',
            'stomp.py==8.1.0',
            'thefuzz[speedup]==0.19.0',
        ],
    },
)
