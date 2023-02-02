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

<br />
