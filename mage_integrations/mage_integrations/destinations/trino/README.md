# Trino

![](https://trino.io/assets/trino-og.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `catalog` | A Trino catalog contains schemas and references a data source via a connector. | `my_prod_pg` |
| `connector` | Allows Trino to connect to other databases, data warehouses, data lakes, etc. | `postgresql` |
| `host` | The host name of your database. | [`127.0.0.1`](127.0.0.1) |
| `schema` | Schema of the data you want to export to. | `public` |
| `table` | Name of the table that will be created to store data from your source. | `dim_users_v1` |
| `username` | Name of the user that will access the database. | `admin` |
| `password` | Password for the user to access the database. | `abc123...` (optional) |
| `port` | Port of the running database (typically 8080). | `8080` (default value) |
| `query_max_length` | The maximum number of characters allowed for the SQL query text. | `1000000` (default value) |
| `ssl` | In order to disable SSL verification, set the verify parameter to `false`. | `false` (default value) |

### Connectors

Currently supported connectors: https://trino.io/docs/current/connector.html

<br />

## [Run Trino locally](https://trino.io/docs/current/installation/containers.html)

```bash
docker run -v $PWD/etc:/etc/trino -p 8080:8080 trinodb/trino
```

### `/etc/trino/config.properties`

```
#single node install config
coordinator=true
node-scheduler.include-coordinator=true
http-server.http.port=8080
discovery.uri=http://localhost:8080

# https://trino.io/docs/current/security/password-file.html
http-server.authentication.type=PASSWORD

# https://trino.io/docs/current/security/internal-communication.html
internal-communication.shared-secret=some_very_long_secret
```

### `/etc/trino/catalog/iceberg.properties`
Configuration: https://trino.io/docs/current/connector/iceberg.html#configuration

Example config:
```
connector.name=iceberg
iceberg.catalog.type=glue
iceberg.file-format=parquet
hive.metastore.glue.region=us-west-2
hive.metastore.glue.aws-access-key=aws-access-key
hive.metastore.glue.aws-secret-key=aws-secret-key
hive.metastore.glue.default-warehouse-dir=s3://[bucket_name]/

```

### `/etc/trino/catalog/postgresql.properties`

```
connector.name=postgresql
connection-url=jdbc:postgresql://host.docker.internal:5432/mage
connection-user=postgres
connection-password=postgres
```

## [Executing queries](https://trino.io/docs/current/installation/containers.html#executing-queries)

```
SELECT COUNT(*) FROM postgresql.mage.users;
```
