# OracleDB

## Config

You must enter the following credentials when configuring Oracle DB destination:

| Key | Description | Sample value
| --- | --- | --- |
| `host` | OracleDB host. | `oracledb.example.com` |
| `port` | OracleDB exported host. | `1521`
 (default value) |
| `service` | Listener service runs on the database server listing for client connection. | `xepdb1` |
| `password` | Password of the user. | `xyz123` |
| `user` | User name with connection and query access to db. | `xyz123` |
| `database` | The database you want to create the table and export data. | `xyz123` |
| `mode` | Mode for oracle client. Value can be `thin` or `thick`. | `thick` |

### Optional Configs
| Key | Description | Sample value
| --- | --- | --- |
| `lower_case` | If `true`, Mage will set all columns name as lower case. Default is `true` | `true` |
<br />
