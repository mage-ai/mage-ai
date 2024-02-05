# Snowflake

![](https://user-images.githubusercontent.com/78053898/198754338-a8aeb12e-6e23-45e5-b130-7a1979a2b31d.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `account` | Your Snowflake [account ID](https://docs.snowflake.com/en/user-guide/admin-account-identifier.html). | `abc1234.us-east-1` |
| `database` | The name of the database you want to export data to. | `DEMO_DB` |
| `disable_double_quotes` | If `true`, table names and columns won’t automatically have double quotes around them. | `false` (default value) |
| `password` | Password for the user to access the database. | `abc123...` |
| `role` | Role of the user to access the database. | `ROLE` |
| `schema` | Schema of the data you want to export to. | `PUBLIC` |
| `table` | Name of the table that will be created to store data from your source. | `dim_users_v1` |
| `username` | Name of the user that will access the database (must have permissions to read and write to specified schema). | `guest` |
| `warehouse` | Name of the warehouse that contains the specified database and schema. | `COMPUTE_WH` |
| `use_batch_load` | If `true`, use batch upload instead of insertion query. The recommended value is `true` for better performance. | `true` (default value) |

### Optional Configs

| Key | Description | Sample value
| --- | --- | --- |
| `skip_schema_creation` | If `true`, Mage won't run CREATE SCHEMA command. For more information, see this [issue](https://github.com/mage-ai/mage-ai/issues/3416) | `true`
| `lower_case` | If `true`, Mage will set all columns name as lower case. Default is `true` | `true` |
<br />
