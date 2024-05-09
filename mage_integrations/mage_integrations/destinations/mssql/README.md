# MSSQL (Microsoft SQL Server)

![](https://www.commvault.com/wp-content/uploads/2019/08/sql-server_logo.jpg)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `database` | The name of the database you want to write data to. | `msdb` |
| `host` | The host name of your MSSQL database. | `172.20.0.2` |
| `password` | Password for the MSSQL user to access the database. | `abc123...` |
| `port` | Port of the running database (typically 1433). | `1433` |
| `schema` | Schema of the data you want to write data to. | `public` |
| `table` | Name of the table that will be created to store data from your source. | `users` |
| `username` | Name of the user that will access the database (must have permissions to read and write to specified schema). | `guest` |

### Optional Configs

| Key | Description | Sample value
| --- | --- | --- |
| `authentication` | Authentication mode for connecting to MSSQL with [Azure Active Directory authentication](https://learn.microsoft.com/en-us/sql/connect/jdbc/connecting-using-azure-active-directory-authentication?view=sql-server-ver16).| `ActiveDirectoryServicePrincipal` |
| `driver` | The ODBC [driver](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server?view=sql-server-ver16) for SQL Server. | `ODBC Driver 18 for SQL Server` |
| `skip_schema_creation` | If `true`, Mage won't run CREATE SCHEMA command. For more information, see this [issue](https://github.com/mage-ai/mage-ai/issues/3416) | `true`
| `lower_case` | If `true`, Mage will set all columns name as lower case. Default is `true` | `true` |
<br />

<br />
