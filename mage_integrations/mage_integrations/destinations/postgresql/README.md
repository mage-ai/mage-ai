# PostgreSQL

![](https://user-images.githubusercontent.com/78053898/198754309-2ef713a7-62c8-4ea8-9ebb-8c24ed038cb3.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `database` | The name of the database you want to export data to. | `demo` |
| `host` | The host name of your PostgreSQL database. | [`db.bit.io`](https://bit.io/) |
| `password` | Password for the PostgreSQL user to access the database. | `abc123...` |
| `port` | Port of the running database (typically 5432). | `5432` |
| `schema` | Schema of the data you want to export to. | `public` |
| `table` | Name of the table that will be created to store data from your source. | `dim_users_v1` |
| `username` | Name of the user that will access the database (must have permissions to read and write to specified schema). | `guest` |

### Optional Configs

| Key | Description | Sample value
| --- | --- | --- |
| `skip_schema_creation` | If `true`, Mage won't run CREATE SCHEMA command. For more information, see this [issue](https://github.com/mage-ai/mage-ai/issues/3416) | `true`
| `lower_case` | If `true`, Mage will set all columns name as lower case. Default is `true` | `true` |
| `allow_reserved_words` | If `true`, Mage will ignore SQL reserved words. Default is `false`| `true`, `false`|
<br />

<br />
