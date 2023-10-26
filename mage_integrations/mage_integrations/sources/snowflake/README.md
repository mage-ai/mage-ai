# Snowflake

![](https://user-images.githubusercontent.com/78053898/198754338-a8aeb12e-6e23-45e5-b130-7a1979a2b31d.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `account` | Your Snowflake [account ID](https://docs.snowflake.com/en/user-guide/admin-account-identifier.html). | `abc1234.us-east-1` |
| `database` | The name of the database you want to read data from. | `DEMO_DB` |
| `password` | Password for the user to access the database. | `abc123...` |
| `role` | Role of the user to access the database. | `ROLE` |
| `schema` | Schema of the data you want to read from. | `PUBLIC` |
| `username` | Name of the user that will access the database (must have permissions to read and write to specified schema). | `guest` |
| `warehouse` | Name of the warehouse that contains the specified database and schema. | `COMPUTE_WH` |

### Optional Configs

| Key | Description | Sample value
| --- | --- | --- |
| `batch_fetch_limit` | The number of rows to fetch in each batch (default to 50k). You can specify a larger batch size if your instance has higher memory. | `50000`

<br />
