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
    version='0.4.19',
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
    python_requires='>=3.6',
    entry_points={
        'console_scripts': [
            'mage=mage_ai.cli.main:main',
        ],
    },
    extras_require={
        'azure': [
            'azure-identity',
            'azure-keyvault-secrets',
            'azure-keyvault-certificates',
            'azure-storage-blob',
        ],
        'bigquery': ['google-cloud-bigquery==3.2.0', 'db-dtypes==1.0.2'],
        'google-cloud-storage': ['google-cloud-storage==2.5.0'],
        'hdf5': ['tables==3.7.0'],
        'postgres': ['psycopg2-binary==2.9.3'],
        'redshift': ['boto3==1.24.19', 'redshift-connector==2.0.907'],
        's3': ['botocore==1.27.19', 'boto3==1.24.19'],
        'spark': ['botocore==1.27.19', 'boto3==1.24.19'],
        'snowflake': ['snowflake-connector-python==2.7.9'],
        'all': [
            'azure-identity',
            'azure-keyvault-secrets',
            'azure-keyvault-certificates',
            'azure-storage-blob',
            'botocore==1.27.19',
            'boto3==1.24.19',
            'db-dtypes==1.0.2',
            'google-cloud-bigquery==3.2.0',
            'google-cloud-storage==2.5.0',
            'psycopg2-binary==2.9.3',
            'redshift-connector==2.0.907',
            'snowflake-connector-python==2.7.9',
        ],
    },
)
