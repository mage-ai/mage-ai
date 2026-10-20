# Dremio

![](https://www.dremio.com/wp-content/uploads/2023/02/CompanyDremio_centered.png)

<br />

## Config

This source uses Dremio Arrow Flight Client to connect/execute SQL queries and shares most of its settings.
To find more details, please refer to Dremio docs [here](https://docs.dremio.com/current/sonar/client-applications/clients/python)

<b>NOTE:</b> Mage's implementation of Dremio Source doesn't allow for the `query` connection parameter

### Required Parameters

| Key | Description | Sample value |
| --- | --- | --- |
| `username` | Username of the Dremio account to use for authenticating. | `ABC123` |
| `schema` | Dremio Source Table schema. | `ABC123` |
| `source_backend` | SQL Source backend used to query data from Dremio. Please refer to the section below for detailed info | `postgresql` |
| `password` | Password of the Dremio account to use for authenticating. </b> (Required if no token is provided) | `ABC123` |
| `token` | Either a Personal Access Token or an OAuth2 Token. </b> (Required if no password is provided) | `ABC123` |

### Optional Parameters

| Key | Description | Sample value |
| --- | --- | --- |
| `hostname` | The hostname or IP address of the coordinator node. (Defaults to localhost) | `localhost` |
| `port` | Dremio's Arrow Flight server port. Can be other than 32010, if changed on the coordinator node. (Defaults to 32010) | `32010` |
| `tls` | Enables encryption on a connection. | `false` |
| `disable_certificate_verification` | Disables TLS server verification. | `true` |
| `path_to_certs` | Path to trusted certificates for encrypted connections. | `ABC123` |
| `session_properties` | Key value pairs of session_properties | `ABC123` |

### Source Backend

In order to maintain the same quality pattern from Mage's data extraction, this Source allow's the user to specify which data source pattern is preferred. As of now, the available backend sources are:

 - postgresql
 - mysql
 - mssql

OracleDB and Snowflake currently doesn't require a backend source.
Internal tables created by S3 and other Object Storage doesn't require a backend source as well.
