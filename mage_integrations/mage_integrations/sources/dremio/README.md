# Dremio

![](https://www.dremio.com/wp-content/uploads/2023/02/CompanyDremio_centered.png)

<br />

## Config

This source uses Dremio Arrow Flight Client to connect/execute SQL queries and shares most of its settings.
To find more details, please refer to Dremio docs [here](https://docs.dremio.com/current/sonar/client-applications/clients/python)

<b>NOTE:</b> Mage's implementation of Dremio Source doesn't allow for the `query` connection parameter

| Key | Description | Required |
| --- | --- | --- |
| `username` | Username of the Dremio account to use for authenticating. | True |
| `schema` | Dremio Source Table schema. | True |
| `source_backend` | SQL Source backend used to query data from Dremio. Please refer to the section below for detailed info <br /> E.G postgresql, mssql, mysql. | True, if applicable |
| `password` | Password of the Dremio account to use for authenticating. | True, if no token is provided. |
| `hostname` | The hostname or IP address of the coordinator node. | False (Default is localhost) |
| `port` | Dremio's Arrow Flight server port. Can be other than 32010, if changed on the coordinator node. | False (Default is 32010) |
| `token` | Either a Personal Access Token or an OAuth2 Token. | True, if no password is provided. |
| `tls` | Enables encryption on a connection. | False |
| `disable_certificate_verification` | Disables TLS server verification. | False |
| `path_to_certs` | Path to trusted certificates for encrypted connections. False |
| `session_properties` | Key value pairs of session_properties | False |

### Source Backend

In order to maintain the same quality pattern from Mage's data extraction, this Source allow's the user to specify which data source pattern is preferred. As of now, the avaliable backend sources are:

 - postgresql
 - mysql
 - mssql

OracleDB and Snowflake currently doesn't require a backend source.
Internal tables created by S3 and other Object Storage doesn't require a backend source as well.
