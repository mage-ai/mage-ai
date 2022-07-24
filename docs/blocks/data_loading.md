# Table of Contents

-   [Data Loading Overview](#data-loading-overview)
-   [Client APIs](#client-apis)
    -   [FileIO](#fileio)
    -   [BigQuery](#bigquery)
    -   [PostgreSQL](#postgresql)
    -   [Redshift](#redshift)
    -   [S3](#s3)
    -   [Snowflake](#snowflake)
-   [Configuration Settings](#configuration-settings)

# Data Loading Overview

Mage provides data loading clients to load and export data from local and external sources, integrating directly into your pipelines so you can spend more time focusing on analyzing and transforming your data for ML tasks.

Every data loader client includes the following functions:

-   `load` - loads data from the requested source into a Pandas DataFrame for current use
-   `export` - exports data in your pipeline to the requested source

The following examples will examine how data loading clients use these functions to import and export your data.

## Example: Loading data from a file

While traditional Pandas IO procedures can be utilized to load files into your pipeline, Mage provides the `mage_ai.io.file.FileIO` client as a convenience wrapper. The following code uses the `load` function of the `FileIO` client to load the Titanic survival dataset from a CSV file into a Pandas DataFrame for use in your pipeline. All data loaders can be initialized with the `verbose = True` parameter to enable verbose output printing the current action the data loading client is performing. This parameter defaults to `False`.

```python
loader = FileIO(verbose=True)
df = loader.load(
    'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv'
)
```

Then the `export` function is used to save this data frame back to file, this time in JSON format

```python
loader.export(df, './titanic_survival.json', orient='records')
```

Any formatting settings (such as specifying the JSON orient) can be passed as keyword arguments to `load` and `export`. These arguments are passed to Pandas IO procedures for the requested file format, allowing you the same level as control as the base Pandas IO procedures.

As the data loader was constructed with the verbose parameter set to `True`, the above operations would print the following output describing the actions of the data loader.

```bash
FileIO initialized
├─ Loading data frame from 'https://raw.githubusercontent.com/datasciencedojodatasets/master/titanic.csv'...DONE
└─ Exporting data frame to './titanic_survival.json'...DONE
```

To read more about loading from files, see the [FileIO](#fileio) API for more details on member functions and usage.

## Example: Loading data from Snowflake warehouse

Loading data from a Snowflake data warehouse is made easy using the `mage_ai.io.snowflake.Snowflake` data loading client. In order to authenticate and access your Snowflake data, the client will require access to your Snowflake credentials:

-   Account Username
-   Account Password
-   Account ID (including your region) (Ex: _example.us-west-2_)

These parameters can be manually specified as input to the data loading client (see [Snowflake](#snowflake) API). However we recommend using a [Configuration Loader](#configuration-settings) to handle loading these secrets. If you used `mage init` to create your project repository, you can store these values in your `io_config.yaml` file and using a `mage_ai.io.config.ConfigFileLoader` to construct the data loader client.

An example `io_config.yaml` file in this instance would be:

```yaml
default:
    SNOWFLAKE_USER: my_username
    SNOWFLAKE_PASSWORD: my_password
    SNOWFLAKE_ACCOUNT_ID: example.us-west-2
```

with which a Snowflake data loading client can be constructed as:

```python
config = ConfigFileLoader('io_config.py', 'default')
loader = Snowflake.with_config(config, verbose=True)
```

To learn more about using configuration settings, see [Configuration Settings](#configuration-settings).

Then the following code uses the functions:

-   `execute` to execute an arbitrary query on your data warehouse. In this case, the warehouse, database, and schema to use are selected.
-   `load` to load the results of a SELECT query into a Pandas DataFrame.
-   `export` to export the data frame to a table in your data warehouse. If the table exists, then the data is appended by default (and can be configured with other behavior, see [Snowflake](#snowflake) API). If the table doesn't exist, then the table is created with the given schema name and table name.

```python
with loader:
    loader.execute('USE WAREHOUSE my_warehouse;')
    loader.execute('USE DATABASE my_database;')
    loader.execute('USE SCHEMA my_schema;')
    df = loader.load('SELECT * FROM test_table;')
    loader.export(df, 'my_schema', 'test_table')
```

The `loader` object manages a direct connection to your Snowflake data warehouse, so it is important to make sure that your connection is closed once your operations are completed. You can manually use `loader.open()` and `loader.close()` to open and close the connection to your data warehouse, or instead use the context manager syntax to automatically open and close the connection.

To learn more about loading data from Snowflake, see the [Snowflake](#snowflake) API for more details on member functions and usage.

# Client APIs

This section covers the API for using the following data loaders.

## Redshift

## S3

## FileIO

## BigQuery

## PostgreSQL

## Snowflake

# Configuration Settings

Connections to third-party data storage require you to specify confidential information such as login information or access keys. While you can manually specify this information code while constructing data loading clients, it is recommended to not store the secrets directly in code.

To help with this, Mage provides **configuration loaders** which load confidential configuration settings for use by data loading clients without exposing secrets in code.

Currently, the following sources (and their corresponding configuration loader) can be used to load configuration settings:

-   Configuration File - `ConfigFileLoader`
-   Environment Variables - `EnvironmentVariableLoader`
-   AWS Secrets Manager - `AWSSecretLoader`

For example, the code below constructs a Redshift data loading client using secrets from an AWS Secrets Manager

```python
from mage_ai.io.config import AWSSecretLoader
from mage_ai.io.redshift import Redshift

config = AWSSecretLoader()
loader = Redshift.from_config(config)
```

The following is a table of the names of configuration settings that can be read by a configuration loader. When storing secrets in a configuration file, in an environment variable, or on AWS Secrets Manager, use these key names to store your secrets. To access these keys in code, you can manually write the title as a string, or you can use the `mage_ai.io.config.ConfigKey` enum.

| Key Name                        | Service         | Client Parameter    | Description                                                    | Notes                                 |
| ------------------------------- | --------------- | ------------------- | -------------------------------------------------------------- | ------------------------------------- |
| AWS_ACCESS_KEY_ID               | AWS General     | access_key_id       | AWS Access Key ID credential                                   | Used by Redshift and S3               |
| AWS_SECRET_ACCESS_KEY           | AWS General     | secret_access_key   | AWS Secret Access Key credential                               | Used by Redshift and S3               |
| AWS_SESSION_TOKEN               | AWS General     | session_token       | AWS Session Token (used to generate temporary DB credentials)  | Used by Redshift                      |
| AWS_REGION                      | AWS General     | region              | AWS Region                                                     | Used by Redshift and S3               |
| REDSHIFT_DBNAME                 | AWS Redshift    | database            | Name of Redshift database to connect to                        |                                       |
| REDSHIFT_HOST                   | AWS Redshift    | host                | Redshift Cluster hostname                                      | Use with temporary credentials        |
| REDSHIFT_PORT                   | AWS Redshift    | port                | Redshift Cluster port. If not specified. Defaults to 5439.     | Use with temporary credentials        |
| REDSHIFT_TEMP_CRED_USER         | AWS Redshift    | user                | Redshift temporary credentials username.                       | Use with temporary credentials        |
| REDSHIFT_TEMP_CRED_PASSWORD     | AWS Redshift    | password            | Redshift temporary credentials password.                       | Use with temporary credentials        |
| REDSHIFT_DBUSER                 | AWS Redshift    | db_user             | Redshift database user to generate credentials for.            | Use to generate temporary credentials |
| REDSHIFT_CLUSTER_ID             | AWS Redshift    | cluster_identifier  | Redshift cluster ID                                            | Use to generate temporary credentials |
| REDSHIFT_IAM_PROFILE            | AWS Redshift    | profile             | Name of the IAM profile to generate temporary credentials with | Use to generate temporary credentials |
| POSTGRES_DBNAME                 | PostgreSQL      | dbname              | Database name                                                  |                                       |
| POSTGRES_USER                   | PostgreSQL      | user                | Database login username                                        |                                       |
| POSTGRES_PASSWORD               | PostgreSQL      | password            | Database login password                                        |                                       |
| POSTGRES_HOST                   | PostgreSQL      | host                | Database hostname                                              |                                       |
| POSTGRES_PORT                   | PostgreSQL      | port                | PostgreSQL database port                                       |                                       |
| SNOWFLAKE_USER                  | Snowflake       | user                | Snowflake username                                             |                                       |
| SNOWFLAKE_PASS                  | Snowflake       | password            | Snowflake password                                             |                                       |
| SNOWFLAKE_ACCOUNT               | Snowflake       | account             | Snowflake account ID (including region)                        |                                       |
| SNOWFLAKE_DEFAULT_DB            | Snowflake       | database            | Default database to use                                        |                                       |
| SNOWFLAKE_DEFAULT_SCHEMA        | Snowflake       | schema              | Default schema to use                                          |                                       |
| SNOWFLAKE_DEFAULT_WH            | Snowflake       | warehouse           | Default warehouse to use.                                      |                                       |
| GOOGLE_SERVICE_ACC_KEY          | Google BigQuery | credentials_mapping | Service account key                                            |                                       |
| GOOGLE_SERVICE_ACC_KEY_FILEPATH | Google BigQuery | path_to_credentials | Path to service account key                                    |                                       |

## Configuration Loader APIs

This section contains the exact APIs and more detailed information on the configuration loaders. Every configuration loader has two functions:

-   `contains` - checks if the configuration source contains the requested key. Commonly, the `in` operation is used to check for setting existence (but is not necessarily identical as `contains` can accept multiple parameters while the `in` keyword only accepts the key).

    ```python
    if config.contains(ConfigKey.POSTGRES_PORT):
        ...
    # alternatively
    if ConfigKey.POSTGRES_PORT in config:
        ...
    ```

-   `get` - gets the configuration setting associated with the given key. If the key doesn't exist, returns None. Commonly, the data model overload `__getitem__` is used to fetch a configuration setting (but is not necessarily identical as `get` can accept multiple parameters while `__getitem__` does not).

    ```python
    user = config.get(ConfigKey.REDSHIFT_DBUSER)
    # alternatively
    user = config[ConfigKey.REDSHIFT_DBUSER]
    ```

These functions are shared among all configuration loaders, but depending on the source some function signatures may differ.

### Configuration File

### Environment Variables

### AWSSecretLoader
