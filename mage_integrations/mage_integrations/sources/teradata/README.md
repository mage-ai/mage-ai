# Teradata


<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `database` | The name of the database you want to read data from. | `demo` |
| `host` | The host name of your database. | `test.clearscape.teradata.com` |
| `port` | Port of the running database (typically 3306). | `1025` |
| `username` | Name of the user that will access the database (must have permissions to read and write to specified schema). | `demo_user` |
| `password` | Password for the user to access the database. | `abc123...` |

### Optional Configs

| Key | Description | Sample value
| --- | --- | --- |
| `batch_fetch_limit` | The number of rows to fetch in each batch (default to 50k). You can specify a larger batch size if your instance has higher memory. | `50000`

<br />
