# SQL blocks

## Credentials

Before starting, you need to add credentials so Mage can execute your SQL commands.

Follow the steps for the database or data warehouse of your choice:

- [BigQuery](integrations/BigQuery.md#add-credentials)
- [PostgreSQL](integrations/PostgreSQL.md#add-credentials)
- [Redshift](integrations/Redshift.md#add-credentials)
- [Snowflake](integrations/Snowflake.md#add-credentials)

<br />

## Add SQL block to pipeline

1. Create a new pipeline or open an existing pipeline.
1. Add a data loader, transformer, or data exporter block.
1. Select `SQL`.

<br />

## Configure SQL block

There are 4 - 5 fields that must be configured for each SQL block:

| Field | Required | Description |
| --- | --- | --- |
| Data provider | Yes | The database or data warehouse you want to execute your SQL commands in. |
| Profile | Yes | When you add your credentials to the `io_config.yaml` file, you added them under a key. That key is called the profile. Choose which set of credentials you want this SQL block to use. |
| Schema to save | Yes | Every SQL block will save data to your data provider. The name of the table that is created follows this convention: `[schema].[pipeline UUID]_[block UUID]`. |
| Database | Depends on data provider | Some data warehouses require that we explicitly state the name of the database we want to write to. If this is present, it’s required. The name of the table that is created follows this convention: `[database].[schema].[pipeline UUID]_[block UUID]`. |
| Write policy | Yes | How do you want to handle existing data with the same database, schema, and table name? See below for more information. |


#### Write policies

| Policy | Description |
| --- | --- |
| Append | Add rows to the existing table. |
| Replace | Delete the existing data. |
| Fail | Raise an error during execution. |

<br />

## Automatically created tables

Each SQL block will create a table in the data provider of your choice.

When you run a block, it’ll execute your SQL command,
then store the results in a table created in your database or data warehouse.

The name of this automatically created table follows these conventions:

- If `Database` field is configured: `[database].[schema].[pipeline UUID]_[block UUID]`
- If no `Database` field is configured: `[schema].[pipeline UUID]_[block UUID]`

Where pipeline UUID is the name of the current pipeline you’re editing.

Where block UUID is the name of the SQL block you are running.

#### Upstream blocks

If your SQL block depends on upstream blocks that aren’t SQL blocks (e.g. Python code blocks),
then those blocks will also automatically create tables.

The name of those tables follows the same naming convention mentioned above.

<br />

## Variables

All SQL blocks have the following variables they can access in their query:

### `{{ execution_date }}`

The date and time the block is ran.

<b>Example</b>
```sql
SELECT '{{ execution_date }}' AS today
```

<b>Result</b>

| `today` |
| :-- |
| `2022-09-24 23:01:08.376057` |

<br />
<br />

If a SQL block has 1 or more upstream blocks, then they have access to their parent blocks’ output
using the following variable:

### `{{ df_1 }}`

Depending on how many upstream blocks there are, the variable name changes.
For example, if there are 3 upstream blocks then there are 3 variables that can be accessed:

- `{{ df_1 }}`
- `{{ df_2 }}`
- `{{ df_3 }}`

The SQL block UI will display which variable maps to which upstream block.
By convention, the 1st added upstream block will be `{{ df_1 }}`,
and every upstream block added after that will have an incrementing number
in the variable name after the prefix `df_`.

<b>Example</b>
```sql
SELECT
    a.id
    , b.username
FROM {{ df_1 }} AS a
LEFT JOIN {{ df_2 }} AS b
ON a.id = b.user_id
LIMIT 1
```

<b>Result</b>

| `id` | `username` |
| :-- | :-- |
| `1` | `Sorcerer supreme` |

<br />
