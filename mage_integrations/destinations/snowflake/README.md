# Snowflake

<img
  alt="Snowflake"
  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQPr4JGdHQSz8_6nELnAyYz2-lo1pr7NqMZ3R_7CYxUk61TpXC6VBcfit7N3buDFt50yQ&usqp=CAU"
  width="300"
/>

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `account` | Your Snowflake [account ID](https://docs.snowflake.com/en/user-guide/admin-account-identifier.html). | `abc1234.us-east-1` |
| `database` | The name of the database you want to export data to. | `DEMO_DB` |
| `password` | Password for the user to access the database. | `abc123...` |
| `schema` | Schema of the data you want to export to. | `PUBLIC` |
| `table` | Name of the table that will be created to store data from your source. | `dim_users_v1` |
| `username` | Name of the user that will access the database (must have permissions to read and write to specified schema). | `guest` |
| `warehouse` | Name of the warehouse that contains the specified database and schema. | `COMPUTE_WH` |

<br />
