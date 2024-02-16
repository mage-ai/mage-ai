# OracleDB

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `host` | OracleDB host. | `oracledb.example.com` |
| `port` | OracleDB exported host. | `1521` (default value) |
| `service` | Listener service runs on the database server listing for client connection. | `xepdb1` |
| `password` | Password of the user. | `xyz123` |
| `user` | User name with connection and query access to db. | `xyz123` |
| `mode` | Mode for oracle client. Value can be thin or thick. | `thick` |

### Optional Configs

| Key | Description | Sample value
| --- | --- | --- |
| `batch_fetch_limit` | The number of rows to fetch in each batch (default to 50k). You can specify a larger batch size if your instance has higher memory. | `50000`

<br />
