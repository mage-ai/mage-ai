# PostgreSQL

![](https://user-images.githubusercontent.com/78053898/198754309-2ef713a7-62c8-4ea8-9ebb-8c24ed038cb3.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `database` | The name of the database you want to read data from. | `demo` |
| `host` | The host name of your PostgreSQL database. | [`db.bit.io`](https://bit.io/) |
| `password` | Password for the PostgreSQL user to access the database. | `abc123...` |
| `port` | Port of the running database (typically 5432). | `5432` |
| `schema` | Schema of the data you want to read data from. | `public` |
| `username` | Name of the user that will access the database (must have permissions to read and write to specified schema). | `guest` |
| `replication_slot` | Name of the slot used in logical replication. | `mage_slot` |
| `publication_name` | Name of the publication used in logical replication. | `mage_pub` |

### Optional Configs

| Key | Description | Sample value
| --- | --- | --- |
| `batch_fetch_limit` | The number of rows to fetch in each batch (default to 50k). You can specify a larger batch size if your instance has higher memory. | `50000`

<br />

## Change Data Capture (CDC) with PostgreSQL

Please read this [document](https://docs.mage.ai/data-integrations/sources/postgresql).

<br />
