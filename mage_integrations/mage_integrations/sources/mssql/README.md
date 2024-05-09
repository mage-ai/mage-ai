# MSSQL (Microsoft SQL Server)

![](https://www.commvault.com/wp-content/uploads/2019/08/sql-server_logo.jpg)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `database` | The name of the database you want to read data from. | `msdb` |
| `host` | The host name of your MSSQL database. | `172.20.0.2` |
| `password` | Password for the MSSQL user to access the database. | `abc123...` |
| `port` | Port of the running database (typically 1433). | `1433` |
| `schema` | Schema of the data you want to read data from. | `public` |
| `username` | Name of the user that will access the database (must have permissions to read and write to specified schema). | `guest` |

### Optional Configs

| Key | Description | Sample value
| --- | --- | --- |
| `authentication` | Authentication mode for connecting to MSSQL with [Azure Active Directory authentication](https://learn.microsoft.com/en-us/sql/connect/jdbc/connecting-using-azure-active-directory-authentication?view=sql-server-ver16).| `ActiveDirectoryServicePrincipal` |
| `batch_fetch_limit` | The number of rows to fetch in each batch (default to 50k). You can specify a larger batch size if your instance has higher memory. | `50000` |
| `driver` | The ODBC [driver](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server?view=sql-server-ver16) for SQL Server. | `ODBC Driver 18 for SQL Server` |

<br />
